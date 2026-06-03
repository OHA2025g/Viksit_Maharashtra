"""Seed data for Viksit Maharashtra 2047 Platform."""
from datetime import datetime, timezone, timedelta
import uuid
import random

random.seed(42)


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def make_id():
    return str(uuid.uuid4())


# ============== PILLARS ==============
PILLARS = [
    {"id": "p1", "code": "GROWTH", "name": "Growth-driven", "order": 1,
     "description": "Accelerate Maharashtra's economic growth through agriculture, industry, services and tourism.",
     "color": "#F97316"},
    {"id": "p2", "code": "SUSTAIN", "name": "Sustainable", "order": 2,
     "description": "Build sustainable urban, energy, water and transport infrastructure.",
     "color": "#16A34A"},
    {"id": "p3", "code": "INCLUSIVE", "name": "Inclusive", "order": 3,
     "description": "Ensure inclusive education, health, welfare and soft power for all citizens.",
     "color": "#2563EB"},
    {"id": "p4", "code": "GOVERN", "name": "Good Governance", "order": 4,
     "description": "Modernise governance, technology, security and finance.",
     "color": "#0F172A"},
]

# ============== THEMES ==============
THEMES = [
    # Growth-driven
    {"id": "t1", "code": "AGRI", "name": "Agriculture, Allied Sectors and Rural", "pillar_id": "p1",
     "objective": "Double farmer income through crop value chains, fisheries, dairy, FPOs and rural transformation.",
     "owner_department_id": "d1"},
    {"id": "t2", "code": "IND", "name": "Industries", "pillar_id": "p1",
     "objective": "Industrial townships, MSMEs, 24 focus sectors, deregulation and R&D.",
     "owner_department_id": "d2"},
    {"id": "t3", "code": "SVC", "name": "Services", "pillar_id": "p1",
     "objective": "Fintech, GCCs, AVGC, deep-tech, data centres, entrepreneurship.",
     "owner_department_id": "d15"},
    {"id": "t4", "code": "TOUR", "name": "Tourism", "pillar_id": "p1",
     "objective": "Tourism circuits, branding, responsible tourism, tourism data ecosystem.",
     "owner_department_id": "d3"},
    # Sustainable
    {"id": "t5", "code": "URBAN", "name": "Urban Development", "pillar_id": "p2",
     "objective": "RDAs, ULB autonomy, mixed-use clusters, housing, metro, clean buses.",
     "owner_department_id": "d4"},
    {"id": "t6", "code": "ENERGY", "name": "Energy and Sustainability", "pillar_id": "p2",
     "objective": "Clean energy, grid modernization, nuclear, green molecules, forests, circularity.",
     "owner_department_id": "d5"},
    {"id": "t7", "code": "WATER", "name": "Water", "pillar_id": "p2",
     "objective": "Tap water, irrigation, river basin balancing, reuse, water utilities.",
     "owner_department_id": "d6"},
    {"id": "t8", "code": "TRANS", "name": "Transport and Logistics", "pillar_id": "p2",
     "objective": "Expressways, roads, aviation, freight corridors, ports, logistics authority.",
     "owner_department_id": "d7"},
    # Inclusive
    {"id": "t9", "code": "EDU", "name": "Education and Skilling", "pillar_id": "p3",
     "objective": "School outcomes, universities, CoEs, edu-cities, skilling.",
     "owner_department_id": "d8"},
    {"id": "t10", "code": "HEALTH", "name": "Health", "pillar_id": "p3",
     "objective": "Primary care, preventive care, tertiary care, insurance, Medi-cities.",
     "owner_department_id": "d10"},
    {"id": "t11", "code": "WELF", "name": "Welfare", "pillar_id": "p3",
     "objective": "Women, children, tribal citizens, SC/OBC/VJNT/minorities, PwDs, senior citizens.",
     "owner_department_id": "d11"},
    {"id": "t12", "code": "SOFT", "name": "Soft Power", "pillar_id": "p3",
     "objective": "Heritage, arts, film cities, Marathi language, sports.",
     "owner_department_id": "d13"},
    # Good Governance
    {"id": "t13", "code": "GOV", "name": "Governance", "pillar_id": "p4",
     "objective": "Government operating model, HR, KPI-linked performance, citizen services.",
     "owner_department_id": "d14"},
    {"id": "t14", "code": "TECH", "name": "Technology", "pillar_id": "p4",
     "objective": "Data lake, cyber-secure stack, sector DPIs, AI innovation.",
     "owner_department_id": "d15"},
    {"id": "t15", "code": "SEC", "name": "Security", "pillar_id": "p4",
     "objective": "Crime management, policing, justice, disaster resilience.",
     "owner_department_id": "d16"},
    {"id": "t16", "code": "FIN", "name": "Finance", "pillar_id": "p4",
     "objective": "Fiscal space, revenue models, PPP, asset monetization, alternate capital.",
     "owner_department_id": "d17"},
]

