import React, { useEffect, useState } from "react";
import { api, RAG_COLORS, formatCrore } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DashboardCard } from "@/components/DashboardCard";
import { RAGBadge } from "@/components/RAGBadge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowRight, Sprout, ListTodo } from "lucide-react";

export default function ExecutiveDashboard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const { user, period } = useApp();

  useEffect(() => {
    api.get("/analytics/overview").then(({ data }) => setData(data));
    api.get("/watchlist").then(({ data }) => setWatchlist(data?.items || data || [])).catch(() => {});
  }, []);

  if (!data) {
    return <div className="text-sm text-slate-500">{t("exec.loading")}</div>;
  }

  const { summary, pillars, themes, top_delayed_milestones, top_risk_initiatives } = data;

  const ragDonut = [
    { name: t("exec.ragGreen"), value: summary.green_milestones, color: RAG_COLORS.green.solid },
    { name: t("exec.ragAmber"), value: summary.amber_milestones, color: RAG_COLORS.amber.solid },
    { name: t("exec.ragRed"), value: summary.red_milestones, color: RAG_COLORS.red.solid },
    { name: t("exec.ragClosed"), value: summary.blue_milestones, color: RAG_COLORS.blue.solid },
  ];

  const timeline = [
    { year: "2025", target: 25, actual: summary.vision_progress_pct },
    { year: "2029", target: 50, actual: null },
    { year: "2035", target: 75, actual: null },
    { year: "2047", target: 100, actual: null },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${t("exec.welcome")}, ${user?.name || "Officer"}`}
        titleKey="page.executive.title"
        subtitle={`${t("exec.subtitlePrefix")} ${period}`}
      />

      {/* Agriculture Mission shortcut */}
      <Link to="/agriculture" data-testid="agri-shortcut-exec" className="block">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg p-5 flex items-center justify-between card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-white/15 flex items-center justify-center">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-100 font-bold">{t("exec.agriBadge")}</div>
              <div className="text-lg font-bold" style={{ fontFamily: "Manrope" }}>{t("exec.agriTitle")}</div>
              <div className="text-xs text-emerald-100 mt-0.5">{t("exec.agriMeta")}</div>
            </div>
          </div>
          <div className="text-xs font-semibold inline-flex items-center gap-1">{t("exec.agriOpen")} <ArrowRight className="h-4 w-4" /></div>
        </div>
      </Link>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          testId="card-vision-progress"
          title={t("exec.visionProgress")}
          value={`${summary.vision_progress_pct}%`}
          trend={+3.2}
          rag={summary.vision_progress_pct >= 60 ? "green" : summary.vision_progress_pct >= 35 ? "amber" : "red"}
          explanation={t("exec.visionExplain")}
          drilldownTo="/pillars"
        />
        <DashboardCard
          testId="card-budget-util"
          title={t("exec.budgetUtil")}
          value={`${summary.budget_utilization_pct}%`}
          trend={+1.4}
          rag={summary.budget_utilization_pct >= 65 ? "green" : "amber"}
          explanation={`${formatCrore(summary.budget_utilized)} ${t("exec.budgetExplainPrefix")} ${formatCrore(summary.budget_allocated)} ${t("exec.budgetExplainSuffix")}`}
          drilldownTo="/budget"
        />
        <DashboardCard
          testId="card-kpi-health"
          title={t("exec.kpiHealth")}
          value={`${summary.kpi_green}/${summary.kpi_total}`}
          rag={summary.kpi_green / summary.kpi_total >= 0.55 ? "green" : "amber"}
          explanation={`${summary.kpi_red} ${t("exec.kpiExplainPrefix")}`}
          drilldownTo="/kpis"
        />
        <DashboardCard
          testId="card-risks"
          title={t("exec.openRisks")}
          value={summary.open_risks}
          rag={summary.escalated_risks > 5 ? "red" : "amber"}
          explanation={`${summary.escalated_risks} ${t("exec.risksExplainPrefix")} ${summary.overdue_action_items} ${t("exec.risksExplainSuffix")}`}
          drilldownTo="/risks"
        />
      </div>

      {/* Pillar cards */}
      <SectionCard titleKey="exec.strategicPillars" action={<Link to="/pillars" className="text-xs font-medium text-orange-600 inline-flex items-center gap-1">{t("exec.viewAllShort")} <ArrowRight className="h-3 w-3" /></Link>}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p) => (
            <Link to={`/pillars`} key={p.id} data-testid={`pillar-card-${p.id}`} className="block">
              <div className="border border-slate-200 rounded-lg p-5 card-hover bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm" style={{ background: p.color }}>
                    {p.name.charAt(0)}
                  </div>
                  <RAGBadge rag={p.rag} />
                </div>
                <h4 className="text-base font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>{p.name}</h4>
                <div className="text-3xl font-bold text-slate-900 mt-3" style={{ fontFamily: "Manrope" }}>{p.completion_pct}%</div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${p.completion_pct}%`, background: p.color }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div><div className="font-semibold text-slate-700">{p.themes_count}</div>{t("exec.themesLabel")}</div>
                  <div><div className="font-semibold text-slate-700">{p.initiatives_count}</div>{t("exec.initiativesLabel")}</div>
                  <div><div className="font-semibold text-slate-700">{p.milestones_count}</div>{t("exec.milestonesLabel")}</div>
                </div>
                <div className="mt-3 text-[11px] text-red-600 font-medium">
                  {p.delayed_milestones} {t("exec.delayed")} · {p.at_risk_milestones} {t("exec.atRisk")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard titleKey="exec.ragStatus" className="lg:col-span-1">
          <ChartRegion labelKey="chart.ragDonut">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={ragDonut}
                dataKey="value"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {ragDonut.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>

        <SectionCard titleKey="exec.pillarCompletion" className="lg:col-span-2">
          <ChartRegion labelKey="chart.pillarCompletion">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pillars} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
              <Tooltip />
              <Bar dataKey="completion_pct" radius={[6, 6, 0, 0]}>
                {pillars.map((p) => <Cell key={p.id} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>
      </div>

      {/* Theme RAG matrix + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard titleKey="exec.themeMatrix" className="lg:col-span-2" action={<Link to="/themes" className="text-xs font-medium text-orange-600">{t("exec.viewAllThemes")}</Link>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((theme) => (
              <Link key={theme.id} to={`/themes/${theme.id}`} data-testid={`theme-tile-${theme.id}`} className="block border border-slate-200 rounded-md p-3 hover:border-orange-300 hover:bg-orange-50/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: RAG_COLORS[theme.rag].solid }} />
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">{theme.completion_pct}%</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2rem]">{theme.name}</div>
                <div className="mt-2 h-1 bg-slate-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${theme.completion_pct}%`, background: RAG_COLORS[theme.rag].solid }} />
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard titleKey="exec.visionTimeline">
          <ChartRegion labelKey="chart.visionTimeline">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="target" stroke="#0F172A" strokeWidth={2} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="actual" stroke="#F97316" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>
      </div>

      {/* Stuck watchlist */}
      <SectionCard
        title={t("exec.watchlistTitle")}
        action={<Link to="/watchlist" className="text-xs font-medium text-orange-600 inline-flex items-center gap-1"><ListTodo className="h-3 w-3" /> {t("exec.viewAll")}</Link>}
      >
        <div className="space-y-2">
          {watchlist.length === 0 && <div className="text-sm text-slate-500">{t("exec.noStuckItems")}</div>}
          {watchlist.slice(0, 5).map((w) => (
            <div key={w.id || w.milestone_id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{w.name || w.milestone_name}</div>
                <div className="text-[11px] text-slate-500">{w.reason || w.watch_reason} · {w.department || w.owner || "—"}</div>
              </div>
              <RAGBadge rag={w.rag || "amber"} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Two lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t("exec.topDelayed")} action={<Link to="/milestones?rag=red" className="text-xs font-medium text-orange-600">{t("exec.viewAllArrow")}</Link>}>
          <div className="space-y-2">
            {top_delayed_milestones.length === 0 && <div className="text-sm text-slate-500">{t("exec.noDelayed")}</div>}
            {top_delayed_milestones.slice(0, 6).map((m) => (
              <div key={m.id} data-testid={`delayed-${m.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.status} · {m.code}</div>
                </div>
                <div className="text-xs font-bold text-red-600 ml-3">{m.delay_days}{t("exec.daysLate")}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t("exec.topHighRisk")} action={<Link to="/risks" className="text-xs font-medium text-orange-600">{t("exec.viewRisks")}</Link>}>
          <div className="space-y-2">
            {top_risk_initiatives.slice(0, 6).map((r) => (
              <div key={r.id} data-testid={`risk-init-${r.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                  <div className="text-[11px] text-slate-500">{r.code} · {r.priority}</div>
                </div>
                <div className="text-xs font-bold text-orange-600 ml-3">{t("exec.scoreLabel")} {r.risk_score}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
