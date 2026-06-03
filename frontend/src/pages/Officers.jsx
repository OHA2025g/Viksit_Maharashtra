import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  Clock,
  FileWarning,
  Flag,
  LayoutGrid,
  List,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { HEALTH_STYLES, officerHealth, officerInitials } from "@/lib/officerMetrics";

export default function Officers() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [outgoing, setOutgoing] = useState("");
  const [successor, setSuccessor] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("attention");
  const [view, setView] = useState("cards");

  const load = () => {
    api.get("/officers").then(({ data }) => setOfficers(data || []));
    api.get("/transfers").then(({ data }) => setTransfers(data || []));
  };
  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const needAttention = officers.filter((o) => officerHealth(o).level === "red").length;
    const watch = officers.filter((o) => officerHealth(o).level === "amber").length;
    return {
      total: officers.length,
      needAttention,
      watch,
      totalMilestones: officers.reduce((s, o) => s + (o.milestones_owned || 0), 0),
      totalOverdue: officers.reduce((s, o) => s + (o.overdue_actions || 0), 0),
      totalRisks: officers.reduce((s, o) => s + (o.open_risks || 0), 0),
      avgDelay:
        officers.length > 0
          ? (officers.reduce((s, o) => s + (o.avg_delay_days || 0), 0) / officers.length).toFixed(1)
          : "0",
    };
  }, [officers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = officers;
    if (q) {
      list = list.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.department_name?.toLowerCase().includes(q) ||
          o.role_title?.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "overdue") return (b.overdue_actions || 0) - (a.overdue_actions || 0);
      if (sortBy === "delay") return (b.avg_delay_days || 0) - (a.avg_delay_days || 0);
      if (sortBy === "milestones") return (b.milestones_owned || 0) - (a.milestones_owned || 0);
      const pa = officerHealth(a).pct;
      const pb = officerHealth(b).pct;
      return pa - pb;
    });
    return sorted;
  }, [officers, search, sortBy]);

  const attentionLeaders = useMemo(
    () => [...officers].sort((a, b) => officerHealth(a).pct - officerHealth(b).pct).slice(0, 3),
    [officers],
  );

  const createTransfer = async () => {
    if (!outgoing || !successor) return toast.error(t("officer.transfer.selectBoth"));
    const out = officers.find((o) => o.id === outgoing);
    await api.post("/transfers", {
      outgoing_officer_id: outgoing,
      successor_officer_id: successor,
      pending_tasks: [`${out?.milestones_owned || 0} milestones`, `${out?.overdue_actions || 0} actions`],
      pending_risks: [`${out?.open_risks || 0} open risks`],
    });
    toast.success(t("officer.transfer.initiated"));
    load();
  };

  const completeTransfer = async (id) => {
    await api.put(`/transfers/${id}/complete`);
    toast.success(t("officer.transfer.complete"));
    load();
  };

  const openOfficer = (id) => navigate(`/officers/${id}`);

  return (
    <div className="space-y-8">
      <PageHeader eyebrowKey="page.officers.eyebrow" titleKey="page.officers.title" subtitleKey="page.officers.subtitle" />

      <Tabs defaultValue="accountability" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="accountability" className="gap-2 data-[state=active]:bg-white">
            <Shield className="h-3.5 w-3.5" />
            {t("officer.tab.accountability")}
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-2 data-[state=active]:bg-white">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {t("officer.tab.transfer")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accountability" className="space-y-6 mt-0">
          {/* Summary strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryTile
              icon={Users}
              label={t("officer.summary.total")}
              value={summary.total}
              sub={t("officer.summary.activeDepts")}
              accent="from-slate-700 to-slate-900"
            />
            <SummaryTile
              icon={AlertTriangle}
              label={t("officer.summary.attention")}
              value={summary.needAttention}
              sub={t("officer.summary.attentionSub")}
              accent="from-red-600 to-red-700"
              highlight={summary.needAttention > 0}
            />
            <SummaryTile
              icon={Flag}
              label={t("officer.summary.overdue")}
              value={summary.totalOverdue}
              sub={t("officer.summary.overdueSub")}
              accent="from-amber-600 to-orange-600"
            />
            <SummaryTile
              icon={FileWarning}
              label={t("officer.summary.risks")}
              value={summary.totalRisks}
              sub={t("officer.summary.risksSub")}
              accent="from-violet-600 to-violet-700"
            />
            <SummaryTile
              icon={Clock}
              label={t("officer.summary.avgDelay")}
              value={`${summary.avgDelay}d`}
              sub={t("officer.summary.delaySub")}
              accent="from-blue-600 to-blue-700"
            />
          </div>

          {attentionLeaders.some((o) => officerHealth(o).level !== "green") && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                  {t("officer.attention.title")}
                </h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {attentionLeaders.map((o) => {
                  const h = officerHealth(o);
                  const style = HEALTH_STYLES[h.level];
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => openOfficer(o.id)}
                      className={`text-left rounded-lg border bg-white p-3 card-hover ${style.ring} ring-2 ring-offset-1`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${style.bg} text-white flex items-center justify-center text-sm font-bold`}>
                          {officerInitials(o.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">{o.name}</div>
                          <div className="text-xs text-slate-500 truncate">{o.department_name}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                        <MetricChip icon={Flag} value={o.overdue_actions} label={t("officer.col.overdue")} warn={o.overdue_actions > 0} />
                        <MetricChip icon={AlertTriangle} value={o.open_risks} label={t("officer.col.risks")} warn={o.open_risks > 2} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <SectionCard title={t("officer.dashboard")} subtitle={t("officer.dashboardHint")}>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("officer.searchPlaceholder")}
                  className="pl-9"
                  aria-label={t("officer.searchPlaceholder")}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("officer.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attention">{t("officer.sort.attention")}</SelectItem>
                  <SelectItem value="overdue">{t("officer.sort.overdue")}</SelectItem>
                  <SelectItem value="delay">{t("officer.sort.delay")}</SelectItem>
                  <SelectItem value="milestones">{t("officer.sort.milestones")}</SelectItem>
                  <SelectItem value="name">{t("officer.sort.name")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "cards" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                  aria-pressed={view === "cards"}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {t("officer.view.cards")}
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "table" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                  aria-pressed={view === "table"}
                >
                  <List className="h-3.5 w-3.5" />
                  {t("officer.view.table")}
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">{t("officer.empty.search")}</p>
            ) : view === "cards" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((o) => (
                  <OfficerCard key={o.id} officer={o} onOpen={() => openOfficer(o.id)} t={t} />
                ))}
              </div>
            ) : (
              <DataTable captionKey="table.caption.officers">
                <THead>
                  <tr>
                    <Th>{t("officer.col.officer")}</Th>
                    <Th>{t("table.department")}</Th>
                    <Th>{t("officer.col.health")}</Th>
                    <Th>{t("officer.col.milestones")}</Th>
                    <Th>{t("officer.col.overdue")}</Th>
                    <Th>{t("officer.col.risks")}</Th>
                    <Th>{t("officer.col.evidence")}</Th>
                    <Th>{t("officer.col.avgDelay")}</Th>
                    <Th className="w-8" aria-hidden />
                  </tr>
                </THead>
                <tbody>
                  {filtered.map((o) => {
                    const h = officerHealth(o);
                    const style = HEALTH_STYLES[h.level];
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-slate-100 hover:bg-orange-50/60 cursor-pointer"
                        onClick={() => openOfficer(o.id)}
                        onKeyDown={(e) => e.key === "Enter" && openOfficer(o.id)}
                        tabIndex={0}
                        role="link"
                        data-testid={`officer-row-${o.id}`}
                      >
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className={`h-8 w-8 rounded-full ${style.bg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                              {officerInitials(o.name)}
                            </span>
                            <span className="font-medium text-orange-700">{o.name}</span>
                          </div>
                        </Td>
                        <Td className="text-slate-600">{o.department_name}</Td>
                        <Td>
                          <span className={`inline-flex text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${style.chip}`}>
                            {t(h.labelKey)}
                          </span>
                        </Td>
                        <Td>{o.milestones_owned}</Td>
                        <Td className={o.overdue_actions > 0 ? "text-red-600 font-semibold" : ""}>{o.overdue_actions}</Td>
                        <Td className={o.open_risks > 2 ? "text-amber-700 font-semibold" : ""}>{o.open_risks}</Td>
                        <Td>{o.evidence_pending}</Td>
                        <Td>{o.avg_delay_days}d</Td>
                        <Td>
                          <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="transfer" className="mt-0 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="h-11 w-11 rounded-lg bg-orange-100 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
                  {t("officer.transfer.title")}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{t("officer.transfer.subtitle")}</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  {t("officer.transfer.outgoing")}
                </div>
                <Select value={outgoing} onValueChange={setOutgoing}>
                  <SelectTrigger className="w-56 bg-white"><SelectValue placeholder={t("officer.transfer.select")} /></SelectTrigger>
                  <SelectContent>{officers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 mb-2 hidden sm:block" aria-hidden />
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  {t("officer.transfer.successor")}
                </div>
                <Select value={successor} onValueChange={setSuccessor}>
                  <SelectTrigger className="w-56 bg-white"><SelectValue placeholder={t("officer.transfer.select")} /></SelectTrigger>
                  <SelectContent>
                    {officers.filter((o) => o.id !== outgoing).map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createTransfer} className="bg-orange-600 hover:bg-orange-700">
                {t("officer.transfer.cta")}
              </Button>
            </div>
          </div>

          <SectionCard title={t("officer.transfer.history")}>
            {transfers.length === 0 ? (
              <p className="text-sm text-slate-500">{t("officer.transfer.empty")}</p>
            ) : (
              <div className="space-y-3">
                {transfers.map((tr) => (
                  <div
                    key={tr.id}
                    className={`rounded-lg border p-4 text-sm ${tr.status === "Complete" ? "bg-slate-50 border-slate-200" : "bg-white border-orange-200 shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span
                          className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            tr.status === "Complete"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {tr.status}
                        </span>
                        <p className="text-xs text-slate-500 mt-2">{tr.created_at?.slice(0, 10)}</p>
                      </div>
                      {tr.status !== "Complete" && (
                        <Button size="sm" variant="outline" onClick={() => completeTransfer(tr.id)}>
                          {t("officer.transfer.markComplete")}
                        </Button>
                      )}
                    </div>
                    <ul className="list-disc pl-5 mt-3 text-slate-600 space-y-1">
                      {tr.checklist?.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, sub, accent, highlight }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${accent} text-white p-4 shadow-sm ${highlight ? "ring-2 ring-red-300 ring-offset-2" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-white/80">{label}</span>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
      <div className="text-[11px] text-white/75 mt-1">{sub}</div>
    </div>
  );
}

function MetricChip({ icon: Icon, value, label, warn }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${warn ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600"}`}
    >
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

function OfficerCard({ officer: o, onOpen, t }) {
  const h = officerHealth(o);
  const style = HEALTH_STYLES[h.level];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left w-full rounded-xl border border-slate-200 bg-white p-4 card-hover hover:border-orange-200 hover:shadow-md transition-all group"
      data-testid={`officer-card-${o.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-xl ${style.bg} text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm`}>
          {officerInitials(o.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 group-hover:text-orange-700 transition-colors truncate">
            {o.name}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{o.department_name}</span>
          </div>
          {o.role_title && (
            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">{o.role_title}</div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500 shrink-0 mt-1" />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
          <span className={style.text}>{t(h.labelKey)}</span>
          <span className="text-slate-400">{h.pct}% {t("officer.accountabilityScore")}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${h.pct}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <MiniStat label={t("officer.col.milestones")} value={o.milestones_owned} />
        <MiniStat label={t("officer.col.overdue")} value={o.overdue_actions} warn={o.overdue_actions > 0} />
        <MiniStat label={t("officer.col.risks")} value={o.open_risks} warn={o.open_risks > 2} />
        <MiniStat label={t("officer.col.evidence")} value={o.evidence_pending} warn={o.evidence_pending > 0} />
      </div>
      <div className="mt-2 text-[10px] text-slate-400 text-center">
        {t("officer.col.avgDelay")}: <span className="font-semibold text-slate-600">{o.avg_delay_days}d</span>
      </div>
    </button>
  );
}

function MiniStat({ label, value, warn }) {
  return (
    <div className={`rounded-md py-1.5 px-1 ${warn ? "bg-red-50" : "bg-slate-50"}`}>
      <div className={`text-sm font-bold ${warn ? "text-red-700" : "text-slate-800"}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500 leading-tight">{label}</div>
    </div>
  );
}