# ============== DEPARTMENTS ==============
DEPARTMENTS = [
    {"id": "d1", "name": "Agriculture Department", "head": "Secretary, Agriculture", "email": "agri@mh.gov.in"},
    {"id": "d2", "name": "Industries Department", "head": "Principal Secretary, Industries", "email": "ind@mh.gov.in"},
    {"id": "d3", "name": "Tourism Department", "head": "Secretary, Tourism", "email": "tour@mh.gov.in"},
    {"id": "d4", "name": "Urban Development Department", "head": "Principal Secretary, UDD", "email": "udd@mh.gov.in"},
    {"id": "d5", "name": "Energy Department", "head": "Principal Secretary, Energy", "email": "energy@mh.gov.in"},
    {"id": "d6", "name": "Water Resources Department", "head": "Principal Secretary, WRD", "email": "wrd@mh.gov.in"},
    {"id": "d7", "name": "Transport Department", "head": "Principal Secretary, Transport", "email": "transport@mh.gov.in"},
    {"id": "d8", "name": "School Education Department", "head": "Secretary, School Education", "email": "school@mh.gov.in"},
    {"id": "d9", "name": "Higher and Technical Education Department", "head": "Secretary, HTE", "email": "hte@mh.gov.in"},
    {"id": "d10", "name": "Public Health Department", "head": "Principal Secretary, Health", "email": "health@mh.gov.in"},
    {"id": "d11", "name": "Social Justice Department", "head": "Secretary, Social Justice", "email": "sj@mh.gov.in"},
    {"id": "d12", "name": "Women and Child Development Department", "head": "Secretary, WCD", "email": "wcd@mh.gov.in"},
    {"id": "d13", "name": "Cultural Affairs Department", "head": "Secretary, Culture", "email": "culture@mh.gov.in"},
    {"id": "d14", "name": "General Administration Department", "head": "Chief Secretary", "email": "gad@mh.gov.in"},
    {"id": "d15", "name": "Information Technology Department", "head": "Principal Secretary, IT", "email": "it@mh.gov.in"},
    {"id": "d16", "name": "Home Department", "head": "Additional Chief Secretary, Home", "email": "home@mh.gov.in"},
    {"id": "d17", "name": "Finance Department", "head": "Additional Chief Secretary, Finance", "email": "fin@mh.gov.in"},
    {"id": "d18", "name": "Planning Department", "head": "Principal Secretary, Planning", "email": "plan@mh.gov.in"},
]

# ============== DISTRICTS ==============
DISTRICT_DATA = [
    ("Mumbai City", "Konkan"), ("Mumbai Suburban", "Konkan"), ("Thane", "Konkan"),
    ("Palghar", "Konkan"), ("Pune", "Pune"), ("Nashik", "Nashik"),
    ("Nagpur", "Nagpur"), ("Chhatrapati Sambhajinagar", "Aurangabad"),
    ("Amravati", "Amravati"), ("Kolhapur", "Pune"), ("Solapur", "Pune"),
    ("Sangli", "Pune"), ("Satara", "Pune"), ("Ratnagiri", "Konkan"),
    ("Sindhudurg", "Konkan"), ("Raigad", "Konkan"), ("Jalgaon", "Nashik"),
    ("Dhule", "Nashik"), ("Nandurbar", "Nashik"), ("Ahmednagar", "Nashik"),
    ("Beed", "Aurangabad"), ("Latur", "Aurangabad"), ("Dharashiv", "Aurangabad"),
    ("Nanded", "Aurangabad"), ("Parbhani", "Aurangabad"), ("Hingoli", "Aurangabad"),
    ("Akola", "Amravati"), ("Buldhana", "Amravati"), ("Washim", "Amravati"),
    ("Yavatmal", "Amravati"), ("Wardha", "Nagpur"), ("Chandrapur", "Nagpur"),
    ("Gadchiroli", "Nagpur"), ("Bhandara", "Nagpur"), ("Gondia", "Nagpur"),
    ("Jalna", "Aurangabad"),
]


