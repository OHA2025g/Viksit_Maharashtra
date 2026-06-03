import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Flag,
  LayoutGrid,
  List,
  ListTodo,
  Search,
  Sprout,
  Target,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function Departments() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ranks, setRanks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("progress");
  const [view, setView] = useState("cards");

  useEffect(() => {
    api.get("/analytics/department-rank").then(({ data }) => setRanks(data || []));
    api.get("/watchlist").then(({ data }) => setWatchlist(data?.items || [])).catch(() => {});
  }, []);

  const summary = useMemo(() => {
    const delayed = ranks.reduce((s, d) => s + (d.delayed || 0), 0);
    const avgProgress =
      ranks.length > 0 ? (ranks.reduce((s, d) => s + (d.completion_pct || 0), 0) / ranks.length).toFixed(1) : "0";
    const atRisk = ranks.filter((d) => d.rag === "red" || d.rag === "amber").length;
    return {
      total: ranks.length,
      initiatives: ranks.reduce((s, d) => s + (d.initiatives || 0), 0),
      milestones: ranks.reduce((s, d) => s + (d.milestones || 0), 0),
      delayed,
      avgProgress,
      atRisk,
    };
  }, [ranks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = ranks;
    if (q) {
      list = list.filter(
        (d) => d.name?.toLowerCase().includes(q) || d.head?.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "delayed") return (b.delayed || 0) - (a.delayed || 0);
      if (sortBy === "initiatives") return (b.initiatives || 0) - (a.initiatives || 0);
      if (sortBy === "milestones") return (b.milestones || 0) - (a.milestones || 0);
      return (a.completion_pct || 0) - (b.completion_pct || 0);
    });
    return sorted;
  }, [ranks, search, sortBy]);

  const attentionDepts = useMemo(
    () =>
      [...ranks]
        .filter((d) => d.rag === "red" || d.rag === "amber" || (d.delayed || 0) > 5)
        .sort((a, b) => (a.completion_pct || 0) - (b.completion_pct || 0))
        .slice(0, 4),
    [ranks],
  );

  const openDept = (id) => navigate(`/departments/${id}`);

  return (
    <div className="space-y-8">
      <PageHeader eyebrowKey="page.departments.eyebrow" titleKey="page.departments.title" subtitleKey="page.departments.subtitle" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryTile icon={Building2} label={t("dept.summary.total")} value={summary.total} sub={t("dept.summary.totalSub")} accent="from-slate-700 to-slate-900" />
        <SummaryTile icon={Target} label={t("dept.initiatives")} value={summary.initiatives} sub={t("dept.summary.initiativesSub")} accent="from-blue-600 to-blue-700" />
        <SummaryTile icon={Flag} label={t("dept.milestones")} value={summary.milestones} sub={t("dept.summary.milestonesSub")} accent="from-violet-600 to-violet-700" />
        <SummaryTile icon={AlertTriangle} label={t("dept.delayed")} value={summary.delayed} sub={t("dept.summary.delayedSub")} accent="from-amber-600 to-orange-600" highlight={summary.delayed > 20} />
        <SummaryTile icon={Building2} label={t("dept.summary.avgProgress")} value={`${summary.avgProgress}%`} sub={t("dept.summary.atRisk").replace("{count}", summary.atRisk)} accent="from-emerald-600 to-emerald-700" />
      </div>

      <Link to="/agriculture/departments" data-testid="agri-shortcut-depts" className="block">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between card-hover">
          <div className="flex items-center gap-3">
            <Sprout className="h-5 w-5 text-emerald-700" />
            <div>
              <div className="text-sm font-semibold">{t("dept.agriShortcut")}</div>
              <div className="text-xs text-slate-600">{t("dept.agriMeta")}</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-700" />
        </div>
      </Link>

      {attentionDepts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">{t("dept.attention.title")}</h3>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {attentionDepts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => openDept(d.id)}
                className="text-left rounded-lg border bg-white p-3 card-hover hover:border-orange-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{d.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.completion_pct}% · {d.delayed} {t("dept.delayed").toLowerCase()}</div>
                  </div>
                  <RAGBadge rag={d.rag} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <SectionCard
        titleKey="dept.watchlistTitle"
        action={<Link to="/watchlist" className="text-xs text-orange-600 inline-flex items-center gap-1"><ListTodo className="h-3 w-3" /> {t("dept.fullWatchlist")}</Link>}
      >
        <div className="space-y-2">
          {watchlist.length === 0 && <p className="text-sm text-slate-500">{t("dept.noStuck")}</p>}
          {watchlist.slice(0, 6).map((w) => (
            <div key={w.id} className="flex items-center justify-between text-sm border-b pb-2">
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-medium truncate">{w.name}</div>
                <div className="text-[11px] text-slate-500">{(w.reasons || []).slice(0, 2).join(" · ")}</div>
              </div>
              <RAGBadge rag={w.rag || "amber"} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard titleKey="dept.rankingTitle">
        <ChartRegion labelKey="chart.deptRank">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ranks} layout="vertical" margin={{ left: 200, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 10, fill: "#475569" }} />
              <Tooltip />
              <Bar dataKey="completion_pct" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(data) => data?.payload?.id && openDept(data.payload.id)}>
                {ranks.map((d) => (
                  <Cell key={d.id} fill={RAG_COLORS[d.rag]?.solid || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartRegion>
      </SectionCard>

      <SectionCard titleKey="dept.dashboardTitle" subtitle={t("dept.dashboardHint")}>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("dept.searchPlaceholder")}
              className="pl-9"
              aria-label={t("dept.searchPlaceholder")}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("dept.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="progress">{t("dept.sort.progress")}</SelectItem>
              <SelectItem value="delayed">{t("dept.sort.delayed")}</SelectItem>
              <SelectItem value="initiatives">{t("dept.sort.initiatives")}</SelectItem>
              <SelectItem value="milestones">{t("dept.sort.milestones")}</SelectItem>
              <SelectItem value="name">{t("dept.sort.name")}</SelectItem>
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
              {t("dept.view.cards")}
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "table" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
              aria-pressed={view === "table"}
            >
              <List className="h-3.5 w-3.5" />
              {t("dept.view.table")}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">{t("dept.empty.search")}</p>
        ) : view === "cards" ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DeptCard key={d.id} dept={d} onOpen={() => openDept(d.id)} t={t} />
            ))}
          </div>
        ) : (
          <DataTable captionKey="table.caption.departmentDashboard">
            <THead>
              <tr>
                <ThKey labelKey="dept.department" />
                <ThKey labelKey="dept.head" />
                <ThKey labelKey="dept.initiatives" />
                <ThKey labelKey="dept.milestones" />
                <ThKey labelKey="table.progress" />
                <ThKey labelKey="dept.delayed" />
                <ThKey labelKey="table.rag" />
                <Th className="w-16" />
              </tr>
            </THead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  data-testid={`dept-row-${d.id}`}
                  className="border-b border-slate-100 hover:bg-orange-50/50 cursor-pointer group"
                  onClick={() => openDept(d.id)}
                  onKeyDown={(e) => e.key === "Enter" && openDept(d.id)}
                  tabIndex={0}
                  role="link"
                >
                  <Td className="font-medium group-hover:text-orange-700">{d.name}</Td>
                  <Td className="text-xs text-slate-600">{d.head}</Td>
                  <Td>{d.initiatives}</Td>
                  <Td>{d.milestones}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${d.completion_pct}%`, background: RAG_COLORS[d.rag]?.solid }} />
                      </div>
                      <span className="text-xs font-mono">{d.completion_pct}%</span>
                    </div>
                  </Td>
                  <Td className={d.delayed > 5 ? "text-red-600 font-semibold" : ""}>{d.delayed}</Td>
                  <Td><RAGBadge rag={d.rag} /></Td>
                  <Td>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-600" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, sub, accent, highlight }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${accent} text-white p-4 shadow-sm ${highlight ? "ring-2 ring-red-300 ring-offset-2" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">{label}</span>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "Manrope" }}>{value}</div>
      {sub && <div className="text-xs text-white/75 mt-1">{sub}</div>}
    </div>
  );
}

function DeptCard({ dept, onOpen, t }) {
  const color = RAG_COLORS[dept.rag]?.solid || "#94a3b8";
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`dept-card-${dept.id}`}
      className="text-left w-full rounded-xl border border-slate-200 bg-white p-4 card-hover hover:border-orange-200 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug group-hover:text-orange-700">{dept.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{dept.head}</div>
        </div>
        <RAGBadge rag={dept.rag} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">{t("table.progress")}</span>
          <span className="font-mono font-semibold">{dept.completion_pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${dept.completion_pct}%`, background: color }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MetricPill label={t("dept.initiatives")} value={dept.initiatives} />
        <MetricPill label={t("dept.milestones")} value={dept.milestones} />
        <MetricPill label={t("dept.delayed")} value={dept.delayed} warn={dept.delayed > 5} />
      </div>
      <div className="mt-3 flex items-center justify-end text-xs font-medium text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
        {t("dept.viewDetail")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </div>
    </button>
  );
}

function MetricPill({ label, value, warn }) {
  return (
    <div className={`rounded-lg py-1.5 px-1 ${warn ? "bg-red-50" : "bg-slate-50"}`}>
      <div className={`text-sm font-bold ${warn ? "text-red-700" : "text-slate-900"}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500 truncate">{label}</div>
    </div>
  );
}
