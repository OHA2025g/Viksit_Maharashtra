import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, ThKey, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/I18nContext";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  GitBranch,
  Layers,
  LineChart,
  Play,
  Search,
  Sparkles,
  Target,
  Wallet,
  Zap,
} from "lucide-react";

const RISK_CATEGORY_STYLE = {
  Critical: { gradient: "from-red-600 to-red-800", ring: "ring-red-200", chip: "bg-red-100 text-red-800" },
  High: { gradient: "from-orange-500 to-orange-700", ring: "ring-orange-200", chip: "bg-orange-100 text-orange-800" },
  Medium: { gradient: "from-amber-500 to-amber-600", ring: "ring-amber-200", chip: "bg-amber-100 text-amber-800" },
  Low: { gradient: "from-emerald-500 to-emerald-700", ring: "ring-emerald-200", chip: "bg-emerald-100 text-emerald-800" },
};

const TAB_META = [
  { id: "forecast", icon: Activity, descKey: "intel.tabDesc.forecast" },
  { id: "rca", icon: Brain, descKey: "intel.tabDesc.rca" },
  { id: "kpi", icon: LineChart, descKey: "intel.tabDesc.kpi" },
  { id: "budget", icon: Wallet, descKey: "intel.tabDesc.budget" },
  { id: "cascade", icon: GitBranch, descKey: "intel.tabDesc.cascade" },
  { id: "scenario", icon: Layers, descKey: "intel.tabDesc.scenario" },
];

const SCENARIO_OPTIONS = [
  { value: "budget_cut_10", labelKey: "intel.scenario.budget10" },
  { value: "budget_cut_15", labelKey: "intel.scenario.budget15" },
  { value: "monsoon_delay_30", labelKey: "intel.scenario.monsoon" },
  { value: "vendor_delay_60", labelKey: "intel.scenario.vendor" },
  { value: "approval_delay_45", labelKey: "intel.scenario.approval" },
  { value: "district_disruption", labelKey: "intel.scenario.district" },
];

