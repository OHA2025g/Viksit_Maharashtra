// Role-based menu access matrix for Viksit Maharashtra 2047.

const ENHANCEMENT_PATHS = [
  "/public", "/watchlist", "/meeting-packs", "/intelligence",
  "/assets", "/approvals", "/officers", "/recognition",
];

const EXECUTIVE = [
  "/", "/pillars", "/themes", "/initiatives", "/milestones", "/kpis", "/departments", "/districts",
  "/budget", "/evidence", "/risks", "/reviews", "/copilot", "/reports", "/settings",
  "/agriculture", "/agriculture/import", "/agriculture/milestones", "/agriculture/tasks",
  "/agriculture/departments", "/agriculture/dependencies",
  ...ENHANCEMENT_PATHS,
];

export const ROLE_ACCESS = {
  CM: EXECUTIVE,
  ChiefSecretary: EXECUTIVE,
  VMUHead: EXECUTIVE,
  ACS: EXECUTIVE.filter((p) => p !== "/settings"),
  DepartmentSecretary: [
    "/", "/themes", "/initiatives", "/milestones", "/kpis", "/departments", "/budget", "/evidence",
    "/risks", "/reviews", "/copilot", "/reports", "/watchlist", "/meeting-packs", "/intelligence",
    "/assets", "/approvals", "/officers",
    "/agriculture", "/agriculture/milestones", "/agriculture/tasks", "/agriculture/departments", "/agriculture/dependencies",
  ],
  DistrictCollector: [
    "/", "/districts", "/milestones", "/kpis", "/evidence", "/risks", "/reviews", "/copilot",
    "/reports", "/watchlist", "/intelligence", "/assets", "/public",
    "/agriculture", "/agriculture/tasks",
  ],
  NodalOfficer: [
    "/milestones", "/evidence", "/risks", "/reviews", "/copilot", "/watchlist", "/approvals",
    "/agriculture/tasks",
  ],
  PMOAnalyst: EXECUTIVE.filter((p) => p !== "/settings"),
  FinanceOfficer: ["/", "/budget", "/reports", "/copilot", "/agriculture", "/intelligence", "/meeting-packs", "/public"],
  Public: ["/public", "/pillars", "/themes", "/reports", "/agriculture"],
};

export function canAccess(role, path) {
  if (!role) return false;
  const allowed = ROLE_ACCESS[role] || [];
  return allowed.includes(path);
}

export const ROLE_LABELS = {
  CM: "Executive · Full Access",
  ChiefSecretary: "Executive · Full Access",
  VMUHead: "Operational · Full Access",
  ACS: "Senior · Department & Theme oversight",
  DepartmentSecretary: "Department-level",
  DistrictCollector: "District-level",
  NodalOfficer: "Field updates only",
  PMOAnalyst: "Validation & Reporting",
  FinanceOfficer: "Budget & Finance",
  Public: "Public View (read-only)",
};