def build_districts():
    try:
        from district_geo import load_district_centroids
        centroids = load_district_centroids()
    except Exception:
        centroids = {}

    districts = []
    for i, (name, region) in enumerate(DISTRICT_DATA, start=1):
        progress = random.randint(35, 92)
        rag = "green" if progress >= 75 else ("amber" if progress >= 55 else "red")
        lat, lng = centroids.get(name, (19.3, 75.7))
        districts.append({
            "id": f"dist{i}",
            "name": name,
            "region": region,
            "progress_score": progress,
            "rag": rag,
            "infrastructure_progress": random.randint(40, 95),
            "employment_progress": random.randint(35, 90),
            "investment_progress": random.randint(30, 95),
            "welfare_coverage": random.randint(50, 95),
            "local_risks": random.randint(2, 12),
            "evidence_uploaded": random.randint(10, 80),
            "geo_lat": lat,
            "geo_lon": lng,
        })
    return districts


DISTRICTS = build_districts()


# ============== INITIATIVES ==============
INITIATIVE_TEMPLATES = {
    "t1": [
        ("Crop Value Chain Modernization", "Modernize crop value chains across major crops with FPO clusters."),
        ("Fisheries & Dairy Boost Program", "Scale up fisheries and dairy through cooperatives and processing units."),
    ],
    "t2": [
        ("Industrial Township Development", "Develop 10 integrated industrial townships across emerging districts."),
        ("MSME Credit Acceleration", "Expand MSME credit access with district-level facilitation centres."),
    ],
    "t3": [
        ("GCC & Fintech Hubs", "Attract Global Capability Centres and fintech companies to Mumbai, Pune."),
        ("AVGC & Deep-Tech Mission", "Mission for Animation, Visual Effects, Gaming, Comics and deep-tech."),
    ],
    "t4": [
        ("Tourism Circuits Program", "Develop 12 themed tourism circuits across Maharashtra."),
        ("Responsible Tourism Initiative", "Sustainable tourism with community participation."),
    ],
    "t5": [
        ("Regional Development Authorities", "Establish RDAs for integrated regional planning."),
        ("Affordable Housing Mission", "Construct 25 lakh affordable housing units by 2035."),
    ],
    "t6": [
        ("Clean Energy Mission", "Achieve 50% clean energy share by 2035."),
        ("Green Hydrogen Hub", "Build green hydrogen production and export hub."),
    ],
    "t7": [
        ("Har Ghar Jal Maharashtra", "100% functional household tap water connections."),
        ("River Basin Balancing", "Inter-basin water transfer and balancing infrastructure."),
    ],
    "t8": [
        ("Expressway Network Expansion", "Add 2000 km expressways by 2035."),
        ("Port Capacity Expansion", "Double port capacity through Vadhavan and JNPT expansion."),
    ],
    "t9": [
        ("Foundational Literacy Mission", "Universal foundational literacy and numeracy by 2030."),
        ("Skill Maharashtra 2047", "Train 1 crore youth across emerging skills."),
    ],
    "t10": [
        ("Maharashtra Health Insurance", "Universal health insurance for all citizens."),
        ("Medi-Cities Development", "Establish 5 Medi-Cities across regions."),
    ],
    "t11": [
        ("Women Empowerment Mission", "Female LFPR to 45% by 2035."),
        ("Tribal Development Action Plan", "Holistic tribal development across PVTGs."),
    ],
    "t12": [
        ("Heritage Conservation Program", "Conserve and showcase 100 heritage sites."),
        ("Sports Excellence Mission", "10 Olympic/Paralympic medals by 2036."),
    ],
    "t13": [
        ("Citizen Services Digitization", "100% citizen services digitized by 2029."),
        ("Performance-Linked Governance", "KPI-linked performance for all government employees."),
    ],
    "t14": [
        ("Maharashtra Data Lake", "State-wide data lake for evidence-based governance."),
        ("AI Innovation Sandbox", "Sector-wise AI sandboxes for innovation."),
    ],
    "t15": [
        ("Smart Policing Initiative", "Tech-enabled policing across 36 districts."),
        ("Disaster Resilience Plan", "Climate-resilient disaster management."),
    ],
    "t16": [
        ("Asset Monetization Program", "Monetize Rs 5 lakh crore of assets by 2035."),
        ("PPP Pipeline Acceleration", "Robust PPP pipeline across themes."),
    ],
}


