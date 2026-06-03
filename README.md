# Viksit Maharashtra 2047 — Integrated Monitoring Platform

A statewide PMO command-center for tracking the Viksit Maharashtra 2047 roadmap:
4 pillars · 16 themes · 100+ initiatives · 500+ milestones · 150+ KPIs · 36 districts
plus a dedicated **Agriculture Mission Monitoring** drill-down module
(10 milestones · 53 tasks · 203 sub-tasks · 9 departments).

---

## Tech Stack

- **Frontend**: React 19 · React Router · Tailwind CSS · Shadcn UI · Recharts · Leaflet
- **Backend**: FastAPI · Motor (MongoDB) · JWT + bcrypt · WebSockets · openpyxl
- **Database**: MongoDB
- **AI Copilot**: Mistral AI (`mistral-large-latest`)

---

## Prerequisites

| Tool       | Version |
|------------|---------|
| Python     | 3.10+   |
| Node.js    | 18+     |
| Yarn       | 1.22+   |
| MongoDB    | 6+ (running locally on `mongodb://localhost:27017`) |

---

## 1. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (a default .env is included; edit if needed)
# backend/.env:
#   MONGO_URL="mongodb://localhost:27017"
#   DB_NAME="viksit_maharashtra"
#   CORS_ORIGINS="*"
#   MISTRAL_API_KEY="your-mistral-key-here"

# Run the backend (port 8001)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

On first startup the backend will:
1. Seed core data (pillars, themes, departments, districts, initiatives, milestones, KPIs, risks, evidence, reviews, budgets, users).
2. Auto-download the Agriculture Excel and seed 203 sub-tasks as **Baseline Version 1.0**.

If the Agriculture auto-seed fails (e.g., offline machine), use the UI:
**Agriculture Mission → Excel Import → upload `Viksit_Maharashtra_2047_Agriculture.xlsx`**.

---

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies (use Yarn, not npm)
yarn install

# Configure environment
# frontend/.env:
#   REACT_APP_BACKEND_URL=http://localhost:8001

# Run the frontend (port 3000)
yarn start
```

Open: <http://localhost:3000>

---

## 3. Login Credentials

All seeded users share the password: **`demo123`**

| Role                   | Email                          |
|------------------------|--------------------------------|
| CM / Deputy CM         | cm@mh.gov.in                   |
| Chief Secretary        | cs@mh.gov.in                   |
| VMU Head               | vmu@mh.gov.in                  |
| Department Secretary   | secy.industries@mh.gov.in      |
| District Collector     | collector.pune@mh.gov.in       |
| Nodal Officer          | nodal@mh.gov.in                |
| PMO Analyst            | pmo@mh.gov.in                  |
| Finance Officer        | finance@mh.gov.in              |
| Public User            | public@mh.gov.in               |

Each role sees a different sidebar (role-based menu hiding).

---

## 4. Mistral API Key

The AI Copilot uses Mistral AI. Get a key at <https://console.mistral.ai/api-keys/> and put it in `backend/.env`:

```
MISTRAL_API_KEY="..."
```

Without a key the Copilot endpoint returns a friendly fallback message; everything else still works.

---

## 5. Project Structure

```
viksit-maharashtra-2047/
├── backend/
│   ├── server.py              # FastAPI app, auth, analytics, websocket, copilot
│   ├── seed_data.py           # Core sample data generator
│   ├── agriculture.py         # Agriculture module + Excel parser
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── contexts/AppContext.jsx
    │   ├── lib/api.js          # axios + RAG colors
    │   ├── lib/permissions.js  # role-based menu matrix
    │   ├── hooks/useNotificationStream.js   # WebSocket client
    │   ├── components/         # Sidebar, Topbar, Layout, charts
    │   └── pages/
    │       ├── Login.jsx, ExecutiveDashboard.jsx, ...
    │       └── agriculture/    # New module pages
    ├── package.json
    └── .env
```

---

## 6. Key Features

| Module                        | Highlights |
|-------------------------------|------------|
| **Executive Command Center**  | KPI cards, RAG matrix, top delays/risks, charts, vision timeline |
| **Pillars / Themes**          | 4 pillars · 16 themes with drill-down |
| **Initiatives / Milestones**  | Full CRUD with filters, planned vs actual, RAG calc |
| **KPI Monitoring**            | 150+ KPIs with 2029 / 2035 / 2047 targets |
| **Departments / Districts**   | 18 departments + 36 districts with GIS map |
| **Budget & PPP**              | Funding mix, theme-wise allocation/utilization |
| **Evidence / Risks / Reviews**| Full register with escalation matrix |
| **AI Copilot**                | Mistral-powered, grounded on live data |
| **Reports**                   | 17 reports (CSV export) including 6 Agriculture-specific |
| **Agriculture Mission**       | Excel import · 203 sub-tasks · Gantt · dependencies · critical path |
| **Real-time updates**         | WebSocket broadcasts on initiative/milestone/risk events |
| **Mobile responsive**         | Hamburger drawer sidebar |

---

## 7. Production Notes

- Backend binds to `0.0.0.0:8001`. Put it behind nginx / caddy for TLS.
- Frontend can be built with `yarn build` → static files under `frontend/build/`.
- MongoDB connection uses `MONGO_URL` only — never hardcode.
- WebSocket path: `/api/ws/events` (same host, ws/wss).

---

## 8. Troubleshooting

| Problem                              | Fix |
|--------------------------------------|------|
| Backend says "Agriculture seed failed" | Open the UI → **Agriculture Mission → Excel Import** → upload the xlsx manually. |
| Login returns 401                    | The seed runs on first startup; ensure the backend log shows "Database seeded successfully". |
| Map tiles don't load                 | Allow outbound HTTPS to CartoDB CDN. |
| WebSocket "Offline" badge            | Ensure your reverse proxy supports WebSocket upgrades. |
| Mistral 401 / 403                    | Check `MISTRAL_API_KEY` is set and active. |

---

## License
Internal Government of Maharashtra demonstrator — not for redistribution.
