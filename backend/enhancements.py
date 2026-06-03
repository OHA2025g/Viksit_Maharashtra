"""Viksit Maharashtra 2047 — Platform enhancements (F001–F023 backend)."""
from __future__ import annotations

import io
import json
import os
import uuid
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from openpyxl import Workbook

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def _asset_coords(district: Optional[Dict], asset_id: str, lat: Optional[float] = None, lng: Optional[float] = None):
    from district_geo import resolve_asset_coordinates
    name = (district or {}).get("name")
    return resolve_asset_coordinates(name, latitude=lat, longitude=lng, asset_id=asset_id)


def _align_asset_geo(asset: Dict) -> Dict:
    lat, lng = _asset_coords(
        {"name": asset.get("district_name")},
        asset.get("asset_id") or asset.get("id", ""),
        asset.get("latitude"),
        asset.get("longitude"),
    )
    return {**asset, "latitude": lat, "longitude": lng}

EVIDENCE_TYPES = [
    "Government Resolution", "Approval Note", "DPR", "Tender Document", "Work Order",
    "Utilization Certificate", "Completion Certificate", "Geo-tagged Photo", "Inspection Report",
    "MoU", "KPI Data Report", "Training Report", "Cyber Audit Report", "Financial Report",
    "Attendance Proof", "RFQ/RFP", "Financial Closure Document", "Budget Approval",
]

EVIDENCE_SUFFICIENCY_RULES = {
    "Infrastructure": ["Work Order", "Geo-tagged Photo", "Completion Certificate"],
    "Financial": ["Budget Approval", "Utilization Certificate", "Financial Report"],
    "Policy": ["Government Resolution", "Approval Note"],
    "Training": ["Training Report", "Attendance Proof"],
    "PPP": ["RFQ/RFP", "MoU", "Financial Closure Document"],
    "default": ["Approval Note", "Inspection Report"],
}

REPORT_SLUGS = {
    "executive-summary": "Vision 2047 Executive Summary",
    "pillar-progress": "Pillar-wise Progress Report",
    "theme-progress": "Theme-wise Progress Report",
    "department-performance": "Department Performance Report",
    "district-progress": "District Progress Report",
    "delayed-milestones": "Delayed Milestone Report",
    "risk-escalation": "Risk and Escalation Report",
    "evidence-compliance": "Evidence Compliance Report",
    "budget-utilization": "Budget Utilization Report",
    "cm-review-note": "CM Review Note",
    "cs-review-note": "Chief Secretary Review Note",
    "agriculture-mission": "Agriculture Mission Report",
}

AGRI_REPORT_DATASETS = {
    "agri-overview": "Agriculture Executive Progress Summary",
    "agri-milestones": "Agriculture Milestone Progress Report",
    "agri-departments": "Agriculture Department Performance Report",
    "agri-subtasks": "Agriculture Delayed Sub-task Report",
    "agri-dependencies": "Agriculture Dependency Blocker Report",
    "agri-cm-review": "Agriculture CM Review Note",
}

MEETING_PACK_TYPES = [
    "Weekly PMO Review", "Monthly Department Review", "Monthly VMU Review",
    "Chief Secretary Review", "Quarterly CM Review",
]

APPROVAL_WORKFLOWS = [
    "DPR Approval", "Financial Sanction", "Utilization Certificate Approval",
    "Evidence Approval", "Milestone Closure Approval", "Budget Reallocation Approval",
]

APPROVAL_STAGES = [
    "Draft", "Submitted", "Department Review", "Finance Review",
    "ACS Review", "Approved", "Rejected", "Needs Clarification",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_date(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return date.fromisoformat(str(val)[:10])
    except ValueError:
        return None


def _days_between(d1: Optional[date], d2: Optional[date] = None) -> int:
    if not d1:
        return 0
    d2 = d2 or date.today()
    return (d2 - d1).days


def _officer_accountability_metrics(
    department_id: str,
    milestones: List[Dict],
    evidence: List[Dict],
    risks: List[Dict],
    actions: List[Dict],
    initiatives: List[Dict],
) -> Dict[str, Any]:
    """Per-department accountability counts (not global totals)."""
    dept_ms = [m for m in milestones if m.get("department_id") == department_id]
    ms_ids = {m["id"] for m in dept_ms}
    init_ids = {i["id"] for i in initiatives if i.get("lead_department_id") == department_id}

    dept_actions = [a for a in actions if a.get("owner_department_id") == department_id]
    overdue_actions = [
        a for a in dept_actions
        if a.get("status") == "Overdue"
        or (
            a.get("status") in ("Open", "In Progress")
            and _days_between(_parse_date(a.get("due_date"))) > 0
        )
    ]

    open_risks = [
        r for r in risks
        if r.get("initiative_id") in init_ids
        and r.get("status") in ("Open", "Escalated", "Mitigation In Progress")
    ]

    evidence_pending = [
        e for e in evidence
        if e.get("milestone_id") in ms_ids
        and e.get("verification_status") == "Pending"
    ]

    delays = []
    for m in dept_ms:
        if m.get("status") in ("Completed", "Closed"):
            continue
        end = _parse_date(m.get("planned_end_date"))
        if end:
            late = _days_between(end)
            if late > 0:
                delays.append(late)
    avg_delay = round(sum(delays) / len(delays), 1) if delays else 0.0

    return {
        "milestones_owned": len(dept_ms),
        "overdue_actions": len(overdue_actions),
        "open_risks": len(open_risks),
        "evidence_pending": len(evidence_pending),
        "avg_delay_days": avg_delay,
        "_milestones": dept_ms,
        "_overdue_actions": overdue_actions,
        "_open_risks": open_risks,
        "_evidence_pending": evidence_pending,
        "_initiatives": [i for i in initiatives if i.get("lead_department_id") == department_id],
    }


async def write_audit(db, entity_type: str, entity_id: str, field: str,
                      old_val: Any, new_val: Any, changed_by: str = "System",
                      change_type: str = "update"):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "field": field,
        "old_value": old_val,
        "new_value": new_val,
        "changed_by": changed_by,
        "changed_at": _now(),
        "change_type": change_type,
    })


async def audit_entity_update(db, entity_type: str, entity_id: str, old_doc: Dict,
                              new_data: Dict, changed_by: str = "System"):
    """Write field-level audit entries for changed fields."""
    if not old_doc:
        return
    skip = {"_id", "id"}
    for field, new_val in new_data.items():
        if field in skip:
            continue
        old_val = old_doc.get(field)
        if old_val != new_val:
            await write_audit(db, entity_type, entity_id, field, old_val, new_val, changed_by, "update")


def _budget_amounts(b: Dict) -> Dict[str, float]:
    """Normalize budget field names from seed vs legacy schemas."""
    allocated = b.get("budget_allocated") or b.get("allocated_amount") or b.get("total_budget_required") or 0
    utilized = b.get("budget_utilized") or b.get("utilized_amount") or 0
    released = b.get("released_amount") or b.get("budget_released") or (utilized * 1.05 if utilized else allocated * 0.85)
    return {"allocated": float(allocated), "utilized": float(utilized), "released": float(released)}


async def build_intelligence_copilot_context(db) -> str:
    """Compact watchlist, delay-risk and RCA summary for AI Copilot."""
    milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
    evidence = await db.evidence.find({}, {"_id": 0}).to_list(500)
    risks = await db.risks.find({}, {"_id": 0}).to_list(500)
    actions = await db.action_items.find({}, {"_id": 0}).to_list(500)
    parts = ["INTELLIGENCE SNAPSHOT (watchlist, delay-risk, auto-RCA):"]
    watch = []
    for ms in milestones:
        reasons = compute_watchlist_reasons(ms, evidence, risks, actions)
        if not reasons and ms.get("rag") not in ("red", "amber"):
            continue
        dr = compute_delay_risk(ms, evidence, risks)
        if reasons or dr["delay_risk_score"] >= 25:
            watch.append((ms, reasons, dr))
    watch.sort(key=lambda x: x[2]["delay_risk_score"], reverse=True)
    parts.append(f"Watchlist / at-risk milestones: {len(watch)}")
    for ms, reasons, dr in watch[:10]:
        parts.append(
            f"  - {ms.get('code', '')} {ms.get('name', '')[:55]} | "
            f"{dr['risk_category']} ({dr['delay_risk_score']}) | "
            f"{'; '.join(reasons[:2]) or 'High RAG'}"
        )
        rca = compute_rca(ms, evidence, risks)
        top = rca.get("top_causes") or []
        if top:
            parts.append(f"    Top RCA: {top[0]['cause']} — {top[0]['corrective_action']}")
    red_ms = [m for m in milestones if m.get("rag") == "red"][:5]
    if red_ms:
        parts.append("TOP RED MILESTONES (delay-risk):")
        for ms in red_ms:
            dr = compute_delay_risk(ms, evidence, risks)
            parts.append(f"  - {ms.get('name', '')[:50]}: score {dr['delay_risk_score']}, {dr['risk_category']}")
    return "\n".join(parts)


def _milestone_category(ms: Dict) -> str:
    name = (ms.get("name") or "") + (ms.get("milestone_type") or "")
    lower = name.lower()
    if any(x in lower for x in ("road", "infra", "construction", "port", "grid")):
        return "Infrastructure"
    if any(x in lower for x in ("budget", "fund", "finance", "crore")):
        return "Financial"
    if any(x in lower for x in ("policy", "act", "resolution", "reform")):
        return "Policy"
    if any(x in lower for x in ("training", "skill", "capacity")):
        return "Training"
    if any(x in lower for x in ("ppp", "mou", "investment", "rfp")):
        return "PPP"
    return "default"


def check_evidence_sufficiency(ms: Dict, evidence_list: List[Dict]) -> Dict:
    cat = _milestone_category(ms)
    required = EVIDENCE_SUFFICIENCY_RULES.get(cat, EVIDENCE_SUFFICIENCY_RULES["default"])
    uploaded_types = {e.get("evidence_type") for e in evidence_list if e.get("milestone_id") == ms.get("id")}
    verified = {e.get("evidence_type") for e in evidence_list
                if e.get("milestone_id") == ms.get("id") and e.get("verification_status") in ("Accepted", "Verified")}
    missing = [t for t in required if t not in uploaded_types]
    rejected = [e.get("evidence_type") for e in evidence_list
                if e.get("milestone_id") == ms.get("id") and e.get("verification_status") == "Rejected"]
    pending = [e.get("evidence_type") for e in evidence_list
               if e.get("milestone_id") == ms.get("id") and e.get("verification_status") == "Pending"]
    if not missing and verified and len(verified) >= len(required):
        status = "complete"
    elif missing and uploaded_types:
        status = "partial"
    elif missing:
        status = "missing"
    elif rejected:
        status = "rejected"
    elif pending:
        status = "pending_verification"
    else:
        status = "partial"
    return {
        "category": cat,
        "required_types": required,
        "uploaded_types": list(uploaded_types),
        "missing_types": missing,
        "sufficiency_status": status,
        "compliance_pct": round(max(0, (len(required) - len(missing)) / max(len(required), 1)) * 100, 1),
    }