def build_initiatives():
    inits = []
    counter = 1
    for theme in THEMES:
        for name, desc in INITIATIVE_TEMPLATES.get(theme["id"], []):
            budget = random.randint(500, 25000)  # in Crore
            utilized = round(budget * random.uniform(0.2, 0.85), 2)
            completion = random.randint(15, 88)
            statuses = ["In Progress", "Delayed", "At Risk", "In Progress", "Completed", "In Progress"]
            status = random.choice(statuses)
            rag_map = {"In Progress": "green", "Delayed": "amber", "At Risk": "red", "Completed": "blue"}
            rag = rag_map.get(status, "amber")
            inits.append({
                "id": f"init{counter}",
                "code": f"INIT-{counter:03d}",
                "name": name,
                "description": desc,
                "pillar_id": theme["pillar_id"],
                "theme_id": theme["id"],
                "lead_department_id": theme["owner_department_id"],
                "supporting_departments": random.sample([d["id"] for d in DEPARTMENTS if d["id"] != theme["owner_department_id"]], k=2),
                "target_year": random.choice([2029, 2035, 2047]),
                "budget_estimate": budget,
                "budget_utilized": utilized,
                "funding_source": random.choice(["State Budget", "PPP", "Multilateral", "CSR", "Mixed"]),
                "ppp_potential": random.choice(["High", "Medium", "Low"]),
                "private_investment_committed": round(budget * random.uniform(0, 0.4), 2),
                "status": status,
                "rag": rag,
                "priority": random.choice(["P0", "P1", "P2"]),
                "completion_pct": completion,
                "created_by": "VMU",
                "created_at": iso_now(),
            })
            counter += 1
    return inits


INITIATIVES = build_initiatives()


# ============== MILESTONES ==============
MILESTONE_NAMES = [
    "Baseline Assessment", "Stakeholder Consultation", "DPR Approval", "Tender Floated",
    "Vendor Selection", "Phase 1 Implementation", "Mid-term Review", "Phase 2 Implementation",
    "Pilot Rollout", "Scale-up Plan Approval", "State-wide Rollout", "Outcome Evaluation",
]


