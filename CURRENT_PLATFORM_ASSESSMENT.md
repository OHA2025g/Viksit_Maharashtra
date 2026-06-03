# Current Platform Assessment — Viksit Maharashtra 2047

**Assessment date:** June 2026  
**Codebase path:** `viksit-maharashtra-2047/`

---

## 1. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, CRACO, Tailwind CSS, shadcn/Radix UI |
| Charts / Maps | Recharts, Leaflet (`DistrictMap.jsx`) |
| HTTP | Axios (`frontend/src/lib/api.js`) |
| State | React Context (`AppContext.jsx`), local component state |
| Real-time | WebSocket (`useNotificationStream.js` → `/api/ws/events`) |
| Backend | FastAPI 0.110, Uvicorn, Motor (MongoDB async) |
| Auth | JWT + bcrypt; 9 demo roles seeded |
| AI | Mistral API (`POST /api/copilot/chat`) |
| Agriculture | Separate module (`backend/agriculture.py`, Excel import via openpyxl) |

---

## 2. Project Structure

```
viksit-maharashtra-2047/
├── backend/
│   ├── server.py          # Main FastAPI app (~988 lines)
│   ├── agriculture.py     # Agriculture routes & Excel parser
│   ├── seed_data.py       # Demo data generators
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js         # Routes (login + 20 private pages)
│   │   ├── components/    # Layout, Sidebar, Topbar, charts helpers
│   │   ├── contexts/      # AppContext only
│   │   ├── hooks/         # useNotificationStream, use-toast
│   │   ├── lib/           # api.js, permissions.js
│   │   └── pages/         # 15 core + 6 agriculture pages
│   └── public/index.html
└── README.md
```

---

## 3. Existing Pages & Routes

| Route | Page | Capability |
|-------|------|------------|
| `/login` | Login | Demo auth, quick role buttons |
| `/` | ExecutiveDashboard | Overview KPIs, charts, delayed/risk lists |
| `/pillars`, `/themes` | Pillars, Themes | Vision hierarchy drill-down |
| `/initiatives`, `/milestones` | CRUD + filters | Full milestone management |
| `/kpis`, `/budget` | Registers + charts | Read/update KPIs; budget read-only |
| `/departments`, `/districts` | Rankings + GIS map | Department rank; district map/table |
| `/evidence`, `/risks`, `/reviews` | Registers | Metadata evidence; risk CRUD; reviews + actions |
| `/copilot` | AI chat | Mistral-powered assistant |
| `/reports` | Report cards | CSV partial; PDF/XLSX stub toasts |
| `/settings` | Master data + reseed | Admin dev tools |
| `/agriculture/*` | 6 pages | Excel import, 203 sub-tasks, dependencies |

**Missing routes:** `/public`, watchlist, meeting packs, simulators, assets, approvals, officers, recognition, audit views.

---

## 4. Existing API Surface

- **Core CRUD:** pillars, themes, departments, districts, initiatives, milestones, KPIs (PUT), budgets (GET), evidence (GET/POST/PUT metadata), risks, reviews, action-items
- **Analytics:** `/analytics/overview`, department rank/performance
- **Auth:** login, me, users list
- **Notifications:** GET seeded list only; WebSocket live events (not persisted)
- **Agriculture:** 14 endpoints under `/api/agriculture/*`
- **Copilot:** chat + history

---

## 5. Data Model (MongoDB Collections)

Seeded: `pillars`, `themes`, `departments`, `districts`, `initiatives`, `milestones`, `kpis`, `risks`, `evidence`, `reviews`, `action_items`, `budgets`, `users`, `notifications`

Runtime: `copilot_history`, `agri_subtasks`, `agri_baselines`, `agri_imports`

**Not present:** `audit_logs`, `comments`, `approvals`, `assets`, `officers`, `transfers`, file storage paths

---

## 6. Authentication & Roles

- JWT in `localStorage` (`vm2047_token`)
- Sidebar hides menu via `permissions.js` — **no server-side RBAC** on data routes
- Roles: CM, ChiefSecretary, VMUHead, ACS, DepartmentSecretary, DistrictCollector, NodalOfficer, PMOAnalyst, FinanceOfficer, Public

---

## 7. Existing Strengths

- Polished executive UI with RAG system, Manrope/IBM Plex typography
- Rich seeded demo data (4 pillars, 16 themes, 36 districts, 100+ milestones)
- Agriculture module with dependency graph and Excel baseline
- WebSocket live badge (requires `uvicorn[standard]`)
- Role-based navigation matrix
- Recharts dashboards and Leaflet district map

---

## 8. Limitations & Gaps

| Area | Gap |
|------|-----|
| Public transparency | No `/public` route; Public role uses same executive dashboard |
| Reports | PDF/XLSX not implemented; many reports export overview summary only |
| Watchlist | No stuck/delayed aggregation module |
| Evidence | Metadata only; no file upload; no sufficiency rules; no audit trail |
| Meeting packs | Review types exist; no auto-generated pack export |
| Alerts | Static seeded notifications; no rule-based smart alerts |
| Forecasting | No delay-risk, budget burn, or scenario logic |
| RCA / anomalies | Not implemented |
| Simulator | No cascade or scenario planner |
| Assets | No geo-tagged asset registry |
| Workflows | No approval engine |
| Collaboration | No discussion threads |
| Audit | No field-level history |
| Districts | Basic map; no benchmarking/peer comparison |
| Officers | No accountability or transfer tracker |
| Recognition | No leaderboards |
| i18n | English only |
| Accessibility | Minimal ARIA; no high-contrast toggle |

---

## 9. Build & Run Commands

```bash
# Backend
cd backend && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend && yarn install && yarn start

# Build
cd frontend && yarn build
```

**Lint:** ESLint via CRACO (warnings on hook deps). **Tests:** `yarn test` (CRA default; no feature tests). **Type check:** JS only (`jsconfig.json`), no TypeScript.

---

## 10. Recommendations

1. Add `backend/enhancements.py` router for new features without rewriting `server.py`
2. Compute watchlist, forecasts, RCA, anomalies from existing milestone/KPI/budget data (rule-based MVP)
3. Add MongoDB collections for audit, comments, approvals, assets, officers
4. Implement real CSV/XLSX exports server-side; PDF via openpyxl + simple text report or HTML print
5. Add `/public` route with sanitized read-only API
6. Add `I18nContext` and `A11yContext` on frontend
7. Extend Sidebar + permissions for new modules
8. Persist smart alerts to notifications collection

---

## 11. Conclusion

The platform is a **production-quality demo PMO command center** with strong visualization and agriculture drill-down. It lacks **governance, transparency, intelligence, and collaboration** layers requested in the enhancement scope. The existing FastAPI + MongoDB + React architecture can absorb these features via an extensions module without a rewrite.