def compute_watchlist_reasons(ms: Dict, evidence: List[Dict], risks: List[Dict],
                              action_items: List[Dict]) -> List[str]:
    reasons = []
    today = date.today()
    last_upd = _parse_date(ms.get("last_updated", "")[:10] if ms.get("last_updated") else None)
    if last_upd and _days_between(last_upd, today) > 30:
        reasons.append("No status movement for more than 30 days")
    planned_end = _parse_date(ms.get("planned_end_date"))
    if planned_end and planned_end < today and ms.get("status") not in ("Completed", "Closed"):
        reasons.append("Planned end date passed and incomplete")
    if ms.get("dependency") and ms.get("rag") in ("red", "amber"):
        reasons.append("Dependency blocked or at risk")
    ms_ev = [e for e in evidence if e.get("milestone_id") == ms.get("id")]
    suff = check_evidence_sufficiency(ms, evidence)
    if ms.get("status") in ("Completed", "Closed") and suff["sufficiency_status"] != "complete":
        reasons.append("Evidence missing after completion")
    if suff["sufficiency_status"] == "missing":
        reasons.append("Required evidence missing")
    ms_risks = [r for r in risks if r.get("milestone_id") == ms.get("id") and r.get("status") == "Open"]
    if any(r.get("risk_score", 0) >= 16 for r in ms_risks):
        reasons.append("High risk score on linked risks")
    overdue_actions = [a for a in action_items if a.get("status") == "Open"
                     and _parse_date(a.get("due_date")) and _parse_date(a.get("due_date")) < today]
    if overdue_actions:
        reasons.append("Review action overdue")
    return reasons


def compute_delay_risk(ms: Dict, evidence: List[Dict], risks: List[Dict]) -> Dict:
    score = 0
    reasons = []
    today = date.today()
    planned_end = _parse_date(ms.get("planned_end_date"))
    if planned_end:
        days_to_end = (planned_end - today).days
        if days_to_end < 0:
            score += 35
            reasons.append(f"Overdue by {abs(days_to_end)} days")
        elif days_to_end <= 7:
            score += 20
            reasons.append("Due within 7 days")
        elif days_to_end <= 30:
            score += 10
    last_upd = _parse_date(ms.get("last_updated", "")[:10] if ms.get("last_updated") else None)
    if last_upd and _days_between(last_upd, today) > 30:
        score += 15
        reasons.append("Stale update (>30 days)")
    if ms.get("rag") == "red":
        score += 25
        reasons.append("Current RAG is red")
    elif ms.get("rag") == "amber":
        score += 12
    suff = check_evidence_sufficiency(ms, evidence)
    if suff["sufficiency_status"] in ("missing", "partial"):
        score += 10
        reasons.append("Evidence gap")
    ms_risks = [r for r in risks if r.get("milestone_id") == ms.get("id") and r.get("status") == "Open"]
    if ms_risks:
        max_risk = max(r.get("risk_score", 0) for r in ms_risks)
        score += min(20, max_risk)
        reasons.append(f"Open risk score up to {max_risk}")
    if ms.get("dependency"):
        score += 8
        reasons.append("Has upstream dependency")
    util = ms.get("budget_utilized_pct") or 0
    if util < 30 and ms.get("completion_pct", 0) > 50:
        score += 5
        reasons.append("Budget underutilized vs physical progress")
    score = min(100, score)
    if score >= 75:
        category = "Critical"
    elif score >= 50:
        category = "High"
    elif score >= 25:
        category = "Medium"
    else:
        category = "Low"
    confidence = min(95, 60 + len(reasons) * 5)
    actions = []
    if "Overdue" in " ".join(reasons):
        actions.append("Escalate to department secretary and schedule recovery plan")
    if "Evidence" in " ".join(reasons):
        actions.append("Assign nodal officer to upload pending evidence within 7 days")
    if not actions:
        actions.append("Continue weekly monitoring")
    return {
        "delay_risk_score": score,
        "risk_category": category,
        "confidence_score": confidence,
        "reasons": reasons,
        "recommended_actions": actions,
    }


def compute_rca(ms: Dict, evidence: List[Dict], risks: List[Dict]) -> Dict:
    causes_pool = [
        ("Land acquisition / land issue", 0.82, "Revenue department coordination", "District Collector"),
        ("Tender / procurement delay", 0.78, "Re-tender with expedited timeline", "Department Secretary"),
        ("Budget release delay", 0.74, "Finance clearance and re-phasing", "Finance Department"),
        ("Inter-department coordination issue", 0.70, "ACS-led coordination meeting", "ACS"),
        ("Vendor / contractor issue", 0.68, "Performance notice and alternate vendor", "Nodal Officer"),
        ("Approval pending at higher level", 0.65, "Fast-track file with CM/CS office", "Department Secretary"),
        ("Evidence not uploaded / verification pending", 0.60, "Evidence upload sprint", "Nodal Officer"),
        ("Data not updated in system", 0.55, "Mandatory weekly data refresh", "PMO Analyst"),
        ("Dependency on predecessor milestone", 0.72, "Critical path review", "VMU Head"),
        ("Field execution delay", 0.66, "On-site inspection and recovery plan", "District Collector"),
    ]
    scored = []
    name_lower = (ms.get("name") or "").lower()
    for cause, conf, action, owner in causes_pool:
        adj = conf
        if "tender" in name_lower and "Tender" in cause:
            adj += 0.1
        if ms.get("dependency") and "Dependency" in cause:
            adj += 0.12
        suff = check_evidence_sufficiency(ms, evidence)
        if suff["sufficiency_status"] != "complete" and "Evidence" in cause:
            adj += 0.15
        if any(r.get("risk_type") == "Financial" for r in risks if r.get("milestone_id") == ms.get("id")):
            if "Budget" in cause:
                adj += 0.1
        scored.append({
            "cause": cause,
            "confidence": round(min(0.98, adj) * 100, 1),
            "corrective_action": action,
            "escalation_owner": owner,
            "resolution_path": f"{owner} → VMU → Chief Secretary (if unresolved in 14 days)",
        })
    scored.sort(key=lambda x: x["confidence"], reverse=True)
    return {"milestone_id": ms.get("id"), "milestone_name": ms.get("name"), "top_causes": scored[:3]}


def compute_rca_for_risk(risk: Dict, ms: Optional[Dict], evidence: List[Dict], linked_risks: List[Dict]) -> Dict:
    """RCA for a risk — uses linked milestone when present, else risk metadata."""
    target = ms if ms else {
        "id": risk.get("id"),
        "name": (risk.get("description") or risk.get("code") or "Risk item")[:120],
        "dependency": risk.get("dependency"),
    }
    result = compute_rca(target, evidence, linked_risks or [risk])
    result["risk_id"] = risk.get("id")
    result["risk_code"] = risk.get("code")
    result["source"] = "milestone" if ms else "risk"
    if not ms and risk.get("risk_type") == "Financial":
        for c in result.get("top_causes", []):
            if "Budget" in c.get("cause", ""):
                c["confidence"] = min(98.0, c["confidence"] + 8)
    return result


def compute_kpi_anomaly(kpi: Dict) -> Optional[Dict]:
    baseline = kpi.get("baseline_value") or 0
    current = kpi.get("current_value") or 0
    target29 = kpi.get("target_2029") or baseline
    if target29 == baseline:
        return None
    expected = baseline + (target29 - baseline) * 0.35
    deviation = abs(current - expected) / max(abs(expected), 0.001) * 100
    flags = []
    if deviation > 25:
        flags.append("Significant deviation from expected trajectory")
    if current < expected * 0.7:
        flags.append("Far below planned value for reporting period")
    last_upd = _parse_date(kpi.get("last_updated", "")[:10] if kpi.get("last_updated") else None)
    if last_upd and _days_between(last_upd, date.today()) > 45:
        flags.append("KPI data not updated recently")
    mom = kpi.get("month_on_month_change_pct")
    if mom is not None and abs(mom) > 30:
        flags.append("Abnormal month-on-month movement")
    if not flags:
        return None
    return {
        "kpi_id": kpi.get("id"),
        "kpi_name": kpi.get("name"),
        "anomaly": True,
        "flags": flags,
        "deviation_pct": round(deviation, 1),
        "severity": "high" if deviation > 40 else "medium",
    }


def compute_budget_forecast(budgets: List[Dict]) -> List[Dict]:
    results = []
    for b in budgets:
        amounts = _budget_amounts(b)
        allocated = amounts["allocated"]
        utilized = amounts["utilized"]
        released = amounts["released"]
        remaining = max(0, allocated - utilized)
        util_pct = round(utilized / max(allocated, 1) * 100, 1)
        monthly_burn = utilized / max(date.today().month, 1)
        months_left = max(1, 12 - date.today().month)
        projected_ye = min(allocated * 1.15, utilized + monthly_burn * months_left)
        projected_util_pct = round(projected_ye / max(allocated, 1) * 100, 1)
        warnings = []
        if projected_util_pct < 70:
            warnings.append("Underutilization risk — projected utilization below 70%")
        if projected_ye > allocated * 1.1:
            warnings.append("Cost overrun risk — projected spend exceeds approved budget by >10%")
        phys = b.get("physical_progress_pct") or util_pct * 0.9
        if util_pct - phys > 15:
            warnings.append("Mismatch — financial progress ahead of physical progress")
        results.append({
            **{k: b.get(k) for k in ("id", "code", "theme_id", "department_id", "initiative_id")},
            "allocated": round(allocated, 2),
            "released": round(released, 2),
            "utilized": round(utilized, 2),
            "remaining": round(remaining, 2),
            "utilization_pct": util_pct,
            "monthly_burn_rate": round(monthly_burn, 2),
            "projected_year_end_utilization": round(projected_ye, 2),
            "projected_utilization_pct": projected_util_pct,
            "variance": round(allocated - utilized, 2),
            "warnings": warnings,
        })
    return results