def build_milestones():
    milestones = []
    counter = 1
    today = datetime.now(timezone.utc)
    for init in INITIATIVES:
        num = random.randint(3, 5)
        for j in range(num):
            name = random.choice(MILESTONE_NAMES) + f" - {init['name'][:30]}"
            planned_start = today + timedelta(days=random.randint(-365, 100))
            planned_end = planned_start + timedelta(days=random.randint(60, 365))
            # Sometimes actual dates
            actual_start = planned_start + timedelta(days=random.randint(-15, 30)) if random.random() > 0.3 else None
            actual_end = planned_end + timedelta(days=random.randint(-10, 60)) if actual_start and random.random() > 0.5 else None
            completion = random.randint(0, 100)
            statuses = ["Not Started", "In Progress", "Completed", "Delayed", "Blocked", "At Risk"]
            status = random.choice(statuses)
            if completion >= 100:
                status = "Completed"
            rag_map = {"Not Started": "grey", "In Progress": "green", "Completed": "blue",
                       "Delayed": "amber", "Blocked": "red", "At Risk": "red"}
            rag = rag_map.get(status, "amber")
            evidence_status = random.choice(["Verified", "Pending", "Missing", "Submitted"])
            budget_alloc = round(init["budget_estimate"] / num, 2)
            budget_util = round(budget_alloc * random.uniform(0.1, 0.9), 2)
            milestones.append({
                "id": f"ms{counter}",
                "code": f"MS-{counter:04d}",
                "initiative_id": init["id"],
                "pillar_id": init["pillar_id"],
                "theme_id": init["theme_id"],
                "name": name,
                "department_id": init["lead_department_id"],
                "owner": "Joint Secretary",
                "district_id": random.choice(DISTRICTS)["id"],
                "dependency": random.choice([None, None, f"ms{max(1, counter-1)}"]),
                "planned_start_date": planned_start.date().isoformat(),
                "planned_end_date": planned_end.date().isoformat(),
                "actual_start_date": actual_start.date().isoformat() if actual_start else None,
                "actual_end_date": actual_end.date().isoformat() if actual_end else None,
                "completion_pct": completion,
                "status": status,
                "rag": rag,
                "evidence_status": evidence_status,
                "budget_allocated": budget_alloc,
                "budget_utilized": budget_util,
                "remarks": "On schedule" if rag == "green" else "Needs attention",
            })
            counter += 1
    return milestones


MILESTONES = build_milestones()


# ============== KPIs ==============
KPI_TEMPLATES = {
    "t1": [("Farmer Income (₹/year)", "₹", 120000, 200000, 350000, 500000),
           ("Crop Yield Index", "Index", 100, 130, 160, 200),
           ("FPO Coverage (%)", "%", 25, 50, 75, 95)],
    "t2": [("Industrial GDP Share (%)", "%", 28, 33, 40, 48),
           ("MSME Credit (₹ Cr)", "₹ Cr", 50000, 100000, 200000, 400000),
           ("Industrial Jobs (Lakh)", "Lakh", 80, 120, 180, 250)],
    "t3": [("Services GDP Share (%)", "%", 55, 60, 68, 75),
           ("GCC Employment (Lakh)", "Lakh", 5, 12, 25, 40),
           ("Data Centre Capacity (MW)", "MW", 800, 2000, 5000, 10000)],
    "t4": [("Tourist Footfall (Cr)", "Cr", 8, 15, 25, 40),
           ("Avg Spend per Tourist (₹)", "₹", 5000, 8000, 12000, 18000),
           ("Tourism Investment (₹ Cr)", "₹ Cr", 5000, 15000, 35000, 75000)],
    "t5": [("Affordable Housing Units (Lakh)", "Lakh", 5, 12, 25, 50),
           ("Metro Network (km)", "km", 120, 350, 700, 1500),
           ("Urban Green Cover (%)", "%", 8, 15, 25, 35)],
    "t6": [("Clean Energy Share (%)", "%", 18, 35, 55, 80),
           ("AT&C Losses (%)", "%", 18, 12, 8, 5),
           ("Renewable Capacity (GW)", "GW", 15, 35, 75, 150)],
    "t7": [("Rural Tap Water (%)", "%", 65, 90, 98, 100),
           ("Wastewater Reuse (%)", "%", 12, 30, 55, 80),
           ("Irrigation Coverage (%)", "%", 40, 55, 70, 85)],
    "t8": [("Expressway Network (km)", "km", 850, 1500, 3000, 5000),
           ("Port Capacity (MTPA)", "MTPA", 250, 400, 700, 1200),
           ("Freight Movement (Cr Tonnes)", "Cr Tonnes", 50, 80, 130, 220)],
    "t9": [("Foundational Literacy (%)", "%", 65, 85, 95, 99),
           ("Graduate Placement (%)", "%", 55, 70, 82, 92),
           ("Skilling Completion (Lakh)", "Lakh", 8, 25, 50, 100)],
    "t10": [("Life Expectancy (Years)", "Years", 72, 75, 78, 82),
            ("Health Insurance Coverage (%)", "%", 55, 80, 95, 100),
            ("Out-of-Pocket Expenditure (%)", "%", 45, 30, 20, 10)],
    "t11": [("Female LFPR (%)", "%", 28, 38, 45, 55),
            ("Poverty Rate (%)", "%", 18, 10, 5, 2),
            ("Beneficiary Coverage (%)", "%", 65, 82, 92, 98)],
    "t12": [("UNESCO Recognitions", "Count", 5, 8, 12, 20),
            ("Olympic/Paralympic Medals", "Count", 2, 5, 10, 18),
            ("Cultural Events (Annual)", "Count", 250, 500, 850, 1500)],
    "t13": [("Citizen Services Digitized (%)", "%", 55, 85, 95, 100),
            ("Citizen Satisfaction Score", "Score", 6.2, 7.5, 8.5, 9.2),
            ("Grievance Resolution Rate (%)", "%", 70, 85, 92, 98)],
    "t14": [("Data Lake Adoption (Depts)", "Count", 8, 25, 40, 50),
            ("AI Use Cases Deployed", "Count", 25, 100, 250, 500),
            ("Cyber Compliance Score", "%", 65, 85, 95, 99)],
    "t15": [("Crime Detection Rate (%)", "%", 62, 78, 88, 95),
            ("Conviction Rate (%)", "%", 35, 55, 72, 85),
            ("Emergency Response Time (min)", "min", 18, 12, 8, 5)],
    "t16": [("Fiscal Deficit (%)", "%", 3.5, 3.0, 2.5, 2.0),
            ("PPP Pipeline (₹ Cr)", "₹ Cr", 50000, 200000, 500000, 1000000),
            ("Asset Monetization (₹ Cr)", "₹ Cr", 25000, 150000, 400000, 800000)],
}


