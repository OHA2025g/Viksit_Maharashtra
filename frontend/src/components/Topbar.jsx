import React, { useEffect, useState } from "react";
import { Search, Bell, ChevronDown, LogOut, Calendar, Menu, Wifi, WifiOff, Languages, Contrast } from "lucide-react";
import { useApp, ROLES } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useA11y } from "@/contexts/A11yContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { RAGDot } from "@/components/RAGBadge";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { toast } from "sonner";

export default function Topbar({ onOpenMenu }) {
  const { user, switchRole, logout, period, setPeriod } = useApp();
  const { t, toggleLang } = useI18n();
  const { highContrast, toggleHighContrast } = useA11y();
  const [notifs, setNotifs] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [q, setQ] = useState("");
  const [liveCount, setLiveCount] = useState(0);
  const nav = useNavigate();

  const loadNotifs = () => {
    api.get("/notifications").then(({ data }) => setNotifs(data || [])).catch(() => {});
    api.get("/alerts/smart").then(({ data }) => setSmartAlerts(data?.alerts || data || [])).catch(() => {});
  };

  useEffect(() => { loadNotifs(); }, []);

  const { connected } = useNotificationStream((event) => {
    // Real-time event from backend
    setLiveCount((c) => c + 1);
    const newNotif = {
      id: `live-${Date.now()}-${Math.random()}`,
      title: event.title || "Live event",
      message: event.message || JSON.stringify(event).slice(0, 120),
      rag: event.rag || "amber",
      created_at: new Date().toISOString(),
      read: false,
      live: true,
    };
    setNotifs((prev) => [newNotif, ...prev].slice(0, 60));
    toast(event.title || "Platform update", {
      description: event.message,
      duration: 4500,
    });
  });

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/milestones?search=${encodeURIComponent(q)}`);
  };

  const unread = notifs.filter((n) => !n.read).length;
  const smartUnread = smartAlerts.filter((a) => !a.read).length;
  const combinedAlerts = [
    ...smartAlerts.map((a) => ({ ...a, smart: true })),
    ...notifs.map((n) => ({ ...n, smart: false })),
  ].slice(0, 40);
  const totalUnread = unread + smartUnread;

  return (
    <header
      data-testid="app-topbar"
      className="h-16 sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 gap-2"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onOpenMenu}
          data-testid="mobile-menu-btn"
          className="lg:hidden p-2 rounded-md hover:bg-slate-100"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
        <form onSubmit={onSearch} className="hidden sm:flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              data-testid="topbar-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search milestones, initiatives, KPIs..."
              className="bg-slate-100 rounded-md pl-9 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span
          data-testid="ws-status"
          title={connected ? "Live updates connected" : "Live updates disconnected"}
          className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${
            connected ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {connected ? <Wifi className="h-3 w-3" aria-hidden /> : <WifiOff className="h-3 w-3" aria-hidden />}
          {connected ? t("status.live") : t("status.offline")}
        </span>

        <button
          type="button"
          onClick={toggleLang}
          className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
          aria-label="Toggle language"
          data-testid="lang-toggle"
        >
          <Languages className="h-3.5 w-3.5" />
          {t("lang.toggle")}
        </button>

        <button
          type="button"
          onClick={toggleHighContrast}
          className={`hidden md:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${
            highContrast ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 hover:bg-slate-50"
          }`}
          aria-pressed={highContrast}
          aria-label={t("a11y.highContrast")}
          data-testid="high-contrast-toggle"
        >
          <Contrast className="h-3.5 w-3.5" />
          {t("a11y.highContrast")}
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          <DropdownMenu>
            <DropdownMenuTrigger className="font-medium text-slate-700" data-testid="period-selector">
              {period}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Reporting Period</DropdownMenuLabel>
              {["Q1 FY 2025-26", "Q2 FY 2025-26", "Q3 FY 2025-26", "Q4 FY 2025-26", "Annual 2025-26"].map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPeriod(p)}>{p}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="notifications-btn" className="relative p-2 rounded-md hover:bg-slate-100 transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-600" />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 max-w-[calc(100vw-1rem)]">
            <div className="px-4 py-3 border-b border-slate-200">
              <h4 className="font-semibold text-sm">Notifications & Alerts</h4>
              <p className="text-xs text-slate-500">{totalUnread} unread · {smartAlerts.length} smart alerts · {liveCount} live events</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {combinedAlerts.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">No notifications</div>}
              {combinedAlerts.map((n) => (
                <div key={n.id || `${n.title}-${n.created_at}`} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex gap-3">
                  <div className="mt-1"><RAGDot rag={n.rag || n.severity || "amber"} /></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {n.title}
                      {n.smart && <span className="text-[9px] uppercase tracking-widest text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Smart</span>}
                      {n.live && <span className="text-[9px] uppercase tracking-widest text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">Live</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-100 rounded-md px-2 py-1.5 transition-colors" data-testid="user-menu-trigger">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "?"}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || "Guest"}</div>
              <div className="text-[11px] text-slate-500">{user?.role || ""}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 hidden md:inline" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">Switch Role (Demo)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLES.map((r) => (
              <DropdownMenuItem key={r.code} onClick={() => switchRole(r.code)} data-testid={`role-switch-${r.code}`}>
                <div className="flex flex-col">
                  <span className="text-sm">{r.name}</span>
                  <span className="text-[10px] text-slate-400">{r.email}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="logout-btn">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