async def seed_enhancement_data(db):
    """Seed enhancement collections if empty."""
    if await db.officers.count_documents({}) == 0:
        depts = await db.departments.find({}, {"_id": 0}).to_list(50)
        officers = []
        for i, d in enumerate(depts[:12]):
            officers.append({
                "id": str(uuid.uuid4()),
                "name": d.get("head", f"Officer {i+1}"),
                "email": d.get("email", f"officer{i}@mh.gov.in"),
                "department_id": d.get("id"),
                "department_name": d.get("name"),
                "role_title": "Department Secretary" if i % 2 == 0 else "Nodal Officer",
                "active": True,
            })
        if officers:
            await db.officers.insert_many(officers)

    if await db.assets.count_documents({}) == 0:
        milestones = await db.milestones.find({}, {"_id": 0}).limit(40).to_list(40)
        districts = await db.districts.find({}, {"_id": 0}).to_list(40)
        assets = []
        for i, ms in enumerate(milestones):
            dist = districts[i % len(districts)] if districts else {}
            assets.append({
                "id": str(uuid.uuid4()),
                "asset_id": f"AST-{i+1:04d}",
                "name": f"{ms.get('name', 'Asset')[:60]} — Site",
                "theme_id": ms.get("theme_id"),
                "initiative_id": ms.get("initiative_id"),
                "milestone_id": ms.get("id"),
                "district_id": dist.get("id"),
                "district_name": dist.get("name", "Pune"),
                "taluka": dist.get("region", "—"),
                "latitude": _asset_coords(dist, f"AST-{i + 1:04d}")[0],
                "longitude": _asset_coords(dist, f"AST-{i + 1:04d}")[1],
                "status": ms.get("status", "In Progress"),
                "rag": ms.get("rag", "green"),
                "evidence_status": ms.get("evidence_status", "Pending"),
                "photo_placeholder": f"/uploads/placeholder-asset-{i+1}.jpg",
                "last_updated": _now(),
            })
        if assets:
            await db.assets.insert_many(assets)

    if await db.approvals.count_documents({}) == 0:
        milestones = await db.milestones.find({"rag": {"$in": ["red", "amber"]}}, {"_id": 0}).limit(8).to_list(8)
        approvals = []
        for i, ms in enumerate(milestones):
            wf = APPROVAL_WORKFLOWS[i % len(APPROVAL_WORKFLOWS)]
            stage = APPROVAL_STAGES[min(i + 2, len(APPROVAL_STAGES) - 1)]
            approvals.append({
                "id": str(uuid.uuid4()),
                "code": f"APR-{i+1:04d}",
                "workflow_type": wf,
                "stage": stage,
                "entity_type": "milestone",
                "entity_id": ms.get("id"),
                "entity_name": ms.get("name"),
                "submitted_by": "Department Secretary",
                "submitted_at": _now(),
                "history": [
                    {"stage": "Draft", "by": "Nodal Officer", "at": _now(), "remarks": "Initial submission"},
                    {"stage": "Submitted", "by": "Department Secretary", "at": _now(), "remarks": "Forwarded for review"},
                ],
                "remarks": "Pending review" if stage not in ("Approved", "Rejected") else "",
            })
        if approvals:
            await db.approvals.insert_many(approvals)

    if await db.comments.count_documents({}) == 0:
        ms = await db.milestones.find_one({"rag": "red"}, {"_id": 0})
        if ms:
            await db.comments.insert_many([
                {
                    "id": str(uuid.uuid4()),
                    "entity_type": "milestone",
                    "entity_id": ms["id"],
                    "author": "PMO Analyst",
                    "body": "Please confirm revised timeline for this milestone. @Nodal Officer",
                    "created_at": _now(),
                    "resolved": False,
                    "parent_id": None,
                },
                {
                    "id": str(uuid.uuid4()),
                    "entity_type": "milestone",
                    "entity_id": ms["id"],
                    "author": "Nodal Officer",
                    "body": "Land clearance delayed — expecting resolution in 2 weeks.",
                    "created_at": _now(),
                    "resolved": False,
                    "parent_id": None,
                },
            ])

async def compute_smart_alerts(db) -> List[Dict[str, Any]]:
    """Rule-based smart alerts (F007)."""
    milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
    evidence = await db.evidence.find({}, {"_id": 0}).to_list(500)
    risks = await db.risks.find({}, {"_id": 0}).to_list(500)
    actions = await db.action_items.find({}, {"_id": 0}).to_list(500)
    alerts = []
    today = date.today()
    for ms in milestones:
        pe = _parse_date(ms.get("planned_end_date"))
        if pe:
            days_left = (pe - today).days
            if 0 <= days_left <= 7:
                alerts.append({"type": "milestone_due_7d", "title": "Milestone due in 7 days",
                               "message": ms.get("name"), "rag": "amber", "entity_id": ms.get("id")})
            if days_left < 0 and ms.get("status") not in ("Completed", "Closed"):
                alerts.append({"type": "milestone_overdue", "title": "Milestone overdue",
                               "message": ms.get("name"), "rag": "red", "entity_id": ms.get("id")})
        reasons = compute_watchlist_reasons(ms, evidence, risks, actions)
        if any("30 days" in r for r in reasons):
            alerts.append({"type": "stuck_30d", "title": "Task stuck >30 days",
                           "message": ms.get("name"), "rag": "amber", "entity_id": ms.get("id")})
        if any("Dependency" in r for r in reasons):
            alerts.append({"type": "dependency_blocked", "title": "Dependency blocked",
                           "message": ms.get("name"), "rag": "red", "entity_id": ms.get("id")})
        if any("evidence missing" in r.lower() for r in reasons):
            alerts.append({"type": "evidence_missing", "title": "Evidence missing",
                           "message": ms.get("name"), "rag": "amber", "entity_id": ms.get("id")})
        if ms.get("rag") == "red":
            dr = compute_delay_risk(ms, evidence, risks)
            if dr.get("risk_category") in ("High", "Critical"):
                alerts.append({"type": "high_risk_milestone", "title": "High-risk milestone",
                               "message": f"{ms.get('name')} — {dr['risk_category']} delay risk",
                               "rag": "red", "entity_id": ms.get("id")})
        last_upd = _parse_date(ms.get("last_updated", "")[:10] if ms.get("last_updated") else None)
        if last_upd and _days_between(last_upd, today) > 21:
            alerts.append({"type": "department_update_missing", "title": "Department update not submitted",
                           "message": f"No update for {ms.get('name', '')[:40]}", "rag": "amber",
                           "entity_id": ms.get("id")})
    for e in evidence:
        if e.get("verification_status") == "Rejected":
            alerts.append({"type": "evidence_rejected", "title": "Evidence rejected",
                           "message": e.get("file_name"), "rag": "red", "entity_id": e.get("id")})
        elif e.get("verification_status") == "Pending":
            alerts.append({"type": "evidence_pending", "title": "Evidence pending verification",
                           "message": e.get("file_name"), "rag": "amber", "entity_id": e.get("id")})
    for k in await db.kpis.find({}, {"_id": 0}).to_list(500):
        if compute_kpi_anomaly(k):
            alerts.append({"type": "kpi_anomaly", "title": "KPI update / anomaly",
                           "message": k.get("name"), "rag": "amber", "entity_id": k.get("id")})
        last_upd = _parse_date(k.get("last_updated", "")[:10] if k.get("last_updated") else None)
        if last_upd and _days_between(last_upd, today) > 45:
            alerts.append({"type": "kpi_update_pending", "title": "KPI update pending",
                           "message": k.get("name"), "rag": "amber", "entity_id": k.get("id")})
    for r in risks:
        if r.get("status") == "Escalated":
            alerts.append({"type": "risk_escalated", "title": "Risk escalated",
                           "message": r.get("description", "")[:80], "rag": "red", "entity_id": r.get("id")})
    for a in actions:
        due = _parse_date(a.get("due_date"))
        if a.get("status") == "Open" and due and due < today:
            alerts.append({"type": "review_action_overdue", "title": "Review action overdue",
                           "message": a.get("title", ""), "rag": "red", "entity_id": a.get("id")})
    for b in compute_budget_forecast(await db.budgets.find({}, {"_id": 0}).to_list(100)):
        for w in b.get("warnings", []):
            alerts.append({"type": "budget_warning", "title": "Budget alert",
                           "message": w, "rag": "amber", "entity_id": b.get("id")})
    return alerts[:80]


async def persist_smart_alerts(db, alerts: List[Dict[str, Any]]) -> None:
    """Store computed alerts in smart_alerts collection (F007 data model)."""
    now = _now()
    await db.smart_alerts.delete_many({"source": "rule_engine"})
    if not alerts:
        return
    docs = []
    for a in alerts:
        docs.append({
            **a,
            "id": str(uuid.uuid4()),
            "source": "rule_engine",
            "generated_at": now,
            "acknowledged": False,
        })
    await db.smart_alerts.insert_many(docs)