def build_kpis():
    kpis = []
    counter = 1
    for theme in THEMES:
        for name, unit, baseline, t2029, t2035, t2047 in KPI_TEMPLATES.get(theme["id"], []):
            # current value somewhere between baseline and 2029 target
            progress = random.uniform(0.0, 1.2)
            if t2029 > baseline:
                current = baseline + (t2029 - baseline) * progress
            else:
                current = baseline - (baseline - t2029) * progress
            current = round(current, 2)
            expected = baseline + (t2029 - baseline) * 0.5
            ratio = abs((current - baseline) / max(1, abs(t2029 - baseline)))
            if ratio >= 0.65:
                health = "green"
            elif ratio >= 0.35:
                health = "amber"
            else:
                health = "red"
            kpis.append({
                "id": f"kpi{counter}",
                "code": f"KPI-{counter:03d}",
                "name": name,
                "pillar_id": theme["pillar_id"],
                "theme_id": theme["id"],
                "department_id": theme["owner_department_id"],
                "unit": unit,
                "baseline_value": baseline,
                "current_value": current,
                "target_2029": t2029,
                "target_2035": t2035,
                "target_2047": t2047,
                "data_source": random.choice(["MIS", "Survey", "Census", "Department Report"]),
                "reporting_frequency": random.choice(["Monthly", "Quarterly", "Annual"]),
                "last_updated": iso_now(),
                "health": health,
                "remarks": "On track" if health == "green" else "Needs intervention",
            })
            counter += 1
    return kpis


KPIS = build_kpis()


# ============== RISKS ==============
RISK_TYPES = ["Policy", "Budget", "Land", "Vendor", "Coordination", "Data", "Legal", "Social", "Environmental", "Technology"]


def build_risks(milestones, initiatives):
    risks = []
    sample_inits = random.sample(initiatives, min(25, len(initiatives)))
    for i, init in enumerate(sample_inits, start=1):
        prob = random.randint(1, 5)
        impact = random.randint(1, 5)
        score = prob * impact
        statuses = ["Open", "Mitigation In Progress", "Escalated", "Closed"]
        ms = next((m for m in milestones if m["initiative_id"] == init["id"]), None)
        risks.append({
            "id": f"risk{i}",
            "code": f"RISK-{i:03d}",
            "pillar_id": init["pillar_id"],
            "theme_id": init["theme_id"],
            "initiative_id": init["id"],
            "milestone_id": ms["id"] if ms else None,
            "risk_type": random.choice(RISK_TYPES),
            "description": f"Risk in {init['name']}: potential delay due to coordination gaps",
            "probability": prob,
            "impact": impact,
            "risk_score": score,
            "mitigation_plan": "Establish weekly coordination forum and escalation matrix",
            "owner": "Department Nodal Officer",
            "escalation_level": random.choice(["Task Owner", "Department Nodal", "Secretary", "ACS", "Chief Secretary"]),
            "status": random.choice(statuses),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(15, 120))).date().isoformat(),
            "remarks": "Active monitoring required",
        })
    return risks


