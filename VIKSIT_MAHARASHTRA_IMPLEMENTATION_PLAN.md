# Viksit Maharashtra 2047 — Implementation Plan

**Version:** 1.0  
**Based on:** `CURRENT_PLATFORM_ASSESSMENT.md` (June 2026)

---

## 1. Current Platform Assessment (Summary)

React 19 + FastAPI + MongoDB PMO platform with executive dashboard, 20+ authenticated pages, agriculture module, JWT auth (client-side role menu), WebSocket live feed, and partial CSV reports. Missing public transparency, intelligence engines, collaboration, audit, and export depth.

---

## 2. Existing Modules in Codebase

- Executive Command Center, Pillars/Themes/Initiatives/Milestones
- KPI Monitoring, Departments, Districts (GIS)
- Budget & PPP (read), Evidence (metadata), Risks, Reviews
- AI Copilot (Mistral), Reports (partial CSV), Settings
- Agriculture Mission (6 pages, Excel import, dependencies)
- Auth, role switcher, notifications (seed + WebSocket)

---

## 3. Gap Analysis

See assessment §8. Priority gaps: public dashboard, report exports, watchlist, evidence sufficiency + upload metadata, meeting packs, smart alerts, forecasting/RCA/anomaly engines, simulators, assets, approvals, threads, audit trail, district benchmarking, officer accountability, recognition, i18n, a11y.

---

## 4. Features to Implement (F001–F023)

| ID | Feature | Priority | Dependency |
|----|---------|----------|------------|
| F001 | Public Transparency Dashboard | P0 | Public API |
| F002 | PDF/Excel/CSV Report Generator | P0 | Backend export |
| F003 | Stuck 30+ Days Watchlist | P0 | Milestone data |
| F004 | Evidence Upload & Metadata | P0 | Upload dir |
| F005 | Evidence Sufficiency Check | P0 | F004 |
| F006 | Meeting Pack Auto-Generator | P1 | Analytics |
| F007 | Smart Reminders & Alerts | P1 | Watchlist rules |
| F008 | Delay-Risk Forecasting | P1 | Milestone rules |
| F009 | Auto-RCA Engine | P1 | F008 |
| F010 | KPI Anomaly Detection | P1 | KPI data |
| F011 | Budget Burn-Rate Forecast | P1 | Budget data |
| F012 | Cascading-Impact Simulator | P2 | Dependencies |
| F013 | Scenario Planner | P2 | F012 |
| F014 | Asset Geo-tagging Registry | P2 | Districts geo |
| F015 | Approval Workflow Engine | P2 | New collection |
| F016 | Inline Discussion Threads | P2 | New collection |
| F017 | Audit Trail per Record | P1 | New collection |
| F018 | District Benchmarking | P1 | District analytics |
| F019 | Officer Accountability | P2 | New collection |
| F020 | Transfer Impact Tracker | P2 | F019 |
| F021 | Recognition Engine & Leaderboards | P2 | Analytics |
| F022 | Marathi + English UI Foundation | P2 | I18nContext |
| F023 | Accessibility Improvements | P2 | A11yContext |

---

## 5. Prioritized Roadmap

**Phase 1 (Foundation):** `enhancements.py`, seed collections, public API, exports, watchlist  
**Phase 2 (Governance):** Evidence upload/sufficiency, audit, approvals, comments  
**Phase 3 (Intelligence):** Alerts, delay-risk, RCA, KPI anomaly, budget forecast  
**Phase 4 (Planning):** Cascade simulator, scenario planner, meeting packs  
**Phase 5 (People & Places):** Assets, district benchmarking, officers, transfer, recognition  
**Phase 6 (UX):** i18n, accessibility, dashboard integrations  

---

## 6. Data Model Changes

| Collection | Purpose |
|------------|---------|
| `audit_logs` | Field-level change history |
| `comments` | Discussion threads on entities |
| `approvals` | Workflow instances + history |
| `assets` | Geo-tagged physical assets |
| `officers` | Accountability profiles |
| `transfers` | Handover records |
| `smart_alerts` | Rule-generated alerts (persisted) |

**Evidence extension:** `file_path`, `file_size`, `mime_type`, `verification_remarks`, `sufficiency_status`

**Milestone extension (computed):** `delay_risk_score`, `watchlist_reasons` via API (not stored)

---

## 7. UI / Page Changes

| Route | Page | Feature IDs |
|-------|------|-------------|
| `/public` | PublicDashboard | F001 |
| `/watchlist` | Watchlist | F003, F007 |
| `/meeting-packs` | MeetingPacks | F006 |
| `/intelligence` | IntelligenceHub | F008–F013 |
| `/assets` | Assets | F014 |
| `/approvals` | Approvals | F015 |
| `/officers` | Officers | F019, F020 |
| `/recognition` | Recognition | F021 |
| Enhanced `/reports` | Reports | F002 |
| Enhanced `/evidence` | Evidence | F004, F005, F016, F017 |
| Enhanced `/`, `/districts`, `/budget`, `/kpis`, `/milestones` | Various | F003, F007–F011, F018 |
| Global | I18n + A11y contexts | F022, F023 |