def build_enhancements_router(db, broadcast_event: Optional[Callable] = None) -> APIRouter:
    router = APIRouter()

    async def _load_core():
        milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
        evidence = await db.evidence.find({}, {"_id": 0}).to_list(500)
        risks = await db.risks.find({}, {"_id": 0}).to_list(500)
        actions = await db.action_items.find({}, {"_id": 0}).to_list(500)
        initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(500)
        return milestones, evidence, risks, actions, initiatives

    @router.get("/public/dashboard")
    async def public_dashboard():
        overview = await db.milestones.find({}, {"_id": 0, "name": 1, "rag": 1, "status": 1,
                                                  "completion_pct": 1, "pillar_id": 1, "theme_id": 1,
                                                  "planned_end_date": 1}).to_list(500)
        pillars = await db.pillars.find({}, {"_id": 0, "id": 1, "name": 1, "code": 1}).to_list(10)
        themes = await db.themes.find({}, {"_id": 0, "id": 1, "name": 1, "pillar_id": 1}).to_list(20)
        districts = await db.districts.find({}, {"_id": 0, "id": 1, "name": 1, "progress_score": 1,
                                                  "rag": 1, "region": 1}).to_list(40)
        completed = [m for m in overview if m.get("status") in ("Completed", "Closed")]
        ongoing = [m for m in overview if m.get("status") not in ("Completed", "Closed")]
        evidence = await db.evidence.find({"verification_status": {"$in": ["Accepted", "Verified"]}}, {"_id": 0, "milestone_id": 1,
                                                                                  "evidence_type": 1}).to_list(200)
        pillar_prog = {}
        for p in pillars:
            p_ms = [m for m in overview if m.get("pillar_id") == p["id"]]
            pillar_prog[p["id"]] = {
                "name": p["name"], "code": p["code"],
                "progress_pct": round(sum(m.get("completion_pct", 0) for m in p_ms) / max(len(p_ms), 1), 1),
                "rag_green": sum(1 for m in p_ms if m.get("rag") == "green"),
                "rag_amber": sum(1 for m in p_ms if m.get("rag") == "amber"),
                "rag_red": sum(1 for m in p_ms if m.get("rag") == "red"),
            }
        theme_prog = {}
        for t in themes:
            t_ms = [m for m in overview if m.get("theme_id") == t["id"]]
            theme_prog[t["id"]] = {
                "name": t["name"],
                "progress_pct": round(sum(m.get("completion_pct", 0) for m in t_ms) / max(len(t_ms), 1), 1),
            }
        return {
            "vision_progress_pct": round(sum(m.get("completion_pct", 0) for m in overview) / max(len(overview), 1), 1),
            "pillars": list(pillar_prog.values()),
            "themes": list(theme_prog.values())[:16],
            "districts": [{"name": d["name"], "region": d.get("region"), "progress_score": d.get("progress_score"),
                           "rag": d.get("rag")} for d in districts],
            "completed_projects": [{"name": m["name"], "completion_pct": m.get("completion_pct")} for m in completed[:8]],
            "ongoing_projects": [{"name": m["name"], "rag": m.get("rag"), "completion_pct": m.get("completion_pct")}
                                 for m in ongoing[:8]],
            "evidence_backed_milestones": len({e["milestone_id"] for e in evidence}),
            "public_rag_summary": {
                "green": sum(1 for m in overview if m.get("rag") == "green"),
                "amber": sum(1 for m in overview if m.get("rag") == "amber"),
                "red": sum(1 for m in overview if m.get("rag") == "red"),
            },
            "generated_at": _now(),
            "disclaimer": "Public transparency view — internal assignees and financial detail excluded.",
        }

    @router.get("/watchlist")
    async def watchlist():
        milestones, evidence, risks, actions, _ = await _load_core()
        items = []
        for ms in milestones:
            reasons = compute_watchlist_reasons(ms, evidence, risks, actions)
            if reasons:
                items.append({
                    "id": ms.get("id"),
                    "code": ms.get("code"),
                    "name": ms.get("name"),
                    "rag": ms.get("rag"),
                    "status": ms.get("status"),
                    "department_id": ms.get("department_id"),
                    "planned_end_date": ms.get("planned_end_date"),
                    "reasons": reasons,
                    "days_stuck": _days_between(_parse_date(ms.get("last_updated", "")[:10] if ms.get("last_updated") else None)),
                    "delay_risk": compute_delay_risk(ms, evidence, risks),
                })
        items.sort(key=lambda x: x["delay_risk"]["delay_risk_score"], reverse=True)
        return {"count": len(items), "items": items, "generated_at": _now()}

    @router.get("/alerts/smart")
    async def smart_alerts(refresh: bool = True):
        if refresh:
            alerts = await compute_smart_alerts(db)
            await persist_smart_alerts(db, alerts)
            generated_at = _now()
        else:
            alerts = await db.smart_alerts.find({"source": "rule_engine"}, {"_id": 0}).to_list(80)
            generated_at = alerts[0].get("generated_at", _now()) if alerts else _now()
        return {"count": len(alerts), "alerts": alerts, "generated_at": generated_at, "persisted": True}

    @router.get("/evidence/sufficiency/{milestone_id}")
    async def evidence_sufficiency(milestone_id: str):
        ms = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
        if not ms:
            raise HTTPException(404, "Milestone not found")
        ev = await db.evidence.find({"milestone_id": milestone_id}, {"_id": 0}).to_list(50)
        return check_evidence_sufficiency(ms, ev)

    @router.post("/evidence/upload")
    async def evidence_upload(
        pillar_id: str = Form(...),
        theme_id: str = Form(...),
        initiative_id: str = Form(...),
        milestone_id: str = Form(...),
        evidence_type: str = Form(...),
        uploaded_by: str = Form("User"),
        remarks: str = Form(""),
        file: Optional[UploadFile] = File(None),
    ):
        file_name = file.filename if file else "metadata-only.pdf"
        file_path = None
        file_size = 0
        mime_type = file.content_type if file else "application/octet-stream"
        if file and file.filename:
            safe_name = f"{uuid.uuid4().hex}_{file.filename}"
            dest = UPLOAD_DIR / safe_name
            content = await file.read()
            dest.write_bytes(content)
            file_path = str(dest.relative_to(Path(__file__).parent))
            file_size = len(content)
        count = await db.evidence.count_documents({})
        doc = {
            "id": str(uuid.uuid4()),
            "code": f"EV-{count+1:04d}",
            "pillar_id": pillar_id,
            "theme_id": theme_id,
            "initiative_id": initiative_id,
            "milestone_id": milestone_id,
            "evidence_type": evidence_type,
            "file_name": file_name,
            "file_path": file_path,
            "file_size": file_size,
            "mime_type": mime_type,
            "uploaded_by": uploaded_by,
            "upload_date": _now(),
            "verification_status": "Pending",
            "verified_by": None,
            "verification_remarks": "",
            "remarks": remarks,
        }
        ms = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
        if ms:
            doc["sufficiency"] = check_evidence_sufficiency(ms, [doc])
        await db.evidence.insert_one(doc)
        doc.pop("_id", None)
        await write_audit(db, "evidence", doc["id"], "created", None, doc["code"], uploaded_by, "create")
        return doc

    @router.get("/audit/{entity_type}/{entity_id}")
    async def get_audit(entity_type: str, entity_id: str):
        logs = await db.audit_logs.find(
            {"entity_type": entity_type, "entity_id": entity_id}, {"_id": 0}
        ).sort("changed_at", -1).to_list(100)
        return logs

    @router.get("/comments")
    async def list_comments(entity_type: str, entity_id: str):
        return await db.comments.find(
            {"entity_type": entity_type, "entity_id": entity_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(200)

    @router.post("/comments")
    async def add_comment(payload: Dict[str, Any]):
        doc = {
            "id": str(uuid.uuid4()),
            "entity_type": payload["entity_type"],
            "entity_id": payload["entity_id"],
            "author": payload.get("author", "User"),
            "body": payload.get("body", ""),
            "created_at": _now(),
            "resolved": payload.get("resolved", False),
            "parent_id": payload.get("parent_id"),
        }
        await db.comments.insert_one(doc)
        doc.pop("_id", None)
        await write_audit(db, "comment", doc["id"], "created", None, doc["body"][:50], doc["author"], "create")
        return doc

    @router.get("/approvals")
    async def list_approvals(stage: Optional[str] = None):
        q = {"stage": stage} if stage else {}
        return await db.approvals.find(q, {"_id": 0}).sort("submitted_at", -1).to_list(100)

    @router.post("/approvals")
    async def create_approval(payload: Dict[str, Any]):
        count = await db.approvals.count_documents({})
        by = payload.get("submitted_by", "Department Secretary")
        doc = {
            "id": str(uuid.uuid4()),
            "code": f"APR-{count + 1:04d}",
            "workflow_type": payload.get("workflow_type", APPROVAL_WORKFLOWS[0]),
            "stage": "Draft",
            "entity_type": payload.get("entity_type", "milestone"),
            "entity_id": payload.get("entity_id", ""),
            "entity_name": payload.get("entity_name", "New submission"),
            "submitted_by": by,
            "submitted_at": _now(),
            "history": [{"stage": "Draft", "by": by, "at": _now(), "remarks": "Workflow created"}],
            "remarks": payload.get("remarks", ""),
        }
        await db.approvals.insert_one(doc)
        doc.pop("_id", None)
        await write_audit(db, "approval", doc["id"], "created", None, doc["code"], by, "create")
        return doc

    @router.put("/approvals/{approval_id}")
    async def update_approval(approval_id: str, payload: Dict[str, Any]):
        appr = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not appr:
            raise HTTPException(404, "Approval not found")
        new_stage = payload.get("stage", appr["stage"])
        history = appr.get("history", [])
        history.append({
            "stage": new_stage,
            "by": payload.get("by", "Reviewer"),
            "at": _now(),
            "remarks": payload.get("remarks", ""),
        })
        await db.approvals.update_one({"id": approval_id}, {"$set": {
            "stage": new_stage, "history": history, "remarks": payload.get("remarks", ""),
        }})
        await write_audit(db, "approval", approval_id, "stage", appr["stage"], new_stage, payload.get("by", "Reviewer"))
        return await db.approvals.find_one({"id": approval_id}, {"_id": 0})

    @router.delete("/approvals/{approval_id}")
    async def delete_approval(approval_id: str, by: Optional[str] = None):
        appr = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not appr:
            raise HTTPException(404, "Approval not found")
        await write_audit(
            db, "approval", approval_id, "deleted", appr.get("code"), None,
            by or "Reviewer", "delete",
        )
        await db.approvals.delete_one({"id": approval_id})
        return {"ok": True, "id": approval_id, "code": appr.get("code")}

    @router.get("/forecast/delay-risk/{milestone_id}")
    async def delay_risk(milestone_id: str):
        ms = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
        if not ms:
            raise HTTPException(404, "Milestone not found")
        evidence = await db.evidence.find({"milestone_id": milestone_id}, {"_id": 0}).to_list(20)
        risks = await db.risks.find({"milestone_id": milestone_id}, {"_id": 0}).to_list(20)
        return compute_delay_risk(ms, evidence, risks)

    @router.get("/rca/{milestone_id}")
    async def rca(milestone_id: str):
        ms = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
        if not ms:
            raise HTTPException(404, "Milestone not found")
        evidence = await db.evidence.find({"milestone_id": milestone_id}, {"_id": 0}).to_list(20)
        risks = await db.risks.find({"milestone_id": milestone_id}, {"_id": 0}).to_list(20)
        return compute_rca(ms, evidence, risks)

    @router.get("/rca/risk/{risk_id}")
    async def rca_for_risk(risk_id: str):
        risk = await db.risks.find_one({"id": risk_id}, {"_id": 0})
        if not risk:
            raise HTTPException(404, "Risk not found")
        ms = None
        evidence: List[Dict] = []
        linked: List[Dict] = [risk]
        if risk.get("milestone_id"):
            ms = await db.milestones.find_one({"id": risk["milestone_id"]}, {"_id": 0})
            if ms:
                evidence = await db.evidence.find({"milestone_id": ms["id"]}, {"_id": 0}).to_list(20)
                linked = await db.risks.find({"milestone_id": ms["id"]}, {"_id": 0}).to_list(20)
        return compute_rca_for_risk(risk, ms, evidence, linked)

    @router.get("/kpis/anomalies")
    async def kpi_anomalies():
        kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
        anomalies = [a for k in kpis if (a := compute_kpi_anomaly(k))]
        return {"count": len(anomalies), "anomalies": anomalies}

    @router.get("/budget/forecast")
    async def budget_forecast():
        budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
        return compute_budget_forecast(budgets)

    @router.post("/simulator/cascade")
    async def cascade_sim(payload: Dict[str, Any]):
        milestone_id = payload.get("milestone_id")
        delay_days = int(payload.get("delay_days", 30))
        milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
        by_id = {m["id"]: m for m in milestones}
        source = by_id.get(milestone_id)
        if not source:
            raise HTTPException(404, "Milestone not found")
        impacted = []
        depts = set()
        for m in milestones:
            if m.get("dependency") == milestone_id or m.get("dependency") == source.get("code"):
                new_rag = "red" if delay_days >= 60 else "amber"
                impacted.append({
                    "id": m["id"], "code": m.get("code"), "name": m.get("name"),
                    "previous_rag": m.get("rag"), "simulated_rag": new_rag,
                    "department_id": m.get("department_id"),
                    "review_action": "Schedule recovery review within 7 days",
                })
                if m.get("department_id"):
                    depts.add(m.get("department_id"))
        return {
            "source": {"id": source["id"], "name": source["name"], "delay_days": delay_days},
            "impacted_count": len(impacted),
            "impacted": impacted,
            "departments_affected": list(depts),
        }

    @router.post("/simulator/scenario")
    async def scenario_sim(payload: Dict[str, Any]):
        scenario = payload.get("scenario", "budget_cut_10")
        milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
        turning_amber = []
        turning_red = []
        budget_gap = 0
        depts = set()
        if scenario.startswith("budget_cut"):
            pct = 0.10 if "10" in scenario else 0.15
            budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
            budget_gap = sum(_budget_amounts(b)["allocated"] * pct for b in budgets)
            for m in milestones:
                if m.get("rag") == "green" and (m.get("budget_utilized_pct") or 0) > 60:
                    turning_amber.append(m["name"])
                    depts.add(m.get("department_id"))
        elif "monsoon" in scenario:
            for m in milestones:
                if any(x in (m.get("name") or "").lower() for x in ("road", "irrigation", "water", "agri")):
                    turning_red.append(m["name"])
                    depts.add(m.get("department_id"))
        elif "vendor" in scenario or "approval" in scenario:
            for m in milestones:
                if m.get("rag") in ("amber", "red"):
                    turning_amber.append(m["name"])
        return {
            "scenario": scenario,
            "milestones_turning_amber": turning_amber[:15],
            "milestones_turning_red": turning_red[:15],
            "budget_gap_cr": round(budget_gap, 2),
            "departments_affected": list(depts)[:10],
            "mitigation": [
                "Re-prioritize critical path milestones",
                "Activate fast-track approval cell",
                "Re-phase budget releases by quarter",
            ],
        }

    async def _build_meeting_pack(pack_type: str) -> Dict[str, Any]:
        milestones, evidence, risks, actions, _ = await _load_core()
        watch = [m for m in milestones if compute_watchlist_reasons(m, evidence, risks, actions)]
        red_amber = [m for m in milestones if m.get("rag") in ("red", "amber")]
        red_amber.sort(key=lambda x: x.get("completion_pct", 0))
        budgets = compute_budget_forecast(await db.budgets.find({}, {"_id": 0}).to_list(100))
        verified = await db.evidence.count_documents({"verification_status": {"$in": ["Accepted", "Verified"]}})
        total_ev = await db.evidence.count_documents({})
        dept_rank = await db.departments.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(20)
        return {
            "pack_type": pack_type.replace("-", " ").title(),
            "generated_at": _now(),
            "agenda": [
                "Vision 2047 progress review",
                "Red/Amber milestone recovery",
                "Risk escalation decisions",
                "Evidence compliance status",
                "Budget utilization and re-phasing",
            ],
            "last_meeting_decisions": (await db.reviews.find_one({}, {"_id": 0, "decisions_taken": 1}) or {}).get("decisions_taken", "—"),
            "pending_action_items": [a for a in actions if a.get("status") == "Open"][:10],
            "red_amber_milestones": red_amber[:12],
            "top_delayed": sorted(
                [m for m in milestones if m.get("rag") == "red"],
                key=lambda x: x.get("planned_end_date") or "",
            )[:8],
            "top_risks": sorted(risks, key=lambda x: x.get("risk_score", 0), reverse=True)[:8],
            "kpi_summary": {"total": await db.kpis.count_documents({}), "green": await db.kpis.count_documents({"health": "green"})},
            "budget_summary": {"avg_utilization": round(sum(b["utilization_pct"] for b in budgets) / max(len(budgets), 1), 1)},
            "evidence_compliance_pct": round(verified / max(total_ev, 1) * 100, 1),
            "department_performance": [{"name": d["name"]} for d in dept_rank[:9]],
            "watchlist_count": len(watch),
            "suggested_decisions": [
                "Approve recovery plans for top 5 red milestones",
                "Direct evidence upload sprint for completed milestones",
                "Escalate budget release for underutilized themes",
            ],
            "minutes_template": f"Meeting: {pack_type}\nDate: {date.today().isoformat()}\nAttendees: [To be filled]\nDecisions:\n1.\n2.\nAction items:\n1.\n",
        }

    def _format_meeting_pack_text(pack: Dict[str, Any]) -> str:
        lines = [
            pack.get("pack_type", "Meeting Pack"),
            f"Generated: {pack.get('generated_at', '')}",
            "",
            "AGENDA",
        ]
        for i, item in enumerate(pack.get("agenda") or [], 1):
            lines.append(f"{i}. {item}")
        lines.extend([
            "",
            "LAST MEETING DECISIONS",
            str(pack.get("last_meeting_decisions") or "—"),
            "",
            "PENDING ACTION ITEMS",
        ])
        for a in pack.get("pending_action_items") or []:
            lines.append(f"- {a.get('title') or a.get('code') or json.dumps(a, default=str)[:80]}")
        lines.extend(["", "RED / AMBER MILESTONES"])
        for m in pack.get("red_amber_milestones") or []:
            lines.append(f"- {m.get('name')} ({m.get('rag')})")
        lines.extend(["", "TOP DELAYED MILESTONES"])
        for m in pack.get("top_delayed") or []:
            lines.append(f"- {m.get('name')}")
        lines.extend(["", "TOP RISKS"])
        for r in pack.get("top_risks") or []:
            desc = (r.get("description") or r.get("code") or "")[:80]
            lines.append(f"- {desc} (score {r.get('risk_score')})")
        kpi = pack.get("kpi_summary") or {}
        budget = pack.get("budget_summary") or {}
        lines.extend([
            "",
            "KPI SUMMARY",
            f"Total KPIs: {kpi.get('total', '—')} | Green: {kpi.get('green', '—')}",
            "",
            "BUDGET SUMMARY",
            f"Avg utilization: {budget.get('avg_utilization', '—')}%",
            "",
            "EVIDENCE COMPLIANCE",
            f"{pack.get('evidence_compliance_pct', '—')}%",
            "",
            "DEPARTMENT PERFORMANCE",
        ])
        for d in pack.get("department_performance") or []:
            lines.append(f"- {d.get('name')}")
        lines.extend(["", "SUGGESTED DECISIONS"])
        for i, d in enumerate(pack.get("suggested_decisions") or [], 1):
            lines.append(f"{i}. {d}")
        lines.extend(["", "MINUTES TEMPLATE", pack.get("minutes_template") or ""])
        return "\n".join(lines)

    @router.get("/meeting-packs/{pack_type}")
    async def meeting_pack(pack_type: str):
        return await _build_meeting_pack(pack_type)

    @router.get("/meeting-packs/{pack_type}/export")
    async def export_meeting_pack(pack_type: str, format: str = "txt"):
        pack = await _build_meeting_pack(pack_type)
        text = _format_meeting_pack_text(pack)
        safe_name = pack_type.replace(" ", "_")
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        if format == "txt":
            return Response(
                content=text,
                media_type="text/plain; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="{safe_name}_{ts}.txt"'},
            )
        if format == "pdf":
            pack_title = pack.get("pack_type", "Meeting Pack")
            pdf_content = _minimal_pdf(
                _branded_pdf_prose(pack_title, text),
                doc_title=f"Meeting Pack — {pack_title}",
            )
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{safe_name}_{ts}.pdf"'},
            )
        raise HTTPException(400, "format must be txt or pdf")

    @router.get("/assets")
    async def list_assets(district_id: Optional[str] = None):
        q = {"district_id": district_id} if district_id else {}
        assets = await db.assets.find(q, {"_id": 0}).to_list(200)
        return [_align_asset_geo(a) for a in assets]

    @router.get("/assets/{asset_id}")
    async def get_asset(asset_id: str):
        a = await db.assets.find_one({"id": asset_id}, {"_id": 0})
        if not a:
            a = await db.assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if not a:
            raise HTTPException(404, "Asset not found")
        return _align_asset_geo(a)

    @router.post("/assets")
    async def create_asset(payload: Dict[str, Any]):
        count = await db.assets.count_documents({})
        district = None
        if payload.get("district_id"):
            district = await db.districts.find_one({"id": payload["district_id"]}, {"_id": 0})
        doc = {
            "id": str(uuid.uuid4()),
            "asset_id": payload.get("asset_id") or f"AST-{count + 1:04d}",
            "name": payload.get("name", "New asset"),
            "theme_id": payload.get("theme_id"),
            "initiative_id": payload.get("initiative_id"),
            "milestone_id": payload.get("milestone_id"),
            "district_id": payload.get("district_id"),
            "district_name": district.get("name") if district else payload.get("district_name", "—"),
            "taluka": payload.get("taluka") or (district.get("region") if district else "—"),
            "latitude": _asset_coords(
                district,
                payload.get("asset_id") or f"AST-{count + 1:04d}",
                payload.get("latitude"),
                payload.get("longitude"),
            )[0],
            "longitude": _asset_coords(
                district,
                payload.get("asset_id") or f"AST-{count + 1:04d}",
                payload.get("latitude"),
                payload.get("longitude"),
            )[1],
            "status": payload.get("status", "In Progress"),
            "rag": payload.get("rag", "green"),
            "evidence_status": payload.get("evidence_status", "Pending"),
            "photo_placeholder": payload.get("photo_placeholder", ""),
            "last_updated": _now(),
        }
        await db.assets.insert_one(doc)
        doc.pop("_id", None)
        await write_audit(db, "asset", doc["id"], "created", None, doc["asset_id"], payload.get("by", "User"), "create")
        return _align_asset_geo(doc)

    @router.put("/assets/{asset_id}")
    async def update_asset(asset_id: str, payload: Dict[str, Any]):
        old = await db.assets.find_one({"id": asset_id}, {"_id": 0})
        if not old:
            old = await db.assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if not old:
            raise HTTPException(404, "Asset not found")
        updates = {k: v for k, v in payload.items() if k not in ("id", "asset_id", "by") and v is not None}
        if payload.get("district_id") and payload["district_id"] != old.get("district_id"):
            district = await db.districts.find_one({"id": payload["district_id"]}, {"_id": 0})
            if district:
                updates["district_name"] = district.get("name")
        updates["last_updated"] = _now()
        await db.assets.update_one({"id": old["id"]}, {"$set": updates})
        new = await db.assets.find_one({"id": old["id"]}, {"_id": 0})
        await audit_entity_update(db, "asset", old["id"], old, new, payload.get("by", "User"))
        return _align_asset_geo(new)

    @router.delete("/assets/{asset_id}")
    async def delete_asset(asset_id: str, by: Optional[str] = None):
        old = await db.assets.find_one({"id": asset_id}, {"_id": 0})
        if not old:
            old = await db.assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if not old:
            raise HTTPException(404, "Asset not found")
        await write_audit(
            db, "asset", old["id"], "deleted", old.get("asset_id"), None,
            by or "User", "delete",
        )
        await db.assets.delete_one({"id": old["id"]})
        return {"ok": True, "id": old["id"], "asset_id": old.get("asset_id")}

    @router.get("/districts/benchmark")
    async def district_benchmark():
        districts = await db.districts.find({}, {"_id": 0}).to_list(40)
        scored = sorted(districts, key=lambda d: d.get("progress_score", 0), reverse=True)
        avg = sum(d.get("progress_score", 0) for d in districts) / max(len(districts), 1)
        for d in scored:
            d["district_score"] = d.get("progress_score", 0)
            d["vs_state_avg"] = round(d.get("progress_score", 0) - avg, 1)
            d["peer_group"] = "High performer" if d.get("progress_score", 0) >= avg + 5 else (
                "Needs intervention" if d.get("progress_score", 0) < avg - 5 else "Mid-tier"
            )
        return {
            "state_average": round(avg, 1),
            "top_performers": scored[:5],
            "underperformers": scored[-5:][::-1],
            "all_districts": scored,
        }

    @router.get("/officers")
    async def list_officers():
        officers = await db.officers.find({"active": True}, {"_id": 0}).to_list(50)
        milestones, evidence, risks, actions, initiatives = await _load_core()
        enriched = []
        for o in officers:
            dept_id = o.get("department_id")
            metrics = _officer_accountability_metrics(
                dept_id, milestones, evidence, risks, actions, initiatives,
            )
            enriched.append({
                **o,
                "milestones_owned": metrics["milestones_owned"],
                "overdue_actions": metrics["overdue_actions"],
                "open_risks": metrics["open_risks"],
                "evidence_pending": metrics["evidence_pending"],
                "avg_delay_days": metrics["avg_delay_days"],
                "handover_status": "Active",
            })
        return enriched

    @router.get("/officers/{officer_id}")
    async def get_officer(officer_id: str):
        officer = await db.officers.find_one({"id": officer_id, "active": True}, {"_id": 0})
        if not officer:
            raise HTTPException(404, "Officer not found")
        milestones, evidence, risks, actions, initiatives = await _load_core()
        dept_id = officer.get("department_id")
        metrics = _officer_accountability_metrics(
            dept_id, milestones, evidence, risks, actions, initiatives,
        )
        department = await db.departments.find_one({"id": dept_id}, {"_id": 0})
        themes = await db.themes.find({"owner_department_id": dept_id}, {"_id": 0}).to_list(20)
        return {
            **officer,
            "milestones_owned": metrics["milestones_owned"],
            "overdue_actions": metrics["overdue_actions"],
            "open_risks": metrics["open_risks"],
            "evidence_pending": metrics["evidence_pending"],
            "avg_delay_days": metrics["avg_delay_days"],
            "handover_status": "Active",
            "department": department,
            "themes_owned": len(themes),
            "themes": themes,
            "initiatives": metrics["_initiatives"][:12],
            "milestones": metrics["_milestones"][:20],
            "risks": metrics["_open_risks"][:15],
            "evidence": metrics["_evidence_pending"][:15],
            "action_items": metrics["_overdue_actions"][:15],
        }

    @router.get("/transfers")
    async def list_transfers():
        return await db.transfers.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)

    @router.post("/transfers")
    async def create_transfer(payload: Dict[str, Any]):
        doc = {
            "id": str(uuid.uuid4()),
            "outgoing_officer_id": payload["outgoing_officer_id"],
            "successor_officer_id": payload["successor_officer_id"],
            "pending_tasks": payload.get("pending_tasks", []),
            "pending_risks": payload.get("pending_risks", []),
            "checklist": payload.get("checklist", [
                "Brief successor on red milestones",
                "Transfer evidence upload responsibilities",
                "Close or reassign open review actions",
            ]),
            "status": "In Progress",
            "created_at": _now(),
            "completed_at": None,
        }
        await db.transfers.insert_one(doc)
        doc.pop("_id", None)
        await write_audit(
            db, "transfer", doc["id"], "created", None, doc["id"][:8],
            payload.get("by", "HR Admin"), "create",
        )
        return doc

    @router.put("/transfers/{transfer_id}/complete")
    async def complete_transfer(transfer_id: str, payload: Dict[str, Any] = None):
        payload = payload or {}
        old = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
        if not old:
            raise HTTPException(404, "Transfer not found")
        await db.transfers.update_one({"id": transfer_id}, {"$set": {"status": "Complete", "completed_at": _now()}})
        await write_audit(
            db, "transfer", transfer_id, "status", old.get("status"), "Complete",
            payload.get("by", "HR Admin"), "update",
        )
        return await db.transfers.find_one({"id": transfer_id}, {"_id": 0})

    @router.get("/recognition/leaderboard")
    async def recognition_leaderboard():
        depts = await db.departments.find({}, {"_id": 0}).to_list(30)
        milestones = await db.milestones.find({}, {"_id": 0}).to_list(500)
        evidence = await db.evidence.find({}, {"_id": 0}).to_list(500)
        actions = await db.action_items.find({}, {"_id": 0}).to_list(500)
        board = []
        for d in depts:
            d_ms = [m for m in milestones if m.get("department_id") == d["id"]]
            on_time = sum(1 for m in d_ms if m.get("rag") == "green")
            board.append({
                "department_id": d["id"],
                "department_name": d["name"],
                "completion_rate": round(on_time / max(len(d_ms), 1) * 100, 1),
                "on_time_rate": round(on_time / max(len(d_ms), 1) * 100, 1),
                "evidence_compliance": round(
                    len([e for e in evidence if e.get("verification_status") in ("Accepted", "Verified")]) / max(len(evidence), 1) * 100, 1
                ),
                "review_closure_rate": round(
                    len([a for a in actions if a.get("status") == "Closed"]) / max(len(actions), 1) * 100, 1
                ),
                "score": round(on_time / max(len(d_ms), 1) * 100, 1),
            })
        board.sort(key=lambda x: x["score"], reverse=True)
        return {
            "top_departments": board[:5],
            "needs_intervention": board[-3:][::-1],
            "recognition_notes": [
                f"Commend {board[0]['department_name']} for highest on-time delivery" if board else "",
                "Issue improvement directions to bottom quartile departments",
            ],
            "generated_at": _now(),
        }

    async def _report_rows(slug: str) -> List[List[Any]]:
        header = ["Viksit Maharashtra 2047", REPORT_SLUGS.get(slug, slug), f"Generated: {_now()}"]
        rows = [header, []]
        ms_all = await db.milestones.find({}, {"_id": 0}).to_list(500)
        if slug in ("executive-summary", "cm-review-note", "cs-review-note"):
            rows += [["Metric", "Value"], ["Total Milestones", len(ms_all)],
                     ["Red", sum(1 for m in ms_all if m.get("rag") == "red")],
                     ["Amber", sum(1 for m in ms_all if m.get("rag") == "amber")],
                     ["Green", sum(1 for m in ms_all if m.get("rag") == "green")],
                     ["Vision Progress %", round(sum(m.get("completion_pct", 0) for m in ms_all) / max(len(ms_all), 1), 1)]]
            if slug in ("cm-review-note", "cs-review-note"):
                rows.append([])
                rows.append(["Red/Amber Milestones", "RAG", "Completion %"])
                for m in [x for x in ms_all if x.get("rag") in ("red", "amber")][:20]:
                    rows.append([m.get("name"), m.get("rag"), m.get("completion_pct")])
        elif slug == "pillar-progress":
            pillars = await db.pillars.find({}, {"_id": 0}).to_list(10)
            rows.append(["Pillar", "Code", "Milestones", "Avg Completion %", "Red", "Amber", "Green"])
            for p in pillars:
                p_ms = [m for m in ms_all if m.get("pillar_id") == p["id"]]
                avg = round(sum(m.get("completion_pct", 0) for m in p_ms) / max(len(p_ms), 1), 1)
                rows.append([p.get("name"), p.get("code"), len(p_ms), avg,
                             sum(1 for m in p_ms if m.get("rag") == "red"),
                             sum(1 for m in p_ms if m.get("rag") == "amber"),
                             sum(1 for m in p_ms if m.get("rag") == "green")])
        elif slug == "theme-progress":
            themes = await db.themes.find({}, {"_id": 0}).to_list(20)
            rows.append(["Theme", "Code", "Milestones", "Completion %", "RAG"])
            for t in themes:
                t_ms = [m for m in ms_all if m.get("theme_id") == t["id"]]
                avg = round(sum(m.get("completion_pct", 0) for m in t_ms) / max(len(t_ms), 1), 1)
                rag = "red" if avg < 40 else "amber" if avg < 65 else "green"
                rows.append([t.get("name"), t.get("code"), len(t_ms), avg, rag])
        elif slug == "department-performance":
            depts = await db.departments.find({}, {"_id": 0}).to_list(50)
            rows.append(["Department", "Milestones", "Completion %", "Delayed", "RAG"])
            for d in depts:
                d_ms = [m for m in ms_all if m.get("department_id") == d["id"]]
                avg = round(sum(m.get("completion_pct", 0) for m in d_ms) / max(len(d_ms), 1), 1)
                delayed = len([m for m in d_ms if m.get("status") in ("Delayed", "At Risk", "Blocked")])
                rag = "green" if avg >= 65 else "amber" if avg >= 40 else "red"
                rows.append([d.get("name"), len(d_ms), avg, delayed, rag])
        elif slug == "delayed-milestones":
            ms = [m for m in ms_all if m.get("rag") == "red" or m.get("status") in ("Delayed", "At Risk")]
            rows.append(["Code", "Name", "Status", "RAG", "Planned End", "Completion %"])
            for m in ms:
                rows.append([m.get("code"), m.get("name"), m.get("status"), m.get("rag"),
                             m.get("planned_end_date"), m.get("completion_pct")])
        elif slug == "risk-escalation":
            risks = await db.risks.find({}, {"_id": 0}).to_list(500)
            rows.append(["Code", "Type", "Score", "Status", "Escalation", "Description"])
            for r in sorted(risks, key=lambda x: x.get("risk_score", 0), reverse=True)[:50]:
                rows.append([r.get("code"), r.get("risk_type"), r.get("risk_score"), r.get("status"),
                             r.get("escalation_level"), (r.get("description") or "")[:80]])
        elif slug == "district-progress":
            dists = await db.districts.find({}, {"_id": 0}).to_list(40)
            rows.append(["District", "Region", "Progress", "RAG"])
            for d in dists:
                rows.append([d.get("name"), d.get("region"), d.get("progress_score"), d.get("rag")])
        elif slug == "evidence-compliance":
            ev = await db.evidence.find({}, {"_id": 0}).to_list(500)
            rows.append(["Code", "Type", "Milestone", "Status", "Uploaded By"])
            for e in ev:
                rows.append([e.get("code"), e.get("evidence_type"), e.get("milestone_id"),
                             e.get("verification_status"), e.get("uploaded_by")])
        elif slug == "budget-utilization":
            budgets = await db.budgets.find({}, {"_id": 0}).to_list(100)
            rows.append(["Code", "Allocated (Cr)", "Utilized (Cr)", "Util %", "Funding Gap"])
            for b in budgets:
                am = _budget_amounts(b)
                util_pct = round(am["utilized"] / max(am["allocated"], 1) * 100, 1)
                rows.append([b.get("code"), am["allocated"], am["utilized"], util_pct, b.get("funding_gap", 0)])
        elif slug == "agriculture-mission":
            try:
                from agriculture import build_agri_copilot_context
                ctx = await build_agri_copilot_context(db)
                rows.append(["Section", "Summary"])
                rows.append(["Agriculture Mission", str(ctx)[:800]])
            except Exception:
                rows.append(["Note", "Agriculture data available via /api/agriculture/overview"])
        else:
            pillars = await db.pillars.find({}, {"_id": 0}).to_list(10)
            rows.append(["Pillar", "Code"])
            for p in pillars:
                rows.append([p.get("name"), p.get("code")])
        return rows

    async def _agri_report_rows(dataset: str, rag_filter: Optional[List[str]] = None) -> List[List[Any]]:
        title = AGRI_REPORT_DATASETS.get(dataset, dataset)
        header = ["Viksit Maharashtra 2047 — Agriculture Mission", title, f"Generated: {_now()}"]
        rows: List[List[Any]] = [header, []]
        subtasks = await db.agri_subtasks.find({}, {"_id": 0}).to_list(5000)

        if dataset in ("agri-overview", "agri-cm-review"):
            total = len(subtasks)
            completed = len([r for r in subtasks if r.get("status") == "Completed"])
            delayed = len([r for r in subtasks if r.get("status") in ("Delayed", "At Risk", "Blocked")])
            blocked = len([r for r in subtasks if r.get("status") == "Blocked"])
            rag_count: Dict[str, int] = {"green": 0, "amber": 0, "red": 0, "blue": 0, "grey": 0}
            for r in subtasks:
                rag_count[r.get("rag", "grey")] = rag_count.get(r.get("rag", "grey"), 0) + 1
            milestones = set(r.get("milestone_no") for r in subtasks if r.get("milestone_no"))
            tasks = set(r.get("task_no") for r in subtasks if r.get("task_no"))
            depts = set(r.get("responsible_department") for r in subtasks if r.get("responsible_department"))
            ps = [r.get("planned_start") for r in subtasks if r.get("planned_start")]
            pe = [r.get("planned_end") for r in subtasks if r.get("planned_end")]
            rows += [
                ["Metric", "Value"],
                ["Initiative", "Build integrated value chains for 10-15 high-value crops (1.1)"],
                ["Total Sub-tasks", total],
                ["Total Tasks", len(tasks)],
                ["Total Milestones", len(milestones)],
                ["Departments", len(depts)],
                ["Completion %", round((completed / max(total, 1)) * 100, 1)],
                ["Completed", completed],
                ["Delayed", delayed],
                ["Blocked", blocked],
                ["RAG Green", rag_count.get("green", 0)],
                ["RAG Amber", rag_count.get("amber", 0)],
                ["RAG Red", rag_count.get("red", 0)],
                ["Timeline Start", min(ps) if ps else "—"],
                ["Timeline End", max(pe) if pe else "—"],
            ]
            if dataset == "agri-cm-review":
                rows.append([])
                rows.append(["Red/Amber Milestones", "Completion %", "RAG"])
                bucket: Dict[str, Dict[str, Any]] = {}
                for r in subtasks:
                    mn = r.get("milestone_no")
                    if not mn:
                        continue
                    b = bucket.setdefault(mn, {"name": r.get("milestone", mn), "total": 0, "done": 0, "rag": "grey"})
                    b["total"] += 1
                    if r.get("status") == "Completed":
                        b["done"] += 1
                    if r.get("rag") == "red":
                        b["rag"] = "red"
                    elif r.get("rag") == "amber" and b["rag"] != "red":
                        b["rag"] = "amber"
                for mn, b in sorted(bucket.items()):
                    if b["rag"] not in ("red", "amber"):
                        continue
                    pct = round(b["done"] / max(b["total"], 1) * 100, 1)
                    rows.append([b["name"][:80], pct, b["rag"]])
            return rows

        if dataset == "agri-milestones":
            bucket: Dict[str, Dict[str, Any]] = {}
            for r in subtasks:
                mn = r.get("milestone_no")
                if not mn:
                    continue
                b = bucket.setdefault(mn, {
                    "milestone": r.get("milestone", ""), "type": r.get("type", ""),
                    "subtasks": [], "tasks": set(), "departments": set(),
                    "planned_end": r.get("planned_end"),
                })
                b["subtasks"].append(r)
                b["tasks"].add(r.get("task_no"))
                if r.get("responsible_department"):
                    b["departments"].add(r["responsible_department"])
            rows.append(["Milestone No", "Milestone", "Type", "Sub-tasks", "Tasks", "Depts", "Planned End", "Completion %", "Avg FV", "Delayed", "Blocked", "RAG"])
            for mn in sorted(bucket.keys()):
                b = bucket[mn]
                sts = b["subtasks"]
                total = len(sts)
                completed = len([s for s in sts if s.get("status") == "Completed"])
                delayed = len([s for s in sts if s.get("status") in ("Delayed", "At Risk")])
                blocked = len([s for s in sts if s.get("status") == "Blocked"])
                avg_fv = round(sum((s.get("finish_variance_days") or 0) for s in sts) / max(1, total), 2)
                completion = round((completed / max(1, total)) * 100, 1)
                rag_counts = {"green": 0, "amber": 0, "red": 0, "blue": 0, "grey": 0}
                for s in sts:
                    rag_counts[s.get("rag", "grey")] = rag_counts.get(s.get("rag", "grey"), 0) + 1
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
                rows.append([mn, b["milestone"], b["type"], total, len(b["tasks"]), len(b["departments"]),
                             b["planned_end"], completion, avg_fv, delayed, blocked, m_rag])
            return rows

        if dataset == "agri-departments":
            dept_bucket: Dict[str, List[Dict]] = {}
            for r in subtasks:
                dn = r.get("responsible_department")
                if dn:
                    dept_bucket.setdefault(dn, []).append(r)
            rows.append(["Department", "Sub-tasks", "Tasks", "Milestones", "Completed", "In Progress", "Delayed", "Blocked", "Upcoming 30d", "Avg FV", "Evidence Pending", "Completion %", "RAG"])
            today = date.today()
            for dn, sts in sorted(dept_bucket.items(), key=lambda x: -len(x[1])):
                total = len(sts)
                completed = len([s for s in sts if s.get("status") == "Completed"])
                in_progress = len([s for s in sts if s.get("status") == "In Progress"])
                delayed = len([s for s in sts if s.get("status") in ("Delayed", "At Risk")])
                blocked = len([s for s in sts if s.get("status") == "Blocked"])
                upcoming = sum(
                    1 for s in sts
                    if s.get("status") == "Not Started" and _parse_date(s.get("planned_start"))
                    and 0 <= (_parse_date(s.get("planned_start")) - today).days <= 30
                )
                avg_fv = round(sum((s.get("finish_variance_days") or 0) for s in sts) / max(1, total), 2)
                evidence_pending = len([s for s in sts if s.get("evidence_status") in (None, "Pending")])
                completion = round((completed / max(1, total)) * 100, 1)
                tasks = len(set(s.get("task_no") for s in sts if s.get("task_no")))
                milestones = len(set(s.get("milestone_no") for s in sts if s.get("milestone_no")))
                if completion >= 70:
                    rag = "green"
                elif completion >= 40:
                    rag = "amber"
                elif delayed > 0 or blocked > 0:
                    rag = "red"
                else:
                    rag = "grey"
                rows.append([dn, total, tasks, milestones, completed, in_progress, delayed, blocked,
                             upcoming, avg_fv, evidence_pending, completion, rag])
            return rows

        if dataset == "agri-subtasks":
            filtered = subtasks
            if rag_filter:
                filtered = [s for s in subtasks if s.get("rag") in rag_filter]
            rows.append(["Sub-task No", "Sub-task", "Milestone No", "Department", "Owner", "Dependency",
                         "Planned End", "Actual End", "FV (d)", "Status", "RAG", "Evidence"])
            for s in filtered[:500]:
                rows.append([
                    s.get("subtask_no"), s.get("subtask"), s.get("milestone_no"), s.get("responsible_department"),
                    s.get("subtask_owner") or s.get("task_owner"), s.get("dependency"),
                    s.get("planned_end"), s.get("actual_end") or "", s.get("finish_variance_days"),
                    s.get("status"), s.get("rag"), s.get("evidence_status"),
                ])
            return rows

        if dataset == "agri-dependencies":
            by_no = {r["subtask_no"]: r for r in subtasks if r.get("subtask_no")}
            critical = []
            for r in subtasks:
                dep = r.get("dependency")
                if not dep or str(dep).strip() in ("-", "", "None"):
                    continue
                for d in str(dep).split(","):
                    d = d.strip()
                    pred = by_no.get(d)
                    if pred and pred.get("rag") in ("red", "amber") and r.get("status") != "Completed":
                        critical.append({
                            "from_no": d, "from_subtask": pred.get("subtask", "")[:60],
                            "from_status": pred.get("status"), "from_rag": pred.get("rag"),
                            "to_no": r["subtask_no"], "to_subtask": r.get("subtask", "")[:60],
                            "to_status": r.get("status"), "to_rag": r.get("rag"),
                        })
            rows.append(["From No", "From Subtask", "From Status", "From RAG", "To No", "To Subtask", "To Status", "To RAG"])
            for e in critical[:200]:
                rows.append([e["from_no"], e["from_subtask"], e["from_status"], e["from_rag"],
                             e["to_no"], e["to_subtask"], e["to_status"], e["to_rag"]])
            return rows

        raise HTTPException(404, f"Unknown agriculture report dataset: {dataset}")

    @router.get("/reports/{slug}/export")
    async def export_report(slug: str, format: str = "csv"):
        if slug not in REPORT_SLUGS and slug not in ("executive-summary",):
            slug = "executive-summary" if slug not in REPORT_SLUGS else slug
        slug = slug if slug in REPORT_SLUGS else "executive-summary"
        rows = await _report_rows(slug)
        title = REPORT_SLUGS[slug]
        return _make_export_response(rows, title, format)

    @router.get("/reports/agri/{dataset}/export")
    async def export_agri_report(dataset: str, format: str = "csv", rag: Optional[str] = None):
        if dataset not in AGRI_REPORT_DATASETS:
            raise HTTPException(404, f"Unknown agriculture report dataset: {dataset}")
        rag_filter = [x.strip() for x in rag.split(",") if x.strip()] if rag else None
        if dataset == "agri-subtasks" and not rag_filter:
            rag_filter = ["red", "amber"]
        rows = await _agri_report_rows(dataset, rag_filter)
        return _make_export_response(rows, AGRI_REPORT_DATASETS[dataset], format)

    return router