# ============== EVIDENCE ==============
EVIDENCE_TYPES = ["Government Resolution", "Approval Note", "DPR", "MoU", "Tender Document",
                  "Work Order", "Completion Certificate", "Geo-tagged Photo", "Inspection Report",
                  "Utilization Certificate", "KPI Data Report", "Social Audit Report",
                  "Training Report", "Cyber Audit Report", "Financial Report"]


def build_evidence(milestones):
    evid = []
    sample_ms = random.sample(milestones, min(25, len(milestones)))
    for i, ms in enumerate(sample_ms, start=1):
        evid.append({
            "id": f"ev{i}",
            "code": f"EV-{i:04d}",
            "pillar_id": ms["pillar_id"],
            "theme_id": ms["theme_id"],
            "initiative_id": ms["initiative_id"],
            "milestone_id": ms["id"],
            "evidence_type": random.choice(EVIDENCE_TYPES),
            "file_name": f"evidence_{i}_{random.choice(['report', 'photo', 'cert', 'note'])}.pdf",
            "uploaded_by": "Nodal Officer",
            "upload_date": iso_now(),
            "verification_status": random.choice(["Pending", "Accepted", "Rejected", "Needs Clarification"]),
            "verified_by": "PMO Analyst",
            "remarks": "Submitted as per schedule",
        })
    return evid


# ============== REVIEW MEETINGS ==============
def build_reviews():
    reviews = []
    types = ["Weekly PMO Review", "Monthly Department Review", "Monthly VMU Review",
             "Quarterly CM Review", "Chief Secretary Steering Committee"]
    for i in range(1, 11):
        rtype = random.choice(types)
        date = (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 60))).date().isoformat()
        themes_reviewed = random.sample([t["id"] for t in THEMES], k=random.randint(2, 5))
        reviews.append({
            "id": f"rev{i}",
            "code": f"REV-{i:03d}",
            "title": f"{rtype} - {date}",
            "review_type": rtype,
            "date": date,
            "chaired_by": random.choice(["CM", "Chief Secretary", "VMU Head", "ACS"]),
            "departments_involved": random.sample([d["id"] for d in DEPARTMENTS], k=3),
            "themes_reviewed": themes_reviewed,
            "agenda": f"Review of progress across {len(themes_reviewed)} themes including delayed milestones and risks.",
            "decisions_taken": "Expedite tender processes; reallocate budget for high-priority initiatives.",
            "remarks": "Follow up in next cycle",
        })
    return reviews


REVIEWS = build_reviews()


# ============== ACTION ITEMS ==============
def build_action_items():
    items = []
    for i in range(1, 31):
        review = random.choice(REVIEWS)
        items.append({
            "id": f"act{i}",
            "code": f"ACT-{i:03d}",
            "review_id": review["id"],
            "title": random.choice([
                "Submit DPR for approval",
                "Resolve land acquisition issues",
                "Update KPI data for last month",
                "Conduct stakeholder consultation",
                "Submit utilization certificate",
                "Expedite tender award",
                "Coordinate inter-department meeting",
                "Submit risk mitigation plan",
            ]),
            "owner_department_id": random.choice(DEPARTMENTS)["id"],
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(-15, 45))).date().isoformat(),
            "status": random.choice(["Open", "In Progress", "Closed", "Overdue"]),
            "remarks": "Action assigned in review meeting",
        })
    return items


