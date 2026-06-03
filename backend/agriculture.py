"""Agriculture Mission Monitoring module - Excel import + drill-down APIs."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date, timedelta
import openpyxl
import io
import uuid
import httpx
import logging

logger = logging.getLogger(__name__)
agri_router = APIRouter(prefix="/api/agriculture", tags=["agriculture"])

EXCEL_URL = "https://customer-assets.emergentagent.com/job_viksit-pmo/artifacts/q6ym8gtm_Viksit_Maharashtra_2047_Agriculture.xlsx"

# Flexible column name mapping (canonical → list of accepted aliases)
COL_MAP = {
    "sl_no": ["Sl.No", "Sl No", "SlNo", "S.No"],
    "pillar": ["Pillar"],
    "sector": ["Sector"],
    "key_initiative_no": ["Key Initiative No", "Initiative No"],
    "key_initiative": ["Key Initiative", "Initiative"],
    "milestone_no": ["Milestone No"],
    "milestone": ["Milestone"],
    "type": ["Type"],
    "task_no": ["Task No"],
    "task": ["Task"],
    "responsible_department": ["Responsible Department", "Department"],
    "task_owner": ["Task Owner"],
    "subtask_no": ["Sub-Task No", "Subtask No"],
    "subtask": ["Sub-Task", "Subtask"],
    "subtask_owner": ["Sub-Task Owner", "Subtask Owner"],
    "dependency": ["Dependency"],
    "planned_start": ["Planned Start"],
    "planned_end": ["Planned End"],
    "planned_duration_days": ["Planned Duration (Days)", "Planned Duration Days", "Planned Duration"],
    "status": ["Status"],
    "actual_start": ["Actual Start"],
    "actual_end": ["Actual End"],
    "random_start_factor": ["Random Start Factor"],
    "random_finish_factor": ["Random Finish Factor"],
    "start_variance_days": ["Start Variance (Days)", "Start Variance Days", "Start Variance"],
    "finish_variance_days": ["Finish Variance (Days)", "Finish Variance Days", "Finish Variance"],
    "actual_duration_days": ["Actual Duration (Days)", "Actual Duration Days", "Actual Duration"],
    "schedule_health": ["Schedule Health"],
    "source_row": ["Source Row"],
}

MANDATORY = ["milestone_no", "task_no", "subtask_no", "subtask", "responsible_department", "planned_start", "planned_end", "status"]


def _to_iso(v: Any) -> Optional[str]:
    if v is None or v == "":
        return None
    if isinstance(v, (datetime, date)):
        return v.date().isoformat() if isinstance(v, datetime) else v.isoformat()
    return str(v)


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


def parse_workbook(content: bytes) -> Dict[str, Any]:
    """Parse the Agriculture Excel workbook content and return rows + validation summary."""
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    # Choose primary sheet
    sheet_name = None
    for candidate in ["Tabular_Recreated", "Agriculture", "Tabular", "Sheet1"]:
        if candidate in wb.sheetnames:
            sheet_name = candidate
            break
    if not sheet_name:
        sheet_name = wb.sheetnames[0]
    ws = wb[sheet_name]

    headers = [str(c.value).strip() if c.value else "" for c in ws[1]]
    # Build header → canonical column lookup
    header_to_canon: Dict[int, str] = {}
    for idx, h in enumerate(headers):
        for canon, aliases in COL_MAP.items():
            if h in aliases or h.lower() == canon.lower():
                header_to_canon[idx] = canon
                break

    rows: List[Dict[str, Any]] = []
    seen_subtask_nos: Dict[str, int] = {}
    duplicates: List[str] = []
    missing_mandatory: List[Dict[str, Any]] = []
    broken_deps: List[Dict[str, Any]] = []

    for r in range(2, ws.max_row + 1):
        # Skip empty rows
        row_vals = [ws.cell(r, c + 1).value for c in range(len(headers))]
        if all(v is None or v == "" for v in row_vals):
            continue
        rec: Dict[str, Any] = {}
        for idx, v in enumerate(row_vals):
            canon = header_to_canon.get(idx)
            if not canon:
                continue
            if isinstance(v, (datetime, date)):
                rec[canon] = _to_iso(v)
            else:
                rec[canon] = v
        # Normalize numeric / string types
        for k in ["start_variance_days", "finish_variance_days", "actual_duration_days", "planned_duration_days"]:
            if k in rec and rec[k] is not None:
                try:
                    rec[k] = int(rec[k])
                except Exception:
                    pass

        st_no = rec.get("subtask_no")
        if not st_no:
            continue
        st_no = str(st_no)
        rec["subtask_no"] = st_no

        # Validate
        missing = [m for m in MANDATORY if not rec.get(m)]
        if missing:
            missing_mandatory.append({"subtask_no": st_no, "missing": missing})
        seen_subtask_nos[st_no] = seen_subtask_nos.get(st_no, 0) + 1
        rec["id"] = str(uuid.uuid4())
        rec["module"] = "agriculture"
        rec["row_index"] = r
        rec["last_updated"] = datetime.now(timezone.utc).isoformat()
        rec["last_updated_by"] = "Excel Import"
        rec["evidence_status"] = "Pending"
        rec["risk_status"] = "None"
        rec["remarks"] = rec.get("remarks") or ""
        rows.append(rec)

    duplicates = [k for k, v in seen_subtask_nos.items() if v > 1]

    # Dependency check (predecessor exists?)
    all_st_nos = set(seen_subtask_nos.keys())
    for r in rows:
        dep = r.get("dependency")
        if dep and str(dep).strip() not in ("-", "", "None", "nan"):
            for d in str(dep).split(","):
                d = d.strip()
                if d and d not in all_st_nos and d != "-":
                    broken_deps.append({"subtask_no": r["subtask_no"], "missing_dep": d})

    return {
        "sheet_name": sheet_name,
        "sheets": wb.sheetnames,
        "total_rows": len(rows),
        "rows": rows,
        "headers": headers,
        "duplicates": duplicates,
        "missing_mandatory": missing_mandatory,
        "broken_dependencies": broken_deps,
    }


def calc_rag(row: Dict[str, Any]) -> str:
    """Compute RAG status based on dates and status."""
    status = (row.get("status") or "").strip()
    if status == "Completed":
        if row.get("evidence_status") == "Accepted":
            return "blue"
        return "green"
    if status == "Blocked":
        return "red"
    today = date.today()
    ps = _parse_date(row.get("planned_start"))
    pe = _parse_date(row.get("planned_end"))
    fv = row.get("finish_variance_days")

    # Not started and future planned start
    if status == "Not Started" and ps and ps > today:
        return "grey"

    if pe and pe < today and status not in ("Completed",):
        delay = (today - pe).days
        if delay > 30:
            return "red"
        if delay > 0:
            return "amber"

    if fv is not None:
        try:
            f = int(fv)
            if f > 30:
                return "red"
            if f > 0:
                return "amber"
        except Exception:
            pass

    if pe and 0 <= (pe - today).days <= 15:
        return "amber"

    if status == "Delayed":
        return "amber"
    if status == "At Risk":
        return "amber"
    if status == "In Progress":
        return "green"
    return "grey"


def enrich_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Add computed RAG and cascading dependency flags."""
    by_no = {r["subtask_no"]: r for r in rows}
    # First pass: own RAG
    for r in rows:
        r["rag"] = calc_rag(r)
    # Second pass: propagate at-risk from delayed predecessors
    for r in rows:
        dep = r.get("dependency")
        if not dep or str(dep).strip() in ("-", "", "None"):
            continue
        for d in str(dep).split(","):
            d = d.strip()
            pred = by_no.get(d)
            if pred and pred.get("rag") in ("amber", "red") and r.get("status") != "Completed":
                if r["rag"] == "green":
                    r["rag"] = "amber"
                r["cascading_risk"] = True
    return rows