def _branded_pdf_header(title: str, subtitle: str = "") -> List[str]:
    ts = _now()[:19].replace("T", " ")
    return [
        "VIKSIT MAHARASHTRA 2047",
        "Government of Maharashtra",
        "Integrated Monitoring Platform",
        "",
        title,
        subtitle or "Official monitoring & reporting document",
        f"Generated: {ts} IST",
        "",
    ]


def _branded_pdf_prose(title: str, body: str) -> str:
    lines = _branded_pdf_header(title, "Executive briefing pack")
    lines.extend(["—" * 36, ""])
    lines.extend(body.split("\n"))
    lines.extend(["", "—" * 36, "Confidential — For official use only", "Viksit Maharashtra 2047 PMO"])
    return "\n".join(lines)


def _branded_pdf_table(title: str, rows: List[List[Any]]) -> str:
    data_rows = rows[2:] if len(rows) > 2 else rows
    lines = _branded_pdf_header(title, f"{max(len(data_rows), 0)} data rows")
    lines.extend(["—" * 36, ""])
    if rows:
        lines.append(" | ".join(str(c) for c in rows[0]))
        if len(rows) > 1:
            lines.append(" | ".join(str(c) for c in rows[1]))
        lines.append("")
    for row in data_rows:
        lines.append(" | ".join(str(c) for c in row))
    lines.extend(["", "—" * 36, "Confidential — For official use only", "Viksit Maharashtra 2047 PMO"])
    return "\n".join(lines)