# ============== BUDGETS ==============
def build_budgets():
    budgets = []
    sample_inits = random.sample(INITIATIVES, min(20, len(INITIATIVES)))
    for i, init in enumerate(sample_inits, start=1):
        total = init["budget_estimate"]
        alloc = round(total * random.uniform(0.6, 1.0), 2)
        util = init["budget_utilized"]
        budgets.append({
            "id": f"bud{i}",
            "code": f"BUD-{i:03d}",
            "initiative_id": init["id"],
            "theme_id": init["theme_id"],
            "department_id": init["lead_department_id"],
            "total_budget_required": total,
            "budget_allocated": alloc,
            "budget_utilized": util,
            "funding_gap": round(total - alloc, 2),
            "ppp_potential": init["ppp_potential"],
            "private_investment_committed": init["private_investment_committed"],
            "multilateral_funding": round(total * random.uniform(0, 0.2), 2),
            "csr_philanthropy": round(total * random.uniform(0, 0.05), 2),
            "asset_monetization_value": round(total * random.uniform(0, 0.15), 2),
            "viability_gap_funding": round(total * random.uniform(0, 0.1), 2),
            "financial_closure_status": random.choice(["Pending", "Partial", "Achieved"]),
            "remarks": "Tracking aligned with quarterly review",
        })
    return budgets


# ============== USERS ==============
USERS = [
    {"id": "u1", "email": "cm@mh.gov.in", "name": "Chief Minister", "role": "CM", "password": "demo123"},
    {"id": "u2", "email": "cs@mh.gov.in", "name": "Chief Secretary", "role": "ChiefSecretary", "password": "demo123"},
    {"id": "u3", "email": "vmu@mh.gov.in", "name": "VMU Head", "role": "VMUHead", "password": "demo123"},
    {"id": "u4", "email": "secy.industries@mh.gov.in", "name": "Secretary, Industries", "role": "DepartmentSecretary", "password": "demo123"},
    {"id": "u5", "email": "collector.pune@mh.gov.in", "name": "Collector, Pune", "role": "DistrictCollector", "password": "demo123"},
    {"id": "u6", "email": "nodal@mh.gov.in", "name": "Nodal Officer", "role": "NodalOfficer", "password": "demo123"},
    {"id": "u7", "email": "pmo@mh.gov.in", "name": "PMO Analyst", "role": "PMOAnalyst", "password": "demo123"},
    {"id": "u8", "email": "finance@mh.gov.in", "name": "Finance Officer", "role": "FinanceOfficer", "password": "demo123"},
    {"id": "u9", "email": "public@mh.gov.in", "name": "Public User", "role": "Public", "password": "demo123"},
]


# ============== NOTIFICATIONS ==============
def build_notifications():
    notifs = []
    types = [
        ("Milestone Overdue", "Affordable Housing Mission - Phase 1 milestone is overdue by 15 days", "red"),
        ("Evidence Missing", "Tender Document missing for 3 milestones in Energy theme", "amber"),
        ("KPI Update Pending", "Quarterly KPI update pending for Health theme", "amber"),
        ("Budget Utilization Low", "Welfare theme budget utilization below 40%", "amber"),
        ("Risk Escalated", "Land acquisition risk escalated to Chief Secretary", "red"),
        ("Review Action Overdue", "5 action items from last CM review are overdue", "red"),
        ("Milestone Due Soon", "Metro Phase 3 DPR approval due in 7 days", "amber"),
        ("Critical Red Milestone", "Smart Policing Initiative critical risk identified", "red"),
    ]
    for i, (title, msg, rag) in enumerate(types, start=1):
        notifs.append({
            "id": f"notif{i}",
            "title": title,
            "message": msg,
            "rag": rag,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))).isoformat(),
            "read": False,
        })
    return notifs


def get_all_seed_data():
    milestones = MILESTONES
    return {
        "pillars": PILLARS,
        "themes": THEMES,
        "departments": DEPARTMENTS,
        "districts": DISTRICTS,
        "initiatives": INITIATIVES,
        "milestones": milestones,
        "kpis": KPIS,
        "risks": build_risks(milestones, INITIATIVES),
        "evidence": build_evidence(milestones),
        "reviews": REVIEWS,
        "action_items": build_action_items(),
        "budgets": build_budgets(),
        "users": USERS,
        "notifications": build_notifications(),
    }