# ============== ROUTES (will be configured with db dependency) ==============
def build_router(db, broadcast_event):
    """Build the agriculture router with injected db + broadcast helper."""

    @agri_router.get("/overview")
    async def overview():
        rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
        baseline = await db.agri_baselines.find_one({"active": True}, {"_id": 0})
        total = len(rows)
        if total == 0:
            return {
                "imported": False,
                "message": "No Agriculture data imported yet. Use the Excel Import page.",
                "summary": {"total_subtasks": 0, "total_tasks": 0, "total_milestones": 0, "departments": 0},
            }
        completed = len([r for r in rows if r.get("status") == "Completed"])
        delayed = len([r for r in rows if r.get("status") in ("Delayed", "At Risk", "Blocked")])
        blocked = len([r for r in rows if r.get("status") == "Blocked"])
        in_progress = len([r for r in rows if r.get("status") == "In Progress"])
        rag_count = {"green": 0, "amber": 0, "red": 0, "blue": 0, "grey": 0}
        for r in rows:
            rag_count[r.get("rag", "grey")] = rag_count.get(r.get("rag", "grey"), 0) + 1
        milestones = set(r.get("milestone_no") for r in rows if r.get("milestone_no"))
        tasks = set(r.get("task_no") for r in rows if r.get("task_no"))
        depts = set(r.get("responsible_department") for r in rows if r.get("responsible_department"))
        completion_pct = round((completed / total) * 100, 1)
        # Date range
        ps = [r.get("planned_start") for r in rows if r.get("planned_start")]
        pe = [r.get("planned_end") for r in rows if r.get("planned_end")]
        return {
            "imported": True,
            "baseline": baseline,
            "summary": {
                "total_subtasks": total,
                "total_tasks": len(tasks),
                "total_milestones": len(milestones),
                "departments": len(depts),
                "completed": completed,
                "in_progress": in_progress,
                "delayed": delayed,
                "blocked": blocked,
                "completion_pct": completion_pct,
                "rag_distribution": rag_count,
                "timeline_start": min(ps) if ps else None,
                "timeline_end": max(pe) if pe else None,
            },
            "hierarchy": {
                "pillar": "Growth-driven",
                "sector": "Agriculture, Allied Sectors and Rural",
                "initiative": "Build integrated value chains for 10-15 high-value crops",
                "initiative_no": "1.1",
                "milestones": len(milestones),
                "tasks": len(tasks),
                "subtasks": total,
            },
        }

    @agri_router.get("/subtasks")
    async def list_subtasks(
        milestone_no: Optional[str] = None,
        task_no: Optional[str] = None,
        department: Optional[str] = None,
        owner: Optional[str] = None,
        status: Optional[str] = None,
        rag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 500,
    ):
        q = {}
        if milestone_no: q["milestone_no"] = milestone_no
        if task_no: q["task_no"] = task_no
        if department: q["responsible_department"] = department
        if owner: q["task_owner"] = owner
        if status: q["status"] = status
        if rag: q["rag"] = rag
        if search:
            q["$or"] = [
                {"subtask": {"$regex": search, "$options": "i"}},
                {"task": {"$regex": search, "$options": "i"}},
                {"subtask_no": {"$regex": search, "$options": "i"}},
            ]
        rows = await db.agri_subtasks.find(q, {"_id": 0}).limit(limit).to_list(limit)
        return rows

    class SubtaskUpdate(BaseModel):
        status: Optional[str] = None
        actual_start: Optional[str] = None
        actual_end: Optional[str] = None
        finish_variance_days: Optional[int] = None
        start_variance_days: Optional[int] = None
        evidence_status: Optional[str] = None
        remarks: Optional[str] = None

    @agri_router.put("/subtasks/{subtask_id}")
    async def update_subtask(subtask_id: str, payload: SubtaskUpdate):
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(400, "Empty payload")
        data["last_updated"] = datetime.now(timezone.utc).isoformat()
        data["last_updated_by"] = "User"
        # Recompute RAG if status/dates changed
        existing = await db.agri_subtasks.find_one({"id": subtask_id}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "Sub-task not found")
        merged = {**existing, **data}
        merged["rag"] = calc_rag(merged)
        data["rag"] = merged["rag"]
        await db.agri_subtasks.update_one({"id": subtask_id}, {"$set": data})
        if data.get("status") in ("Delayed", "At Risk", "Blocked"):
            await broadcast_event(
                "Agriculture Sub-task Alert",
                f"{merged.get('subtask_no')}: {data['status']} · {merged.get('subtask', '')[:50]}",
                "red" if data["status"] == "Blocked" else "amber",
                "agri.subtask.updated",
            )
        return {**existing, **data}

    @agri_router.get("/milestones")
    async def list_milestones():
        rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
        bucket: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            mn = r.get("milestone_no")
            if not mn:
                continue
            b = bucket.setdefault(mn, {
                "milestone_no": mn,
                "milestone": r.get("milestone", ""),
                "type": r.get("type", ""),
                "subtasks": [],
                "tasks": set(),
                "departments": set(),
                "planned_start": None,
                "planned_end": None,
                "actual_start": None,
                "actual_end": None,
            })
            b["subtasks"].append(r)
            b["tasks"].add(r.get("task_no"))
            if r.get("responsible_department"):
                b["departments"].add(r["responsible_department"])
            ps = _parse_date(r.get("planned_start"))
            pe = _parse_date(r.get("planned_end"))
            asd = _parse_date(r.get("actual_start"))
            aed = _parse_date(r.get("actual_end"))
            if ps and (not b["planned_start"] or ps < _parse_date(b["planned_start"])):
                b["planned_start"] = r["planned_start"]
            if pe and (not b["planned_end"] or pe > _parse_date(b["planned_end"])):
                b["planned_end"] = r["planned_end"]
            if asd and (not b["actual_start"] or asd < _parse_date(b["actual_start"])):
                b["actual_start"] = r["actual_start"]
            if aed and (not b["actual_end"] or aed > _parse_date(b["actual_end"])):
                b["actual_end"] = r["actual_end"]

        out = []
        for mn, b in bucket.items():
            sts = b["subtasks"]
            total = len(sts)
            completed = len([s for s in sts if s.get("status") == "Completed"])
            delayed = len([s for s in sts if s.get("status") in ("Delayed", "At Risk")])
            blocked = len([s for s in sts if s.get("status") == "Blocked"])
            avg_sv = round(sum((s.get("start_variance_days") or 0) for s in sts) / max(1, total), 2)
            avg_fv = round(sum((s.get("finish_variance_days") or 0) for s in sts) / max(1, total), 2)
            completion = round((completed / max(1, total)) * 100, 1)
            rag_counts = {"green": 0, "amber": 0, "red": 0, "blue": 0, "grey": 0}
            for s in sts:
                rag_counts[s.get("rag", "grey")] = rag_counts.get(s.get("rag", "grey"), 0) + 1
            # Milestone RAG = worst RAG of its subtasks
            if rag_counts["red"] > 0:
                m_rag = "red"
            elif rag_counts["amber"] > 0:
                m_rag = "amber"
            elif completed == total:
                m_rag = "blue"
            elif rag_counts["green"] > 0:
                m_rag = "green"
            else:
                m_rag = "grey"
            out.append({
                "milestone_no": mn,
                "milestone": b["milestone"],
                "type": b["type"],
                "total_subtasks": total,
                "total_tasks": len(b["tasks"]),
                "departments": sorted(b["departments"]),
                "department_count": len(b["departments"]),
                "planned_start": b["planned_start"],
                "planned_end": b["planned_end"],
                "actual_start": b["actual_start"],
                "actual_end": b["actual_end"],
                "completion_pct": completion,
                "completed_subtasks": completed,
                "delayed_subtasks": delayed,
                "blocked_subtasks": blocked,
                "avg_start_variance": avg_sv,
                "avg_finish_variance": avg_fv,
                "rag": m_rag,
                "rag_distribution": rag_counts,
            })
        out.sort(key=lambda x: x["milestone_no"])
        return out

    @agri_router.get("/departments")
    async def list_departments():
        rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
        bucket: Dict[str, Dict[str, Any]] = {}
        today = date.today()
        for r in rows:
            dn = r.get("responsible_department")
            if not dn:
                continue
            b = bucket.setdefault(dn, {
                "department": dn, "subtasks": [], "tasks": set(), "milestones": set(),
            })
            b["subtasks"].append(r)
            b["tasks"].add(r.get("task_no"))
            b["milestones"].add(r.get("milestone_no"))

        out = []
        for dn, b in bucket.items():
            sts = b["subtasks"]
            total = len(sts)
            completed = len([s for s in sts if s.get("status") == "Completed"])
            in_progress = len([s for s in sts if s.get("status") == "In Progress"])
            delayed = len([s for s in sts if s.get("status") in ("Delayed", "At Risk")])
            blocked = len([s for s in sts if s.get("status") == "Blocked"])
            upcoming = 0
            for s in sts:
                ps = _parse_date(s.get("planned_start"))
                if ps and 0 <= (ps - today).days <= 30 and s.get("status") == "Not Started":
                    upcoming += 1
            avg_fv = round(sum((s.get("finish_variance_days") or 0) for s in sts) / max(1, total), 2)
            evidence_pending = len([s for s in sts if s.get("evidence_status") in (None, "Pending")])
            completion = round((completed / max(1, total)) * 100, 1)
            if completion >= 70:
                rag = "green"
            elif completion >= 40:
                rag = "amber"
            elif delayed > 0 or blocked > 0:
                rag = "red"
            else:
                rag = "grey"
            out.append({
                "department": dn,
                "total_subtasks": total,
                "unique_tasks": len(b["tasks"]),
                "milestones_involved": len(b["milestones"]),
                "completed": completed,
                "in_progress": in_progress,
                "delayed": delayed,
                "blocked": blocked,
                "upcoming_30d": upcoming,
                "avg_finish_variance": avg_fv,
                "evidence_pending": evidence_pending,
                "completion_pct": completion,
                "rag": rag,
            })
        out.sort(key=lambda x: -x["total_subtasks"])
        return out

    @agri_router.get("/dependencies")
    async def dependencies():
        rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
        by_no = {r["subtask_no"]: r for r in rows}
        chains = []
        critical = []
        for r in rows:
            dep = r.get("dependency")
            if not dep or str(dep).strip() in ("-", "", "None"):
                continue
            for d in str(dep).split(","):
                d = d.strip()
                pred = by_no.get(d)
                if pred:
                    edge = {
                        "from_no": d, "from_subtask": pred.get("subtask", "")[:60],
                        "from_status": pred.get("status"), "from_rag": pred.get("rag"),
                        "to_no": r["subtask_no"], "to_subtask": r.get("subtask", "")[:60],
                        "to_status": r.get("status"), "to_rag": r.get("rag"),
                    }
                    chains.append(edge)
                    if pred.get("rag") in ("red", "amber") and r.get("status") not in ("Completed",):
                        critical.append(edge)
        return {"chains": chains[:500], "critical_path": critical[:200], "total_dependencies": len(chains)}

    @agri_router.get("/import-history")
    async def import_history():
        items = await db.agri_imports.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
        return items

    @agri_router.post("/import/preview")
    async def import_preview(file: UploadFile = File(...)):
        try:
            content = await file.read()
            parsed = parse_workbook(content)
            # Store as a draft batch
            batch_id = str(uuid.uuid4())
            await db.agri_imports.insert_one({
                "id": batch_id,
                "filename": file.filename,
                "sheet": parsed["sheet_name"],
                "total_rows": parsed["total_rows"],
                "duplicates": parsed["duplicates"],
                "missing_mandatory_count": len(parsed["missing_mandatory"]),
                "broken_deps_count": len(parsed["broken_dependencies"]),
                "status": "draft",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "rows": parsed["rows"][:5000],
            })
            return {
                "batch_id": batch_id,
                "filename": file.filename,
                "sheet_name": parsed["sheet_name"],
                "sheets": parsed["sheets"],
                "total_rows": parsed["total_rows"],
                "headers": parsed["headers"],
                "duplicates": parsed["duplicates"],
                "missing_mandatory": parsed["missing_mandatory"][:50],
                "broken_dependencies": parsed["broken_dependencies"][:50],
                "preview": parsed["rows"][:20],
            }
        except Exception as e:
            logger.exception("Excel parse failed")
            raise HTTPException(400, f"Excel parse failed: {str(e)}")

    @agri_router.post("/import/{batch_id}/commit")
    async def import_commit(batch_id: str, version_name: Optional[str] = None):
        batch = await db.agri_imports.find_one({"id": batch_id})
        if not batch:
            raise HTTPException(404, "Import batch not found")
        rows = batch.get("rows", [])
        if not rows:
            raise HTTPException(400, "No rows in batch")
        # Wipe existing agriculture data and replace
        await db.agri_subtasks.delete_many({})
        # Mark all existing baselines inactive
        await db.agri_baselines.update_many({}, {"$set": {"active": False}})
        # Compute RAG
        enriched = enrich_rows(rows)
        for r in enriched:
            r.pop("_id", None)
        await db.agri_subtasks.insert_many(enriched)
        baseline_id = str(uuid.uuid4())
        version = version_name or f"Baseline {datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        await db.agri_baselines.insert_one({
            "id": baseline_id,
            "version_name": version,
            "batch_id": batch_id,
            "row_count": len(enriched),
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source_file": batch.get("filename"),
        })
        await db.agri_imports.update_one({"id": batch_id}, {"$set": {"status": "committed", "baseline_id": baseline_id}})
        await broadcast_event(
            "Agriculture Baseline Committed",
            f"{version} · {len(enriched)} sub-tasks frozen",
            "green", "agri.baseline.committed",
        )
        return {"ok": True, "baseline_id": baseline_id, "version_name": version, "row_count": len(enriched)}

    @agri_router.post("/seed-from-url")
    async def seed_from_url():
        """Pull the canonical Excel from the user-provided URL and import it as Baseline 1.0."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as c:
                r = await c.get(EXCEL_URL)
                r.raise_for_status()
                parsed = parse_workbook(r.content)
            await db.agri_subtasks.delete_many({})
            await db.agri_baselines.update_many({}, {"$set": {"active": False}})
            enriched = enrich_rows(parsed["rows"])
            for row in enriched:
                row.pop("_id", None)
            await db.agri_subtasks.insert_many(enriched)
            baseline_id = str(uuid.uuid4())
            await db.agri_baselines.insert_one({
                "id": baseline_id,
                "version_name": "Baseline Version 1.0 – Agriculture Value Chain Initiative",
                "row_count": len(enriched),
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source_file": "Viksit_Maharashtra_2047_Agriculture.xlsx",
                "source_url": EXCEL_URL,
            })
            return {"ok": True, "rows": len(enriched), "baseline_id": baseline_id}
        except Exception as e:
            logger.exception("seed-from-url failed")
            raise HTTPException(500, f"Seeding failed: {str(e)}")

    @agri_router.get("/baselines")
    async def baselines():
        return await db.agri_baselines.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)

    @agri_router.get("/owners")
    async def owners():
        rows = await db.agri_subtasks.find({}, {"_id": 0, "task_owner": 1, "subtask_owner": 1}).to_list(5000)
        s = set()
        for r in rows:
            if r.get("task_owner"): s.add(r["task_owner"])
            if r.get("subtask_owner"): s.add(r["subtask_owner"])
        return sorted(s)

    @agri_router.get("/tasks")
    async def list_tasks():
        rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
        bucket: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            tn = r.get("task_no")
            if not tn: continue
            b = bucket.setdefault(tn, {
                "task_no": tn, "task": r.get("task"), "milestone_no": r.get("milestone_no"),
                "responsible_department": r.get("responsible_department"),
                "task_owner": r.get("task_owner"), "subtasks": [],
            })
            b["subtasks"].append(r)
        out = []
        for tn, b in bucket.items():
            sts = b["subtasks"]
            total = len(sts)
            completed = len([s for s in sts if s.get("status") == "Completed"])
            delayed = len([s for s in sts if s.get("status") in ("Delayed", "At Risk", "Blocked")])
            completion = round((completed / max(1, total)) * 100, 1)
            rag_counts = {"green": 0, "amber": 0, "red": 0, "blue": 0, "grey": 0}
            for s in sts:
                rag_counts[s.get("rag", "grey")] = rag_counts.get(s.get("rag", "grey"), 0) + 1
            rag = "red" if rag_counts["red"] else ("amber" if rag_counts["amber"] else ("blue" if completed == total else ("green" if rag_counts["green"] else "grey")))
            out.append({
                "task_no": tn, "task": b["task"], "milestone_no": b["milestone_no"],
                "responsible_department": b["responsible_department"], "task_owner": b["task_owner"],
                "total_subtasks": total, "completed": completed, "delayed": delayed,
                "completion_pct": completion, "rag": rag,
            })
        out.sort(key=lambda x: x["task_no"])
        return out

    return agri_router


async def build_agri_copilot_context(db) -> str:
    """Compact agri context for Mistral copilot when prompt is agri-related."""
    rows = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)
    if not rows:
        return "AGRICULTURE MODULE: No data imported yet."
    total = len(rows)
    completed = len([r for r in rows if r.get("status") == "Completed"])
    delayed = len([r for r in rows if r.get("status") in ("Delayed", "At Risk", "Blocked")])
    rag = {}
    for r in rows:
        rag[r.get("rag", "grey")] = rag.get(r.get("rag", "grey"), 0) + 1
    dept_counts: Dict[str, Dict[str, int]] = {}
    ms_counts: Dict[str, Dict[str, int]] = {}
    for r in rows:
        d = r.get("responsible_department", "Unknown")
        dept_counts.setdefault(d, {"total": 0, "delayed": 0})
        dept_counts[d]["total"] += 1
        if r.get("status") in ("Delayed", "At Risk", "Blocked"):
            dept_counts[d]["delayed"] += 1
        m = r.get("milestone_no", "?")
        ms_counts.setdefault(m, {"name": r.get("milestone", "")[:60], "total": 0, "delayed": 0})
        ms_counts[m]["total"] += 1
        if r.get("status") in ("Delayed", "At Risk", "Blocked"):
            ms_counts[m]["delayed"] += 1
    parts = []
    parts.append("AGRICULTURE MISSION — VALUE CHAIN INITIATIVE 1.1")
    parts.append(f"Sub-tasks: {total} | Completed: {completed} | Delayed: {delayed}")
    parts.append(f"RAG: Green {rag.get('green',0)} · Amber {rag.get('amber',0)} · Red {rag.get('red',0)} · Closed {rag.get('blue',0)} · NotStarted {rag.get('grey',0)}")
    parts.append("MILESTONES:")
    for mn, m in sorted(ms_counts.items()):
        parts.append(f"  {mn} ({m['total']} subtasks, {m['delayed']} delayed): {m['name']}")
    parts.append("DEPARTMENTS:")
    for d, v in sorted(dept_counts.items(), key=lambda x: -x[1]["total"]):
        parts.append(f"  {d}: {v['total']} subtasks, {v['delayed']} delayed")
    # Top 5 delayed sub-tasks
    delayed_list = [r for r in rows if r.get("rag") in ("red", "amber") and r.get("status") != "Completed"]
    delayed_list.sort(key=lambda x: -(x.get("finish_variance_days") or 0))
    parts.append("TOP DELAYED SUB-TASKS:")
    for r in delayed_list[:8]:
        parts.append(f"  {r.get('subtask_no')} ({r.get('responsible_department')}, FV={r.get('finish_variance_days')}d): {r.get('subtask','')[:70]}")
    return "\n".join(parts)