def _make_export_response(rows: List[List[Any]], title: str, fmt: str) -> Response:
    safe_title = title.replace(" ", "_")
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    if fmt == "csv":
        buf = io.StringIO()
        for row in rows:
            buf.write(",".join(f'"{str(c).replace(chr(34), chr(34)+chr(34))}"' for c in row) + "\n")
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_{ts}.csv"'},
        )
    if fmt == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Report"
        for row in rows:
            ws.append([str(c) if c is not None else "" for c in row])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_{ts}.xlsx"'},
        )
    if fmt == "pdf":
        pdf_content = _minimal_pdf(_branded_pdf_table(title, rows), doc_title=title)
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_{ts}.pdf"'},
        )
    raise HTTPException(400, "format must be csv, xlsx, or pdf")


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _pdf_letterhead_ops() -> List[str]:
    """Vector CM/Government letterhead seal block (page 1 header)."""
    cm_office = _pdf_escape("Office of the Hon. Chief Minister")
    mantralaya = _pdf_escape("Mantralaya, Mumbai | Government of Maharashtra")
    return [
        "q",
        "0.92 0.35 0.05 rg",
        "498 738 74 74 re f",
        "0.72 0.22 0.05 RG", "2 w", "498 738 74 74 re S",
        "1 1 1 rg", "505 788 8 8 re f", "553 788 8 8 re f",
        "505 754 8 8 re f", "553 754 8 8 re f",
        "Q",
        "BT", "/F2 20 Tf", "512 768 Td", "(MH) Tj", "ET",
        "BT", "/F1 7 Tf", "505 748 Td", "(GoM) Tj", "ET",
        "BT", "/F1 8 Tf", "50 752 Td", f"({cm_office}) Tj",
        "0 -10 Td", f"({mantralaya}) Tj", "ET",
    ]


