import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Target, Layers, Flag, MapPinned, Activity, Building2,
  Map, Coins, FileCheck2, AlertTriangle, ClipboardList, Bot, FileBarChart, Settings,
  Sparkles, X, Sprout, ChevronDown, FileSpreadsheet, GitBranch, Globe, ListTodo,
  Briefcase, Brain, MapPin, CheckSquare, Users, Award,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { canAccess, ROLE_LABELS } from "@/lib/permissions";
import { useI18n } from "@/contexts/I18nContext";

const NAV = [
  { to: "/", label: "Executive Dashboard", i18n: "nav.executive", icon: LayoutDashboard, testId: "nav-executive" },
  { to: "/public", label: "Public Dashboard", i18n: "nav.public", icon: Globe, testId: "nav-public" },
  { to: "/watchlist", label: "Stuck Watchlist", i18n: "nav.watchlist", icon: ListTodo, testId: "nav-watchlist" },
  { to: "/meeting-packs", label: "Meeting Packs", i18n: "nav.meetingPacks", icon: Briefcase, testId: "nav-meeting-packs" },
  { to: "/intelligence", label: "Intelligence Hub", i18n: "nav.intelligence", icon: Brain, testId: "nav-intelligence" },
  { to: "/assets", label: "Asset Registry", i18n: "nav.assets", icon: MapPin, testId: "nav-assets" },
  { to: "/approvals", label: "Approvals", i18n: "nav.approvals", icon: CheckSquare, testId: "nav-approvals" },
  { to: "/officers", label: "Officers", i18n: "nav.officers", icon: Users, testId: "nav-officers" },
  { to: "/recognition", label: "Recognition", i18n: "nav.recognition", icon: Award, testId: "nav-recognition" },
  { to: "/pillars", label: "Pillars", icon: Target, testId: "nav-pillars" },
  { to: "/themes", label: "Themes", icon: Layers, testId: "nav-themes" },
  {
    group: "Agriculture Mission", icon: Sprout, testId: "nav-agri-group",
    children: [
      { to: "/agriculture", label: "Overview", testId: "nav-agri-overview" },
      { to: "/agriculture/import", label: "Excel Import", testId: "nav-agri-import", icon: FileSpreadsheet },
      { to: "/agriculture/milestones", label: "Milestones (10)", testId: "nav-agri-milestones" },
      { to: "/agriculture/tasks", label: "Task & Sub-task (203)", testId: "nav-agri-tasks" },
      { to: "/agriculture/departments", label: "Departments (9)", testId: "nav-agri-depts" },
      { to: "/agriculture/dependencies", label: "Dependencies", testId: "nav-agri-deps", icon: GitBranch },
    ],
  },
  { to: "/initiatives", label: "Initiatives", icon: Flag, testId: "nav-initiatives" },
  { to: "/milestones", label: "Milestones", icon: MapPinned, testId: "nav-milestones" },
  { to: "/kpis", label: "KPIs", icon: Activity, testId: "nav-kpis" },
  { to: "/departments", label: "Departments", icon: Building2, testId: "nav-departments" },
  { to: "/districts", label: "Districts", icon: Map, testId: "nav-districts" },
  { to: "/budget", label: "Budget & PPP", icon: Coins, testId: "nav-budget" },
  { to: "/evidence", label: "Evidence", icon: FileCheck2, testId: "nav-evidence" },
  { to: "/risks", label: "Risks & Issues", icon: AlertTriangle, testId: "nav-risks" },
  { to: "/reviews", label: "Reviews", icon: ClipboardList, testId: "nav-reviews" },
  { to: "/copilot", label: "AI Copilot", icon: Bot, testId: "nav-copilot" },
  { to: "/reports", label: "Reports", icon: FileBarChart, testId: "nav-reports" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useApp();
  const { t } = useI18n();
  const role = user?.role;
  const [agriOpen, setAgriOpen] = useState(true);

  const filterItem = (item) => {
    if (item.group) {
      const visibleChildren = item.children.filter((c) => canAccess(role, c.to));
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    return canAccess(role, item.to) ? item : null;
  };
  const visibleNav = NAV.map(filterItem).filter(Boolean);

  return (
    <>
      {mobileOpen && (
        <div
          data-testid="sidebar-overlay"
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        />
      )}

      <aside
        data-testid="app-sidebar"
        className={`w-64 fixed inset-y-0 left-0 z-50 bg-[#0F172A] text-slate-300 flex flex-col transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#F97316] to-[#16A34A] flex items-center justify-center shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "Manrope" }}>
                Viksit Maharashtra
              </span>
              <span className="text-[10px] uppercase tracking-widest text-orange-300">2047 CMO</span>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="sidebar-close-btn"
            className="lg:hidden p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {role && (
          <div className="px-4 py-3 border-b border-white/5 bg-white/5">
            <div className="text-[10px] uppercase tracking-widest text-orange-300 font-semibold">Active role</div>
            <div className="text-xs text-white font-semibold mt-0.5">{role}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABELS[role] || ""}</div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2" role="navigation" aria-label="Main navigation">
          {visibleNav.length === 0 && (
            <div className="text-xs text-slate-500 px-3 py-4">No menu items available for this role.</div>
          )}
          {visibleNav.map((item) => {
            if (item.group) {
              return (
                <div key={item.group} data-testid={item.testId} className="mt-1">
                  <button
                    onClick={() => setAgriOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-emerald-300 hover:bg-white/5 transition-colors"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left font-semibold">{item.group}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${agriOpen ? "" : "-rotate-90"}`} />
                  </button>
                  {agriOpen && (
                    <div className="ml-2 border-l border-white/10 pl-2 py-1">
                      {item.children.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          end={c.to === "/agriculture"}
                          data-testid={c.testId}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-200 font-semibold"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`
                          }
                        >
                          {c.icon ? <c.icon className="h-3 w-3" /> : <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                          <span>{c.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-testid={item.testId}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 text-white border-l-4 border-[#F97316] pl-2"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.i18n ? t(item.i18n) : item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-[10px] text-slate-500 uppercase tracking-widest">
          Vision 2029 · 2035 · 2047
        </div>
      </aside>
    </>
  );
}