export default function IntelligenceHub() {
  const { t } = useI18n();
  const [params, setSearchParams] = useSearchParams();
  const [milestones, setMilestones] = useState([]);
  const [msSearch, setMsSearch] = useState("");
  const [selectedMs, setSelectedMs] = useState(params.get("milestone") || "");
  const [selectedRisk, setSelectedRisk] = useState(params.get("risk") || "");
  const [activeTab, setActiveTab] = useState(params.get("risk") ? "rca" : "forecast");
  const [delayRisk, setDelayRisk] = useState(null);
  const [rca, setRca] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [budgetForecast, setBudgetForecast] = useState([]);
  const [cascade, setCascade] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [delayDays, setDelayDays] = useState(30);
  const [scenarioType, setScenarioType] = useState("budget_cut_10");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    api
      .get("/milestones", { params: { limit: 200 } })
      .then(({ data }) => {
        setMilestones(data || []);
        const fromUrl = params.get("milestone");
        const ids = new Set((data || []).map((m) => m.id));
        if (fromUrl && ids.has(fromUrl)) setSelectedMs(fromUrl);
        else if (data?.[0] && !selectedMs) setSelectedMs(data[0].id);
      })
      .catch(() => setMilestones([]));
    api
      .get("/kpis/anomalies")
      .then(({ data }) => {
        setAnomalies(data?.anomalies || []);
        setAnomalyCount(data?.count ?? (data?.anomalies?.length || 0));
      })
      .catch(() => {
        setAnomalies([]);
        setAnomalyCount(0);
      });
    api
      .get("/budget/forecast")
      .then(({ data }) => setBudgetForecast(Array.isArray(data) ? data : []))
      .catch(() => setBudgetForecast([]));
  }, []);

  useEffect(() => {
    if (params.get("risk")) {
      setSelectedRisk(params.get("risk"));
      setActiveTab("rca");
      setLoadingAnalysis(true);
      api
        .get(`/rca/risk/${params.get("risk")}`)
        .then(({ data }) => setRca(data))
        .catch(() => setRca(null))
        .finally(() => setLoadingAnalysis(false));
      return;
    }
    if (!selectedMs) {
      setDelayRisk(null);
      setRca(null);
      return;
    }
    setLoadingAnalysis(true);
    Promise.all([
      api.get(`/forecast/delay-risk/${selectedMs}`),
      api.get(`/rca/${selectedMs}`),
    ])
      .then(([dr, rcaRes]) => {
        setDelayRisk(dr.data);
        setRca(rcaRes.data);
      })
      .catch(() => {
        setDelayRisk(null);
        setRca(null);
      })
      .finally(() => setLoadingAnalysis(false));
  }, [selectedMs, selectedRisk, params]);

  const selectedMilestone = useMemo(
    () => milestones.find((m) => m.id === selectedMs),
    [milestones, selectedMs],
  );

  const filteredMilestones = useMemo(() => {
    const q = msSearch.trim().toLowerCase();
    let list = milestones;
    if (q) {
      list = list.filter(
        (m) =>
          m.code?.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 80);
  }, [milestones, msSearch]);

  const hotMilestones = useMemo(
    () =>
      [...milestones]
        .filter((m) => m.rag === "red" || m.rag === "amber")
        .slice(0, 6),
    [milestones],
  );

  const summary = useMemo(
    () => ({
      atRisk: milestones.filter((m) => m.rag === "red" || m.rag === "amber").length,
      red: milestones.filter((m) => m.rag === "red").length,
      anomalies: anomalyCount,
      budgetAlerts: budgetForecast.filter((b) => b.warnings?.length).length,
    }),
    [milestones, anomalyCount, budgetForecast],
  );

  const riskStyle = delayRisk ? RISK_CATEGORY_STYLE[delayRisk.risk_category] || RISK_CATEGORY_STYLE.Medium : null;

  const runCascade = () => {
    if (!selectedMs) return;
    api
      .post("/simulator/cascade", { milestone_id: selectedMs, delay_days: delayDays })
      .then(({ data }) => setCascade(data))
      .catch(() => setCascade(null));
  };

  const runScenario = () => {
    api
      .post("/simulator/scenario", { scenario: scenarioType })
      .then(({ data }) => setScenario(data))
      .catch(() => setScenario(null));
  };

  const clearRiskView = () => {
    setSelectedRisk("");
    setActiveTab("forecast");
    setSearchParams({});
  };

  const pickMilestone = (id) => {
    setSelectedMs(id);
    setSelectedRisk("");
    setSearchParams({ milestone: id });
    setCascade(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowKey="page.intelligence.eyebrow"
        titleKey="page.intelligence.title"
        subtitleKey="page.intelligence.subtitle"
      />

      {/* Capability overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TAB_META.slice(0, 3).map(({ id, icon: Icon, descKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`text-left rounded-xl border p-4 card-hover transition-all ${
              activeTab === id ? "border-orange-300 bg-orange-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <Icon className={`h-5 w-5 mb-2 ${activeTab === id ? "text-orange-600" : "text-slate-400"}`} />
            <div className="text-sm font-semibold text-slate-900">{t(`intel.tab.${id}`)}</div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(descKey)}</p>
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile
          icon={Target}
          label={t("intel.summary.atRisk")}
          value={summary.atRisk}
          sub={t("intel.summary.atRiskSub")}
          gradient="from-orange-500 to-orange-700"
        />
        <SummaryTile
          icon={AlertTriangle}
          label={t("intel.summary.red")}
          value={summary.red}
          sub={t("intel.summary.redSub")}
          gradient="from-red-600 to-red-800"
          highlight={summary.red > 0}
        />
        <SummaryTile
          icon={BarChart3}
          label={t("intel.summary.anomalies")}
          value={summary.anomalies}
          sub={t("intel.summary.anomaliesSub")}
          gradient="from-violet-600 to-violet-800"
          onClick={() => setActiveTab("kpi")}
        />
        <SummaryTile
          icon={Wallet}
          label={t("intel.summary.budget")}
          value={summary.budgetAlerts}
          sub={t("intel.summary.budgetSub")}
          gradient="from-blue-600 to-blue-800"
          onClick={() => setActiveTab("budget")}
        />
      </div>

      {selectedRisk && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-orange-900">
            <Brain className="h-5 w-5 text-orange-600 shrink-0" />
            <span>{t("intel.riskViewBanner")}</span>
            {rca?.risk_code && (
              <span className="font-mono text-xs bg-white/80 px-2 py-0.5 rounded border border-orange-200">
                {rca.risk_code}
              </span>
            )}
          </div>
          <button type="button" className="text-sm font-medium text-orange-700 hover:underline" onClick={clearRiskView}>
            {t("intel.clearRiskView")}
          </button>
        </div>
      )}

      {/* Milestone context panel */}
      {!selectedRisk && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                {t("intel.selectMilestone")}
              </Label>
              <div className="relative mt-2 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={msSearch}
                  onChange={(e) => setMsSearch(e.target.value)}
                  placeholder={t("intel.searchMilestone")}
                  className="pl-9"
                />
              </div>
              <Select value={selectedMs} onValueChange={pickMilestone}>
                <SelectTrigger className="w-full max-w-lg mt-2 bg-white">
                  <SelectValue placeholder={t("intel.selectMilestonePrompt")} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredMilestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-mono text-xs mr-2">{m.code}</span>
                      {m.name?.slice(0, 45)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMilestone && (
              <div className={`rounded-xl p-4 min-w-[220px] ${riskStyle ? `bg-gradient-to-br ${riskStyle.gradient} text-white` : "bg-slate-800 text-white"}`}>
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
                  {t("intel.focusMilestone")}
                </div>
                <div className="font-bold text-sm mt-1 line-clamp-2" style={{ fontFamily: "Manrope" }}>
                  {selectedMilestone.name}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <RAGBadge rag={selectedMilestone.rag} />
                  <span className="text-xs text-white/80">{selectedMilestone.completion_pct ?? 0}%</span>
                </div>
                {delayRisk && !loadingAnalysis && (
                  <div className="mt-3 text-xs text-white/90">
                    {t("intel.score")}: <strong>{delayRisk.delay_risk_score}</strong> · {delayRisk.risk_category}
                  </div>
                )}
              </div>
            )}
          </div>

          {hotMilestones.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold shrink-0">
                {t("intel.quickPick")}
              </span>
              {hotMilestones.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMilestone(m.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedMs === m.id
                      ? "bg-orange-100 border-orange-300 text-orange-800 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:border-orange-200"
                  }`}
                >
                  {m.code}
                </button>
              ))}
              <Link to="/watchlist" className="text-xs text-orange-600 font-medium ml-auto hover:underline inline-flex items-center gap-1">
                {t("intel.viewWatchlist")} →
              </Link>
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          {TAB_META.map(({ id, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`intel.tab.${id}`)}
              {id === "kpi" && anomalyCount > 0 && (
                <span className="ml-1 bg-violet-600 text-white text-[10px] px-1.5 py-0 rounded-full">{anomalyCount}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="text-xs text-slate-500 mt-3">{t(TAB_META.find((x) => x.id === activeTab)?.descKey || "intel.tabDesc.forecast")}</p>

        <TabsContent value="forecast" className="mt-4 space-y-4">
          {loadingAnalysis && <LoadingStrip />}
          {!loadingAnalysis && delayRisk && selectedMilestone && (
            <div className={`rounded-2xl bg-gradient-to-br ${riskStyle.gradient} text-white p-6 md:p-8 shadow-lg`}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-bold">
                    {t("intel.delayRiskTitle")}
                  </div>
                  <div className="text-5xl font-bold mt-2" style={{ fontFamily: "Manrope" }}>
                    {delayRisk.delay_risk_score}
                    <span className="text-lg font-normal text-white/70">/100</span>
                  </div>
                  <span className={`inline-flex mt-3 text-xs font-bold uppercase px-3 py-1 rounded-full bg-white/20 border border-white/30`}>
                    {delayRisk.risk_category}
                  </span>
                </div>
                <div className="md:text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-widest text-white/70">{t("intel.confidence")}</div>
                  <div className="text-3xl font-bold">{delayRisk.confidence_score}%</div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white/90 rounded-full" style={{ width: `${delayRisk.delay_risk_score}%` }} />
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title={t("intel.reasons")}>
              {delayRisk?.reasons?.length ? (
                <ul className="space-y-2">
                  {delayRisk.reasons.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-slate-700">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint text={t("intel.selectMilestonePrompt")} />
              )}
            </SectionCard>
            <SectionCard title={t("intel.recommendedActions")}>
              {delayRisk?.recommended_actions?.length ? (
                <ul className="space-y-2">
                  {delayRisk.recommended_actions.map((a) => (
                    <li key={a} className="flex gap-2 text-sm text-slate-700">
                      <Zap className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint text={t("intel.selectMilestonePrompt")} />
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="rca" className="mt-4">
          {loadingAnalysis && <LoadingStrip />}
          <SectionCard title={t("intel.tab.rca")} subtitle={rca?.milestone_name || rca?.risk_code}>
            {rca?.top_causes?.length ? (
              <div className="space-y-4">
                {rca.top_causes.map((c, i) => (
                  <div
                    key={c.cause}
                    className={`rounded-xl border p-4 ${i === 0 ? "border-orange-200 bg-orange-50/50 ring-1 ring-orange-100" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{c.cause}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t("intel.owner")}: {c.escalation_owner}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-600 shrink-0">{c.confidence}%</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.confidence}%` }} />
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      <span className="font-medium text-slate-800">{t("intel.action")}:</span> {c.corrective_action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{c.resolution_path}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint text={t("intel.rcaEmpty")} />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <SectionCard title={`${t("intel.tab.kpi")} (${anomalies.length})`}>
            {anomalies.length === 0 ? (
              <div className="text-center py-10">
                <Sparkles className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">{t("intel.noAnomalies")}</p>
                <p className="text-xs text-slate-500 mt-1">{t("intel.noAnomaliesSub")}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {anomalies.slice(0, 12).map((a) => (
                  <div
                    key={a.kpi_id}
                    className={`rounded-xl border p-4 ${a.severity === "high" ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900">{a.kpi_name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          a.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t("intel.anomalyBadge")}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {a.flags?.map((f) => (
                        <li key={f} className="text-xs text-slate-600 flex gap-1.5">
                          <span className="text-amber-500">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/kpis" className="text-xs text-orange-600 font-medium mt-2 inline-block hover:underline">
                      {t("intel.viewKpi")} →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <SectionCard title={t("intel.tab.budget")}>
            <DataTable captionKey="table.caption.budgetForecast">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <ThKey labelKey="table.code" />
                  <ThKey labelKey="table.utilPct" />
                  <ThKey labelKey="table.burnMo" />
                  <ThKey labelKey="table.projUtilPct" />
                  <ThKey labelKey="table.warnings" />
                </tr>
              </thead>
              <tbody>
                {budgetForecast.slice(0, 20).map((b) => (
                  <tr key={b.id} className={`border-b ${b.warnings?.length ? "bg-amber-50/50" : ""}`}>
                    <Td className="py-3 font-mono text-xs">{b.code || b.id?.slice(0, 8)}</Td>
                    <Td>
                      <UtilBar pct={b.utilization_pct} />
                    </Td>
                    <Td>₹{b.monthly_burn_rate} Cr</Td>
                    <Td className="font-semibold">{b.projected_utilization_pct}%</Td>
                    <Td>
                      {b.warnings?.length ? (
                        <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          {b.warnings[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">{t("intel.budgetOk")}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </SectionCard>
        </TabsContent>

        <TabsContent value="cascade" className="mt-4">
          <SectionCard title={t("intel.tab.cascade")}>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5 flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("intel.delayDays")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={delayDays}
                  onChange={(e) => setDelayDays(+e.target.value)}
                  className="w-28 mt-1 bg-white"
                />
              </div>
              <Button onClick={runCascade} className="bg-orange-600 hover:bg-orange-700 gap-2" disabled={!selectedMs}>
                <Play className="h-4 w-4" />
                {t("intel.simulateRipple")}
              </Button>
              {!selectedMs && <p className="text-xs text-slate-500">{t("intel.selectMilestonePrompt")}</p>}
            </div>
            {cascade ? (
              <>
                <div className="flex flex-wrap gap-4 mb-4">
                  <ImpactStat label={t("intel.sourceImpact")} value={cascade.source?.code || "—"} sub={cascade.source?.name?.slice(0, 40)} />
                  <ImpactStat label={t("intel.impactedCount")} value={cascade.impacted_count} accent="text-red-600" />
                </div>
                <DataTable captionKey="table.caption.cascadeImpact">
                  <THead>
                    <tr>
                      <Th>{t("table.name")}</Th>
                      <Th>{t("intel.wasRag")}</Th>
                      <Th>{t("intel.simRag")}</Th>
                      <Th>{t("intel.reviewAction")}</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {cascade.impacted?.map((i) => (
                      <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <Td className="py-2 text-sm">{i.name}</Td>
                        <Td><RAGBadge rag={i.previous_rag} showLabel={false} /></Td>
                        <Td><RAGBadge rag={i.simulated_rag} /></Td>
                        <Td className="text-xs text-slate-600">{i.review_action}</Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </>
            ) : (
              <EmptyHint text={t("intel.cascadeHint")} />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="scenario" className="mt-4">
          <SectionCard title={t("intel.tab.scenario")}>
            <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-5 w-5 text-orange-400" />
                <span className="text-sm font-semibold">{t("intel.scenarioIntro")}</span>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <Select value={scenarioType} onValueChange={setScenarioType}>
                  <SelectTrigger className="w-full sm:w-72 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={runScenario} variant="secondary" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0">
                  <Play className="h-4 w-4" />
                  {t("intel.runScenario")}
                </Button>
              </div>
            </div>
            {scenario ? (
              <div className="grid md:grid-cols-2 gap-4">
                <ScenarioBlock
                  title={t("intel.turningAmber")}
                  items={scenario.milestones_turning_amber}
                  color="amber"
                />
                <ScenarioBlock title={t("intel.turningRed")} items={scenario.milestones_turning_red} color="red" />
                <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("intel.budgetGap")}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Manrope" }}>
                    ₹{scenario.budget_gap_cr} Cr
                  </div>
                </div>
                <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="text-xs uppercase tracking-widest text-emerald-800 font-semibold mb-2">
                    {t("intel.mitigation")}
                  </div>
                  <ul className="space-y-2">
                    {scenario.mitigation?.map((m) => (
                      <li key={m} className="text-sm text-slate-700 flex gap-2">
                        <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyHint text={t("intel.scenarioHint")} />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{t("intel.copilotHint")}</p>
        <Link
          to="/copilot"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:underline bg-white border border-orange-200 rounded-lg px-4 py-2"
        >
          <Sparkles className="h-4 w-4" />
          {t("intel.openCopilot")}
        </Link>
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, sub, gradient, highlight, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl bg-gradient-to-br ${gradient} text-white p-4 shadow-sm text-left w-full ${
        highlight ? "ring-2 ring-red-300 ring-offset-2" : ""
      } ${onClick ? "card-hover cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-white/80">{label}</span>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
      <div className="text-[11px] text-white/75 mt-1">{sub}</div>
    </Tag>
  );
}

function UtilBar({ pct }) {
  const n = Math.min(100, Math.max(0, pct || 0));
  const color = n >= 85 ? "bg-red-500" : n >= 65 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${n}%` }} />
      </div>
      <span className="text-xs font-semibold w-8">{n}%</span>
    </div>
  );
}

function LoadingStrip() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
      <div className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      Analyzing…
    </div>
  );
}

function EmptyHint({ text }) {
  return <p className="text-sm text-slate-500 py-6 text-center">{text}</p>;
}

function ImpactStat({ label, value, sub, accent }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 min-w-[140px]">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent || "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 truncate max-w-[200px]">{sub}</div>}
    </div>
  );
}

function ScenarioBlock({ title, items, color }) {
  const styles =
    color === "red"
      ? "border-red-200 bg-red-50/50 text-red-900"
      : "border-amber-200 bg-amber-50/50 text-amber-900";
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="text-xs uppercase tracking-widest font-bold opacity-80 mb-2">{title}</div>
      {items?.length ? (
        <ul className="text-sm space-y-1 list-disc pl-4 opacity-90">
          {items.slice(0, 6).map((name) => (
            <li key={name} className="line-clamp-1">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm opacity-70">—</span>
      )}
    </div>
  );
}