def _minimal_pdf(text: str, doc_title: str = "Viksit Maharashtra 2047 Report") -> bytes:
    """Generate a multi-page PDF with branded header block and page footers."""
    raw_lines = text.split("\n")
    lines_per_page = 46
    pages: List[List[str]] = []
    for i in range(0, max(len(raw_lines), 1), lines_per_page):
        pages.append(raw_lines[i:i + lines_per_page])
    if not pages:
        pages = [[]]

    page_streams: List[bytes] = []
    total = len(pages)
    for page_idx, page_lines in enumerate(pages):
        y = 710.0 if page_idx == 0 else 750.0
        ops: List[str] = []
        if page_idx == 0:
            ops.extend(_pdf_letterhead_ops())
            ops.extend(["0.85 0.33 0.10 RG", "2 w", "50 728 m 562 728 l S", "0 0 0 RG", "1 w"])
        ops.append("BT")
        ops.append("/F1 10 Tf")
        first = True
        for line in page_lines:
            safe = _pdf_escape(line[:95])
            if first:
                ops.append(f"50 {y:.0f} Td")
                first = False
            else:
                ops.append("0 -13 Td")
            if page_idx == 0 and line == "VIKSIT MAHARASHTRA 2047":
                ops.append("/F2 14 Tf")
                ops.append(f"({safe}) Tj")
                ops.append("/F1 10 Tf")
            elif page_idx == 0 and line and line == line.upper() and len(line) < 72 and not line.startswith("—"):
                ops.append("/F2 11 Tf")
                ops.append(f"({safe}) Tj")
                ops.append("/F1 10 Tf")
            else:
                ops.append(f"({safe}) Tj")
        footer = f"Page {page_idx + 1} of {total}  |  Viksit Maharashtra 2047  |  Confidential"
        ops.extend(["/F1 8 Tf", "0 -18 Td", f"({_pdf_escape(footer)}) Tj", "ET"])
        page_streams.append("\n".join(ops).encode("latin-1", errors="replace"))

    n_pages = len(page_streams)
    # objects: 1 catalog, 2 pages, 3..(2+n) page nodes, (3+n)..(2+2n) contents, fonts at end
    font_regular_id = 3 + 2 * n_pages
    font_bold_id = font_regular_id + 1
    objects: List[bytes] = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    page_refs = " ".join(f"{3 + i} 0 R" for i in range(n_pages))
    objects.append(f"2 0 obj<< /Type /Pages /Kids [{page_refs}] /Count {n_pages} >>endobj\n".encode())
    for i, stream in enumerate(page_streams):
        page_id = 3 + i
        content_id = 3 + n_pages + i
        objects.append(
            f"{page_id} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_id} 0 R /Resources<< /Font<< /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> >>endobj\n".encode()
        )
    for i, stream in enumerate(page_streams):
        content_id = 3 + n_pages + i
        objects.append(f"{content_id} 0 obj<< /Length {len(stream)} >>stream\n".encode() + stream + b"\nendstream\nendobj\n")
    safe_title = _pdf_escape(doc_title[:120])
    objects.append(
        f"{font_regular_id} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n".encode()
    )
    objects.append(
        f"{font_bold_id} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n".encode()
    )
    info_id = font_bold_id + 1
    objects.append(
        f"{info_id} 0 obj<< /Title ({safe_title}) /Author (Government of Maharashtra) "
        f"/Subject (Viksit Maharashtra 2047 Monitoring Report) /Creator (VM2047 Platform) >>endobj\n".encode()
    )

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj
    xref_pos = len(pdf)
    pdf += f"xref\n0 {len(offsets)}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n".encode()
    pdf += (
        f"trailer<< /Size {len(offsets)} /Root 1 0 R /Info {info_id} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode()
    return pdf
