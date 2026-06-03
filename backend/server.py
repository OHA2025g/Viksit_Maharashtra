"""Viksit Maharashtra 2047 - Integrated Monitoring Platform Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import asyncio
import json as json_lib
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date
import httpx
import jwt
from passlib.context import CryptContext

from seed_data import get_all_seed_data
from agriculture import build_router as build_agri_router, build_agri_copilot_context
from enhancements import (
    build_enhancements_router,
    seed_enhancement_data,
    audit_entity_update,
    write_audit,
    build_intelligence_copilot_context,
    compute_kpi_anomaly,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MISTRAL_API_KEY = os.environ.get('MISTRAL_API_KEY', '')
JWT_SECRET = os.environ.get('JWT_SECRET', 'viksit-maharashtra-2047-secret-key')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Viksit Maharashtra 2047 API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============== HELPERS ==============
def clean_doc(doc: Dict) -> Dict:
    """Remove MongoDB _id from doc."""
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


def clean_docs(docs: List[Dict]) -> List[Dict]:
    return [clean_doc(d) for d in docs]


# ============== WEBSOCKET MANAGER ==============
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.active.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self.lock:
            if ws in self.active:
                self.active.remove(ws)

    async def broadcast(self, event: Dict):
        payload = json_lib.dumps(event)
        async with self.lock:
            dead = []
            for ws in self.active:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for d in dead:
                if d in self.active:
                    self.active.remove(d)


manager = ConnectionManager()


async def broadcast_event(title: str, message: str, rag: str = "amber", kind: str = "update"):
    """Fire-and-forget event broadcast to all connected clients."""
    try:
        await manager.broadcast({
            "kind": kind, "title": title, "message": message,
            "rag": rag, "ts": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.exception("broadcast failed")


# ============== AUTH ==============
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    user: Dict[str, Any]


def create_token(user: Dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    return user


# ============== SEED ==============
@app.on_event("startup")
async def seed_database():
    """Seed database with sample data if empty."""
    count = await db.pillars.count_documents({})
    if count == 0:
        logger.info("Seeding database...")
        data = get_all_seed_data()
        collections_map = {
            "pillars": data["pillars"],
            "themes": data["themes"],
            "departments": data["departments"],
            "districts": data["districts"],
            "initiatives": data["initiatives"],
            "milestones": data["milestones"],
            "kpis": data["kpis"],
            "risks": data["risks"],
            "evidence": data["evidence"],
            "reviews": data["reviews"],
            "action_items": data["action_items"],
            "budgets": data["budgets"],
            "notifications": data["notifications"],
        }
        for col, items in collections_map.items():
            if items:
                await db[col].insert_many([{**item} for item in items])
        users_to_insert = []
        for u in data["users"]:
            u_copy = {**u, "password": pwd_context.hash(u["password"])}
            users_to_insert.append(u_copy)
        await db.users.insert_many(users_to_insert)
        logger.info("Database seeded successfully.")
    else:
        logger.info("Core database already seeded; skipping.")

    # Auto-seed Agriculture data from canonical Excel URL (idempotent)
    try:
        if await db.agri_subtasks.count_documents({}) == 0:
            from agriculture import parse_workbook, enrich_rows, EXCEL_URL
            logger.info("Auto-importing Agriculture Excel from canonical URL...")
            async with httpx.AsyncClient(timeout=30.0) as c:
                r = await c.get(EXCEL_URL)
                r.raise_for_status()
                parsed = parse_workbook(r.content)
            enriched = enrich_rows(parsed["rows"])
            for row in enriched:
                row.pop("_id", None)
            await db.agri_subtasks.insert_many(enriched)
            await db.agri_baselines.insert_one({
                "id": str(uuid.uuid4()),
                "version_name": "Baseline Version 1.0 – Agriculture Value Chain Initiative",
                "row_count": len(enriched),
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source_file": "Viksit_Maharashtra_2047_Agriculture.xlsx",
            })
            logger.info(f"Agriculture seeded: {len(enriched)} sub-tasks.")
    except Exception:
        logger.exception("Agriculture auto-seed failed (will be available via UI import)")

    try:
        await seed_enhancement_data(db)
        logger.info("Enhancement modules seeded.")
    except Exception:
        logger.exception("Enhancement seed failed")


@api_router.post("/admin/reseed")
async def reseed():
    """Wipe and reseed database (dev only)."""
    for col in ["pillars", "themes", "departments", "districts", "initiatives",
                "milestones", "kpis", "risks", "evidence", "reviews", "action_items",
                "budgets", "users", "notifications"]:
        await db[col].delete_many({})
    await seed_database()
    return {"ok": True, "message": "Database reseeded"}


# ============== AUTH ROUTES ==============
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.pop("password")
    return {"token": create_token(user), "user": user}


@api_router.get("/auth/me")
async def me(user: Optional[Dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api_router.get("/auth/users")
async def list_users():
    """List seeded users for role-switcher demo."""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users


# ============== READ ROUTES (generic list/get) ==============
@api_router.get("/pillars")
async def get_pillars():
    return clean_docs(await db.pillars.find().sort("order", 1).to_list(100))


@api_router.get("/themes")
async def get_themes(pillar_id: Optional[str] = None):
    q = {"pillar_id": pillar_id} if pillar_id else {}
    return clean_docs(await db.themes.find(q).to_list(200))


@api_router.get("/themes/{theme_id}")
async def get_theme(theme_id: str):
    t = await db.themes.find_one({"id": theme_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Theme not found")
    return t


@api_router.get("/departments")
async def get_departments():
    return clean_docs(await db.departments.find().to_list(100))


@api_router.get("/districts")
async def get_districts():
    return clean_docs(await db.districts.find().to_list(100))


@api_router.get("/initiatives")
async def get_initiatives(pillar_id: Optional[str] = None, theme_id: Optional[str] = None,
                          department_id: Optional[str] = None, status: Optional[str] = None,
                          rag: Optional[str] = None):
    q = {}
    if pillar_id: q["pillar_id"] = pillar_id
    if theme_id: q["theme_id"] = theme_id
    if department_id: q["lead_department_id"] = department_id
    if status: q["status"] = status
    if rag: q["rag"] = rag
    return clean_docs(await db.initiatives.find(q).to_list(500))


@api_router.get("/initiatives/{init_id}")
async def get_initiative(init_id: str):
    i = await db.initiatives.find_one({"id": init_id}, {"_id": 0})
    if not i:
        raise HTTPException(404, "Initiative not found")
    return i


class InitiativeCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    pillar_id: str
    theme_id: str
    lead_department_id: str
    target_year: int = 2035
    budget_estimate: float = 0
    funding_source: str = "State Budget"
    ppp_potential: str = "Medium"
    status: str = "In Progress"
    rag: str = "amber"
    priority: str = "P1"


@api_router.post("/initiatives")
async def create_initiative(init: InitiativeCreate):
    new = init.model_dump()
    new["id"] = str(uuid.uuid4())
    count = await db.initiatives.count_documents({})
    new["code"] = f"INIT-{count+1:03d}"
    new["budget_utilized"] = 0
    new["private_investment_committed"] = 0
    new["completion_pct"] = 0
    new["supporting_departments"] = []
    new["created_by"] = "User"
    new["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.initiatives.insert_one({**new})
    await write_audit(db, "initiative", new["id"], "created", None, new["code"], new.get("created_by", "User"), "create")
    await broadcast_event(
        "New Initiative",
        f"{new['code']} · {new['name'][:60]}",
        "green", "initiative.created",
    )
    return clean_doc(new)


@api_router.put("/initiatives/{init_id}")
async def update_initiative(init_id: str, data: Dict[str, Any]):
    old = await db.initiatives.find_one({"id": init_id})
    if not old:
        raise HTTPException(404, "Initiative not found")
    data.pop("_id", None)
    data.pop("id", None)
    await audit_entity_update(db, "initiative", init_id, old, data, data.get("updated_by", "User"))
    await db.initiatives.update_one({"id": init_id}, {"$set": data})
    return clean_doc(await db.initiatives.find_one({"id": init_id}))


@api_router.delete("/initiatives/{init_id}")
async def delete_initiative(init_id: str, by: Optional[str] = None):
    init = await db.initiatives.find_one({"id": init_id}, {"_id": 0})
    if not init:
        raise HTTPException(404, "Initiative not found")
    await write_audit(
        db, "initiative", init_id, "deleted", init.get("code"), None,
        by or "User", "delete",
    )
    await db.initiatives.delete_one({"id": init_id})
    return {"ok": True, "id": init_id, "code": init.get("code")}


@api_router.get("/milestones")
async def get_milestones(pillar_id: Optional[str] = None, theme_id: Optional[str] = None,
                         initiative_id: Optional[str] = None, department_id: Optional[str] = None,
                         district_id: Optional[str] = None, status: Optional[str] = None,
                         rag: Optional[str] = None, search: Optional[str] = None,
                         limit: int = 1000):
    q = {}
    if pillar_id: q["pillar_id"] = pillar_id
    if theme_id: q["theme_id"] = theme_id
    if initiative_id: q["initiative_id"] = initiative_id
    if department_id: q["department_id"] = department_id
    if district_id: q["district_id"] = district_id
    if status: q["status"] = status
    if rag: q["rag"] = rag
    if search: q["name"] = {"$regex": search, "$options": "i"}
    return clean_docs(await db.milestones.find(q).to_list(limit))


class MilestoneCreate(BaseModel):
    initiative_id: str
    name: str
    pillar_id: str
    theme_id: str
    department_id: str
    owner: str = "Owner"
    district_id: Optional[str] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    actual_start_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    status: str = "Not Started"
    rag: str = "grey"
    completion_pct: int = 0
    budget_allocated: float = 0
    budget_utilized: float = 0
    evidence_status: str = "Pending"
    remarks: Optional[str] = ""


@api_router.post("/milestones")
async def create_milestone(ms: MilestoneCreate):
    new = ms.model_dump()
    new["id"] = str(uuid.uuid4())
    count = await db.milestones.count_documents({})
    new["code"] = f"MS-{count+1:04d}"
    new["dependency"] = None
    new["last_updated"] = datetime.now(timezone.utc).isoformat()
    await db.milestones.insert_one({**new})
    await write_audit(db, "milestone", new["id"], "created", None, new["code"], "System", "create")
    await broadcast_event(
        "New Milestone",
        f"{new['code']} · {new['name'][:60]}",
        new.get("rag", "amber"),
        "milestone.created",
    )
    return clean_doc(new)


@api_router.put("/milestones/{ms_id}")
async def update_milestone(ms_id: str, data: Dict[str, Any]):
    old = await db.milestones.find_one({"id": ms_id})
    if not old:
        raise HTTPException(404, "Milestone not found")
    data.pop("_id", None)
    data.pop("id", None)
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    await audit_entity_update(db, "milestone", ms_id, old, data, data.get("owner", "System"))
    await db.milestones.update_one({"id": ms_id}, {"$set": data})
    return clean_doc(await db.milestones.find_one({"id": ms_id}))


@api_router.delete("/milestones/{ms_id}")
async def delete_milestone(ms_id: str, by: Optional[str] = None):
    ms = await db.milestones.find_one({"id": ms_id}, {"_id": 0})
    if not ms:
        raise HTTPException(404, "Milestone not found")
    await write_audit(
        db, "milestone", ms_id, "deleted", ms.get("code"), None,
        by or "System", "delete",
    )
    await db.milestones.delete_one({"id": ms_id})
    return {"ok": True, "id": ms_id, "code": ms.get("code")}


@api_router.get("/kpis")
async def get_kpis(pillar_id: Optional[str] = None, theme_id: Optional[str] = None,
                   department_id: Optional[str] = None):
    q = {}
    if pillar_id: q["pillar_id"] = pillar_id
    if theme_id: q["theme_id"] = theme_id
    if department_id: q["department_id"] = department_id
    return clean_docs(await db.kpis.find(q).to_list(500))


@api_router.get("/kpis/anomalies")
async def kpi_anomalies():
    """Must be registered before /kpis/{kpi_id} so 'anomalies' is not treated as an id."""
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    anomalies = [a for k in kpis if (a := compute_kpi_anomaly(k))]
    return {"count": len(anomalies), "anomalies": anomalies}


@api_router.get("/kpis/{kpi_id}")
async def get_kpi(kpi_id: str):
    k = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not k:
        raise HTTPException(404, "KPI not found")
    return k


@api_router.put("/kpis/{kpi_id}")
async def update_kpi(kpi_id: str, data: Dict[str, Any]):
    old = await db.kpis.find_one({"id": kpi_id})
    if not old:
        raise HTTPException(404, "KPI not found")
    data.pop("_id", None)
    data.pop("id", None)
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    await audit_entity_update(db, "kpi", kpi_id, old, data, "PMO Analyst")
    await db.kpis.update_one({"id": kpi_id}, {"$set": data})
    return clean_doc(await db.kpis.find_one({"id": kpi_id}))


@api_router.get("/budgets")
async def get_budgets(theme_id: Optional[str] = None, department_id: Optional[str] = None):
    q = {}
    if theme_id: q["theme_id"] = theme_id
    if department_id: q["department_id"] = department_id
    return clean_docs(await db.budgets.find(q).to_list(500))


@api_router.get("/evidence")
async def get_evidence(theme_id: Optional[str] = None, milestone_id: Optional[str] = None,
                       verification_status: Optional[str] = None):
    q = {}
    if theme_id: q["theme_id"] = theme_id
    if milestone_id: q["milestone_id"] = milestone_id
    if verification_status: q["verification_status"] = verification_status
    return clean_docs(await db.evidence.find(q).to_list(500))


class EvidenceCreate(BaseModel):
    pillar_id: str
    theme_id: str
    initiative_id: str
    milestone_id: str
    evidence_type: str
    file_name: str
    uploaded_by: str = "User"
    verification_status: str = "Pending"
    remarks: Optional[str] = ""


@api_router.post("/evidence")
async def create_evidence(ev: EvidenceCreate):
    new = ev.model_dump()
    new["id"] = str(uuid.uuid4())
    count = await db.evidence.count_documents({})
    new["code"] = f"EV-{count+1:04d}"
    new["upload_date"] = datetime.now(timezone.utc).isoformat()
    new["verified_by"] = None
    await db.evidence.insert_one({**new})
    await write_audit(db, "evidence", new["id"], "created", None, new["code"], new.get("uploaded_by", "User"), "create")
    return clean_doc(new)


@api_router.put("/evidence/{ev_id}")
async def update_evidence(ev_id: str, data: Dict[str, Any]):
    old = await db.evidence.find_one({"id": ev_id})
    if not old:
        raise HTTPException(404, "Evidence not found")
    data.pop("_id", None)
    await audit_entity_update(db, "evidence", ev_id, old, data, data.get("verified_by", "PMO Analyst"))
    await db.evidence.update_one({"id": ev_id}, {"$set": data})
    return clean_doc(await db.evidence.find_one({"id": ev_id}))


@api_router.get("/risks")
async def get_risks(pillar_id: Optional[str] = None, theme_id: Optional[str] = None,
                    initiative_id: Optional[str] = None, status: Optional[str] = None):
    q = {}
    if pillar_id: q["pillar_id"] = pillar_id
    if theme_id: q["theme_id"] = theme_id
    if initiative_id: q["initiative_id"] = initiative_id
    if status: q["status"] = status
    return clean_docs(await db.risks.find(q).to_list(500))


class RiskCreate(BaseModel):
    pillar_id: str
    theme_id: str
    initiative_id: str
    milestone_id: Optional[str] = None
    risk_type: str
    description: str
    probability: int
    impact: int
    mitigation_plan: str = ""
    owner: str = "Owner"
    escalation_level: str = "Task Owner"
    status: str = "Open"
    due_date: Optional[str] = None


@api_router.post("/risks")
async def create_risk(risk: RiskCreate):
    new = risk.model_dump()
    new["id"] = str(uuid.uuid4())
    new["risk_score"] = new["probability"] * new["impact"]
    count = await db.risks.count_documents({})
    new["code"] = f"RISK-{count+1:03d}"
    new["remarks"] = ""
    await db.risks.insert_one({**new})
    await write_audit(db, "risk", new["id"], "created", None, new["code"], new.get("owner", "User"), "create")
    await broadcast_event(
        "New Risk Logged",
        f"{new['code']} · {new['risk_type']} risk (score: {new['risk_score']})",
        "red" if new["risk_score"] >= 16 else "amber" if new["risk_score"] >= 9 else "green",
        "risk.created",
    )
    return clean_doc(new)


@api_router.put("/risks/{risk_id}")
async def update_risk(risk_id: str, data: Dict[str, Any]):
    old = await db.risks.find_one({"id": risk_id})
    if not old:
        raise HTTPException(404, "Risk not found")
    data.pop("_id", None)
    if "probability" in data and "impact" in data:
        data["risk_score"] = data["probability"] * data["impact"]
    await audit_entity_update(db, "risk", risk_id, old, data, data.get("owner", "System"))
    await db.risks.update_one({"id": risk_id}, {"$set": data})
    updated = await db.risks.find_one({"id": risk_id})
    if data.get("status") == "Escalated":
        await broadcast_event(
            "Risk Escalated",
            f"{updated.get('code')} escalated to {updated.get('escalation_level')}",
            "red", "risk.escalated",
        )
    return clean_doc(updated)


@api_router.get("/reviews")
async def get_reviews():
    return clean_docs(await db.reviews.find().sort("date", -1).to_list(200))


class ReviewCreate(BaseModel):
    title: str
    review_type: str
    date: str
    chaired_by: str
    departments_involved: List[str] = []
    themes_reviewed: List[str] = []
    agenda: str
    decisions_taken: str = ""
    remarks: str = ""


@api_router.post("/reviews")
async def create_review(rev: ReviewCreate):
    new = rev.model_dump()
    new["id"] = str(uuid.uuid4())
    count = await db.reviews.count_documents({})
    new["code"] = f"REV-{count+1:03d}"
    await db.reviews.insert_one({**new})
    await write_audit(db, "review", new["id"], "created", None, new["code"], rev.chaired_by or "Reviewer", "create")
    return clean_doc(new)


@api_router.get("/action-items")
async def get_action_items(review_id: Optional[str] = None, status: Optional[str] = None,
                           department_id: Optional[str] = None):
    q = {}
    if review_id: q["review_id"] = review_id
    if status: q["status"] = status
    if department_id: q["owner_department_id"] = department_id
    return clean_docs(await db.action_items.find(q).to_list(500))


class ActionItemCreate(BaseModel):
    review_id: str
    title: str
    owner_department_id: str
    due_date: str
    status: str = "Open"
    remarks: str = ""


@api_router.post("/action-items")
async def create_action(item: ActionItemCreate):
    new = item.model_dump()
    new["id"] = str(uuid.uuid4())
    count = await db.action_items.count_documents({})
    new["code"] = f"ACT-{count+1:03d}"
    await db.action_items.insert_one({**new})
    await write_audit(db, "review_action", new["id"], "created", None, new["code"], "Reviewer", "create")
    return clean_doc(new)


@api_router.put("/action-items/{item_id}")
async def update_action(item_id: str, data: Dict[str, Any]):
    old = await db.action_items.find_one({"id": item_id})
    if not old:
        raise HTTPException(404, "Action item not found")
    data.pop("_id", None)
    await audit_entity_update(db, "review_action", item_id, old, data, "Reviewer")
    await db.action_items.update_one({"id": item_id}, {"$set": data})
    return clean_doc(await db.action_items.find_one({"id": item_id}))


@api_router.get("/notifications")
async def get_notifications():
    return clean_docs(await db.notifications.find().sort("created_at", -1).to_list(50))


# ============== ANALYTICS / DASHBOARD ==============
def calc_rag(completion: int) -> str:
    if completion >= 100:
        return "blue"
    if completion >= 70:
        return "green"
    if completion >= 40:
        return "amber"
    if completion > 0:
        return "red"
    return "grey"


@api_router.get("/analytics/overview")
async def analytics_overview():
    """Top-level executive metrics."""
    pillars = await db.pillars.find({}, {"_id": 0}).to_list(10)
    themes = await db.themes.find({}, {"_id": 0}).to_list(50)
    inits = await db.initiatives.find({}, {"_id": 0}).to_list(500)
    milestones = await db.milestones.find({}, {"_id": 0}).to_list(2000)
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    risks = await db.risks.find({}, {"_id": 0}).to_list(500)
    evidence = await db.evidence.find({}, {"_id": 0}).to_list(500)
    actions = await db.action_items.find({}, {"_id": 0}).to_list(500)
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(500)

    total_inits = len(inits)
    total_ms = len(milestones)
    completed_ms = len([m for m in milestones if m["status"] == "Completed"])
    delayed_ms = len([m for m in milestones if m["status"] in ("Delayed", "At Risk", "Blocked")])
    red_ms = len([m for m in milestones if m["rag"] == "red"])
    amber_ms = len([m for m in milestones if m["rag"] == "amber"])
    green_ms = len([m for m in milestones if m["rag"] == "green"])
    blue_ms = len([m for m in milestones if m["rag"] == "blue"])

    total_budget = sum(b["total_budget_required"] for b in budgets)
    utilized = sum(b["budget_utilized"] for b in budgets)
    allocated = sum(b["budget_allocated"] for b in budgets)
    private_inv = sum(b["private_investment_committed"] for b in budgets)

    avg_completion = round(sum(m["completion_pct"] for m in milestones) / max(1, total_ms), 1)
    kpi_green = len([k for k in kpis if k["health"] == "green"])
    kpi_amber = len([k for k in kpis if k["health"] == "amber"])
    kpi_red = len([k for k in kpis if k["health"] == "red"])

    # Pillar-wise stats
    pillar_stats = []
    for p in pillars:
        p_themes = [t for t in themes if t["pillar_id"] == p["id"]]
        p_inits = [i for i in inits if i["pillar_id"] == p["id"]]
        p_ms = [m for m in milestones if m["pillar_id"] == p["id"]]
        p_completion = round(sum(m["completion_pct"] for m in p_ms) / max(1, len(p_ms)), 1)
        p_delayed = len([m for m in p_ms if m["status"] in ("Delayed", "At Risk", "Blocked")])
        p_atrisk = len([m for m in p_ms if m["rag"] == "red"])
        pillar_stats.append({
            "id": p["id"],
            "name": p["name"],
            "color": p["color"],
            "themes_count": len(p_themes),
            "initiatives_count": len(p_inits),
            "milestones_count": len(p_ms),
            "completion_pct": p_completion,
            "delayed_milestones": p_delayed,
            "at_risk_milestones": p_atrisk,
            "rag": calc_rag(int(p_completion)),
        })

    # Theme-wise RAG
    theme_stats = []
    for t in themes:
        t_ms = [m for m in milestones if m["theme_id"] == t["id"]]
        t_inits = [i for i in inits if i["theme_id"] == t["id"]]
        t_kpis = [k for k in kpis if k["theme_id"] == t["id"]]
        t_completion = round(sum(m["completion_pct"] for m in t_ms) / max(1, len(t_ms)), 1)
        t_budget = sum(i["budget_estimate"] for i in t_inits)
        t_util = sum(i["budget_utilized"] for i in t_inits)
        theme_stats.append({
            "id": t["id"],
            "name": t["name"],
            "pillar_id": t["pillar_id"],
            "initiatives": len(t_inits),
            "milestones": len(t_ms),
            "kpis": len(t_kpis),
            "completion_pct": t_completion,
            "budget_allocated": t_budget,
            "budget_utilized": t_util,
            "rag": calc_rag(int(t_completion)),
        })

    # Top delayed milestones
    today = datetime.now(timezone.utc).date()
    delayed_list = []
    for m in milestones:
        if m["status"] in ("Delayed", "At Risk", "Blocked") and m.get("planned_end_date"):
            try:
                pe = date.fromisoformat(m["planned_end_date"])
                delay = (today - pe).days
                if delay > 0:
                    delayed_list.append({**m, "delay_days": delay})
            except Exception:
                pass
    delayed_list.sort(key=lambda x: -x["delay_days"])
    top_delayed = delayed_list[:10]

    # Top high-risk initiatives
    risks_by_init: Dict[str, int] = {}
    for r in risks:
        risks_by_init[r["initiative_id"]] = risks_by_init.get(r["initiative_id"], 0) + r["risk_score"]
    top_risk_init_ids = sorted(risks_by_init.items(), key=lambda x: -x[1])[:10]
    top_risk_inits = []
    init_map = {i["id"]: i for i in inits}
    for iid, score in top_risk_init_ids:
        if iid in init_map:
            top_risk_inits.append({**init_map[iid], "risk_score": score})

    evidence_verified = len([e for e in evidence if e["verification_status"] == "Accepted"])
    evidence_compliance = round((evidence_verified / max(1, len(evidence))) * 100, 1)

    return {
        "summary": {
            "vision_progress_pct": avg_completion,
            "total_initiatives": total_inits,
            "total_milestones": total_ms,
            "completed_milestones": completed_ms,
            "delayed_milestones": delayed_ms,
            "red_milestones": red_ms,
            "amber_milestones": amber_ms,
            "green_milestones": green_ms,
            "blue_milestones": blue_ms,
            "total_budget": round(total_budget, 2),
            "budget_allocated": round(allocated, 2),
            "budget_utilized": round(utilized, 2),
            "budget_utilization_pct": round((utilized / max(1, allocated)) * 100, 1),
            "private_investment_committed": round(private_inv, 2),
            "kpi_green": kpi_green,
            "kpi_amber": kpi_amber,
            "kpi_red": kpi_red,
            "kpi_total": len(kpis),
            "evidence_compliance_pct": evidence_compliance,
            "pending_action_items": len([a for a in actions if a["status"] in ("Open", "In Progress", "Overdue")]),
            "overdue_action_items": len([a for a in actions if a["status"] == "Overdue"]),
            "open_risks": len([r for r in risks if r["status"] != "Closed"]),
            "escalated_risks": len([r for r in risks if r["status"] == "Escalated"]),
        },
        "pillars": pillar_stats,
        "themes": theme_stats,
        "top_delayed_milestones": top_delayed,
        "top_risk_initiatives": top_risk_inits,
    }


@api_router.get("/analytics/department/{dept_id}")
async def analytics_department(dept_id: str):
    inits = await db.initiatives.find({"lead_department_id": dept_id}, {"_id": 0}).to_list(500)
    ms = await db.milestones.find({"department_id": dept_id}, {"_id": 0}).to_list(1000)
    kpis = await db.kpis.find({"department_id": dept_id}, {"_id": 0}).to_list(200)
    actions = await db.action_items.find({"owner_department_id": dept_id}, {"_id": 0}).to_list(200)
    budget_alloc = sum(i["budget_estimate"] for i in inits)
    budget_util = sum(i["budget_utilized"] for i in inits)
    completion = round(sum(m["completion_pct"] for m in ms) / max(1, len(ms)), 1)
    return {
        "initiatives": len(inits),
        "milestones": len(ms),
        "completed_milestones": len([m for m in ms if m["status"] == "Completed"]),
        "delayed_milestones": len([m for m in ms if m["status"] in ("Delayed", "At Risk", "Blocked")]),
        "blocked_milestones": len([m for m in ms if m["status"] == "Blocked"]),
        "budget_allocated": round(budget_alloc, 2),
        "budget_utilized": round(budget_util, 2),
        "completion_pct": completion,
        "kpi_count": len(kpis),
        "kpi_green": len([k for k in kpis if k["health"] == "green"]),
        "pending_actions": len([a for a in actions if a["status"] in ("Open", "In Progress", "Overdue")]),
        "evidence_compliance_pct": 75,  # simplified
    }


@api_router.get("/analytics/department-rank")
async def analytics_dept_rank():
    """Rank all departments by performance."""
    depts = await db.departments.find({}, {"_id": 0}).to_list(50)
    out = []
    for d in depts:
        inits = await db.initiatives.find({"lead_department_id": d["id"]}, {"_id": 0}).to_list(500)
        ms = await db.milestones.find({"department_id": d["id"]}, {"_id": 0}).to_list(1000)
        completion = round(sum(m["completion_pct"] for m in ms) / max(1, len(ms)), 1)
        delayed = len([m for m in ms if m["status"] in ("Delayed", "At Risk", "Blocked")])
        out.append({
            "id": d["id"],
            "name": d["name"],
            "head": d["head"],
            "initiatives": len(inits),
            "milestones": len(ms),
            "completion_pct": completion,
            "delayed": delayed,
            "rag": calc_rag(int(completion)),
        })
    out.sort(key=lambda x: -x["completion_pct"])
    return out


# ============== AI COPILOT (Mistral) ==============
class CopilotRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None


async def build_context_summary() -> str:
    """Build a compact summary of seeded data to pass to the LLM as system context."""
    overview = await analytics_overview()
    s = overview["summary"]
    pillars = overview["pillars"]
    themes = overview["themes"]
    top_delayed = overview["top_delayed_milestones"][:5]
    top_risks = overview["top_risk_initiatives"][:5]
    parts = []
    parts.append("VIKSIT MAHARASHTRA 2047 - DATA SNAPSHOT")
    parts.append(f"Overall vision progress: {s['vision_progress_pct']}%")
    parts.append(f"Initiatives: {s['total_initiatives']} | Milestones: {s['total_milestones']} (Completed: {s['completed_milestones']}, Delayed: {s['delayed_milestones']}, Red: {s['red_milestones']}, Amber: {s['amber_milestones']}, Green: {s['green_milestones']})")
    parts.append(f"Budget: Allocated ₹{s['budget_allocated']:.0f} Cr | Utilized ₹{s['budget_utilized']:.0f} Cr ({s['budget_utilization_pct']}%)")
    parts.append(f"KPIs: {s['kpi_total']} (Green {s['kpi_green']}, Amber {s['kpi_amber']}, Red {s['kpi_red']})")
    parts.append(f"Evidence compliance: {s['evidence_compliance_pct']}%")
    parts.append(f"Open risks: {s['open_risks']} | Escalated: {s['escalated_risks']}")
    parts.append("")
    parts.append("PILLARS:")
    for p in pillars:
        parts.append(f"  - {p['name']}: {p['completion_pct']}% complete, {p['delayed_milestones']} delayed, RAG={p['rag']}")
    parts.append("")
    parts.append("TOP 5 THEMES BY PROGRESS:")
    sorted_themes = sorted(themes, key=lambda x: -x["completion_pct"])
    for t in sorted_themes[:5]:
        parts.append(f"  - {t['name']}: {t['completion_pct']}% complete, RAG={t['rag']}")
    parts.append("")
    parts.append("BOTTOM 5 THEMES (NEEDS ATTENTION):")
    for t in sorted_themes[-5:]:
        parts.append(f"  - {t['name']}: {t['completion_pct']}% complete, RAG={t['rag']}")
    parts.append("")
    parts.append("TOP DELAYED MILESTONES:")
    for m in top_delayed:
        parts.append(f"  - {m['name'][:60]} (delay: {m['delay_days']} days, status: {m['status']})")
    parts.append("")
    parts.append("TOP RISK INITIATIVES:")
    for r in top_risks:
        parts.append(f"  - {r['name']} (risk score: {r['risk_score']}, RAG: {r['rag']})")
    parts.append("")
    try:
        parts.append(await build_intelligence_copilot_context(db))
    except Exception:
        logger.exception("intelligence copilot context failed")
    return "\n".join(parts)


@api_router.post("/copilot/chat")
async def copilot_chat(req: CopilotRequest):
    if not MISTRAL_API_KEY:
        return {"response": "AI Copilot is not configured. Please set MISTRAL_API_KEY.", "fallback": True}

    context = await build_context_summary()
    # If prompt mentions agriculture topics, append the agri context too
    p = (req.prompt or "").lower()
    agri_keywords = ["agri", "agriculture", "crop", "msamb", "apmc", "fpo", "farmer", "cluster masterplan", "value chain"]
    if any(k in p for k in agri_keywords):
        try:
            context += "\n\n" + await build_agri_copilot_context(db)
        except Exception:
            logger.exception("agri context build failed")
    system_msg = (
        "You are the AI Copilot for Viksit Maharashtra 2047 Integrated Monitoring Platform. "
        "You assist senior government leaders (CM, Chief Secretary, VMU Head, Department Secretaries, "
        "District Collectors and PMO Analysts) in monitoring the state's progress across 4 pillars and 16 themes. "
        "You ground every answer in the current platform data shown below. Be concise, executive-style, and use "
        "bullet points where possible. Always cite specific data points (pillar/theme/milestone/KPI names). "
        "When asked for review notes or summaries, structure your response with clear sections.\n\n"
        f"CURRENT DATA SNAPSHOT:\n{context}"
    )

    try:
        async with httpx.AsyncClient(timeout=45.0) as c:
            r = await c.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "mistral-large-latest",
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": req.prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1200,
                },
            )
            if r.status_code != 200:
                logger.error(f"Mistral API error {r.status_code}: {r.text[:300]}")
                return JSONResponse(
                    status_code=502,
                    content={"response": f"AI Copilot temporarily unavailable (status {r.status_code}).", "error": r.text[:300]},
                )
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            # Store chat history
            await db.copilot_history.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": req.session_id or "default",
                "prompt": req.prompt,
                "response": content,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return {"response": content, "fallback": False}
    except Exception as e:
        logger.exception("Copilot error")
        return JSONResponse(status_code=500, content={"response": f"Error contacting AI Copilot: {str(e)}"})


@api_router.get("/copilot/history")
async def copilot_history(session_id: str = "default"):
    items = await db.copilot_history.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
    return items


# ============== HEALTH ==============
@api_router.get("/")
async def root():
    return {"app": "Viksit Maharashtra 2047", "status": "ok"}


# ============== WEBSOCKET ==============
@app.websocket("/api/ws/events")
async def websocket_events(ws: WebSocket):
    await manager.connect(ws)
    try:
        # Send a hello event so the client knows it's connected
        await ws.send_text(json_lib.dumps({
            "kind": "hello",
            "title": "Live feed connected",
            "message": "Real-time updates active.",
            "rag": "green",
        }))
        # Keep the socket open
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(ws)


@api_router.post("/admin/broadcast-test")
async def broadcast_test(payload: Dict[str, Any]):
    """Manually push a test event (useful for demo / QA)."""
    await broadcast_event(
        payload.get("title", "Test event"),
        payload.get("message", "Manual broadcast from admin."),
        payload.get("rag", "amber"),
        payload.get("kind", "test"),
    )
    return {"ok": True, "subscribers": len(manager.active)}


# Include router
app.include_router(api_router)

# Agriculture module router
agri_router = build_agri_router(db, broadcast_event)
app.include_router(agri_router)

# Platform enhancements (F001–F023)
enh_router = build_enhancements_router(db, broadcast_event)
app.include_router(enh_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