---

## 8. API / Backend Changes

New module: `backend/enhancements.py` mounted in `server.py`

Key prefixes:
- `GET /api/public/*` — sanitized aggregates
- `GET /api/watchlist` — stuck items
- `GET /api/reports/{slug}/export?format=csv|xlsx|pdf`
- `GET /api/meeting-packs/{type}`
- `GET /api/alerts/smart`
- `GET /api/forecast/*`, `/api/rca/*`, `/api/kpis/anomalies`
- `GET /api/budget/forecast`
- `POST /api/simulator/cascade`, `/api/simulator/scenario`
- CRUD `/api/assets`, `/api/approvals`, `/api/comments`, `/api/audit/{type}/{id}`
- `/api/districts/benchmark`, `/api/officers`, `/api/transfers`, `/api/recognition/leaderboard`
- `POST /api/evidence/upload` — multipart metadata + optional file

---

## 9. Integration Changes

- Wire `enhancements` router in `server.py` startup seed
- Update `permissions.js` + `Sidebar.jsx` nav entries
- Update `App.js` routes (public route outside PrivateRoute)
- Topbar: smart alerts bell integration
- Copilot: include delay-risk/RCA context in mock responses

---

## 10. Testing Strategy

| Check | Method |
|-------|--------|
| Backend import | `python -c "import enhancements"` |
| API smoke | curl public, watchlist, export endpoints |
| Frontend build | `yarn build` |
| Route manual | `/public`, `/watchlist`, `/intelligence`, etc. |
| Regression | Login, executive dashboard, agriculture still load |
| WebSocket | Live badge still connects |

No automated E2E suite exists; manual verification per feature ID.

---

## 11. Acceptance Criteria

- All F001–F023 have working UI or API entry points
- CSV export works for all report slugs; XLSX for core reports; PDF for executive summary
- Public dashboard exposes no internal risk owner emails or action-item assignees
- Watchlist surfaces on executive dashboard
- Evidence shows sufficiency status
- `IMPLEMENTATION_STATUS.md` ≥ 90% weighted score
- App builds without errors

---

## 12. Implementation Checklist

- [x] F001 Public Dashboard
- [x] F002 Report Generator (CSV/XLSX/PDF)
- [x] F003 Watchlist
- [x] F004 Evidence Upload
- [x] F005 Evidence Sufficiency
- [x] F006 Meeting Packs
- [x] F007 Smart Alerts
- [x] F008 Delay-Risk Forecast
- [x] F009 Auto-RCA
- [x] F010 KPI Anomaly
- [x] F011 Budget Forecast
- [x] F012 Cascade Simulator
- [x] F013 Scenario Planner
- [x] F014 Asset Registry
- [x] F015 Approval Workflow
- [x] F016 Discussion Threads
- [x] F017 Audit Trail
- [x] F018 District Benchmarking
- [x] F019 Officer Accountability
- [x] F020 Transfer Tracker
- [x] F021 Recognition Leaderboard
- [x] F022 Bilingual UI (foundation — nav + key page titles)
- [x] F023 Accessibility (foundation — skip link, high contrast, RAG ARIA)

---

## 13. Completion Scoring Method

```
Score = (Fully × 1.0 + Partial × 0.5 + Pending × 0) / 23 × 100
Target: ≥ 90% (≥ 20.7 points)
```

**Fully:** End-to-end working feature with UI + API  
**Partial:** Rule engine or read-only works; advanced viz or reply-thread missing  
**Pending:** Not implemented  
**Blocked:** External dependency failure (documented)

---

## 14. Risks & Assumptions

| Risk | Mitigation |
|------|------------|
| No real file storage (S3) | Local `uploads/` + metadata path documented |
| No ML training data | Rule-based forecasting/RCA/anomaly |
| PDF library weight | openpyxl + minimal PDF bytes generator |
| Large scope | Shared `enhancements.py` + hub pages |
| Reseed wipes enhancement data | Idempotent seed on empty collections only |

**Assumptions:** MongoDB running locally; demo data acceptable; bilingual = nav + headings (not full Marathi copy); officer data synthetic.

---

## 15. Implementation Order (Execution)

1. `backend/enhancements.py` + server wiring  
2. F001, F002, F003  
3. F004, F005, F017  
4. F006, F007  
5. F008, F009, F010, F011  
6. F012, F013  
7. F014, F015, F016  
8. F018, F019, F020, F021  
9. F022, F023  
10. Dashboard integrations + `IMPLEMENTATION_STATUS.md`  
