import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, formatCrore, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import {
  ArrowLeft, ArrowRight, Sprout, Target, Flag, BarChart3, Wallet, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

const AGRI_THEME_ID = "t1";

export default function ThemeDetail() {
  const { themeId } = useParams();
  const [theme, setTheme] = useState(null);
  const [pillar, setPillar] = useState(null);
  const [department, setDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/themes/${themeId}`),
      api.get("/pillars"),
      api.get("/departments"),
      api.get("/analytics/overview"),
      api.get("/initiatives", { params: { theme_id: themeId } }),
      api.get("/milestones", { params: { theme_id: themeId } }),
      api.get("/kpis", { params: { theme_id: themeId } }),
    ])
      .then(([themeRes, pillarsRes, deptsRes, overviewRes, initsRes, msRes, kpisRes]) => {
        if (!active) return;
        const pillars = pillarsRes.data;
        const depts = deptsRes.data;
        const t = themeRes.data;
        const overviewTheme = (overviewRes.data?.themes || []).find((x) => x.id === themeId);

        setTheme(t);
        setPillar(pillars.find((p) => p.id === t.pillar_id) || null);
        setDepartment(depts.find((d) => d.id === t.owner_department_id) || null);
        setDepartments(depts);
        setStats(overviewTheme || null);
        setInitiatives(initsRes.data);
        setMilestones(msRes.data);
        setKpis(kpisRes.data);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [themeId]);

  const delayedMilestones = useMemo(
    () => milestones.filter((m) => ["Delayed", "At Risk", "Blocked"].includes(m.status)).slice(0, 8),
    [milestones],
  );

  const initiativeChart = useMemo(
    () =>
      initiatives.slice(0, 8).map((i) => ({
        name: i.name.length > 22 ? `${i.name.slice(0, 22)}…` : i.name,
        completion_pct: i.completion_pct ?? 0,
        rag: i.rag,
      })),
    [initiatives],
  );

  if (loading) return <div className="text-slate-500 text-sm">Loading theme…</div>;
  if (notFound) return <Navigate to="/themes" replace />;

  const completion = stats?.completion_pct ?? 0;
  const rag = stats?.rag || "grey";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/themes" className="inline-flex items-center gap-1 hover:text-orange-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Themes
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{theme.name}</span>
      </div>

      <PageHeader
        eyebrow={pillar?.name || "Theme"}
        title={theme.name}
        subtitle={theme.objective}
        actions={<RAGBadge rag={rag} />}
      />

      {themeId === AGRI_THEME_ID && (
        <Link to="/agriculture" data-testid="theme-agri-mission" className="block">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-600 flex items-center justify-center">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Mission drill-down</div>
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>
                  Agriculture mission monitoring · milestones, tasks & departments
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
              Open mission <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Progress" value={`${completion}%`} accent={RAG_COLORS[rag]?.solid} />
        <StatCard label="Initiatives" value={stats?.initiatives ?? initiatives.length} />
        <StatCard label="Milestones" value={stats?.milestones ?? milestones.length} />
        <StatCard label="KPIs" value={stats?.kpis ?? kpis.length} />
        <StatCard
          label="Budget used"
          value={formatCrore(stats?.budget_utilized ?? 0)}
          sub={`of ${formatCrore(stats?.budget_allocated ?? 0)}`}
        />
        <StatCard label="Owner dept." value={department?.name?.split(" ")[0] || "—"} sub={department?.head} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DrillLink to={`/initiatives?theme_id=${themeId}`} icon={Target} label="Initiatives" count={initiatives.length} testId="drill-initiatives" />
        <DrillLink to={`/milestones?theme_id=${themeId}`} icon={Flag} label="Milestones" count={milestones.length} testId="drill-milestones" />
        <DrillLink to={`/kpis?theme_id=${themeId}`} icon={BarChart3} label="KPIs" count={kpis.length} testId="drill-kpis" />
        <DrillLink to={`/risks?theme_id=${themeId}`} icon={AlertTriangle} label="Risks" testId="drill-risks" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Initiative completion">
          <ChartRegion label={`Bar chart of initiative completion for ${theme.name}`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={initiativeChart} margin={{ left: 0, right: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-25} textAnchor="end" interval={0} height={60} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: "#64748B" }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="completion_pct" radius={[6, 6, 0, 0]}>
                  {initiativeChart.map((row) => (
                    <Cell key={row.name} fill={RAG_COLORS[row.rag]?.solid || RAG_COLORS.grey.solid} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>

        <SectionCard
          title="Delayed milestones"
          action={
            milestones.length > 0 ? (
              <Link to={`/milestones?theme_id=${themeId}&status=Delayed`} className="text-xs font-medium text-orange-600">
                View all →
              </Link>
            ) : null
          }
        >
          <div className="space-y-2">
            {delayedMilestones.length === 0 && (
              <p className="text-sm text-slate-500">No delayed milestones for this theme.</p>
            )}
            {delayedMilestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.status} · {m.completion_pct}%</div>
                </div>
                <RAGBadge rag={m.rag} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Initiatives in this theme"
        action={
          <Link to={`/initiatives?theme_id=${themeId}`} className="text-xs font-medium text-orange-600 inline-flex items-center gap-1">
            Full portfolio <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <DataTable caption={`Initiatives under ${theme.name}`}>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Department</Th>
              <ThKey labelKey="table.progress" />
              <Th>Budget</Th>
              <ThKey labelKey="table.rag" />
            </tr>
          </THead>
          <tbody>
            {initiatives.map((i) => (
              <tr key={i.id} data-testid={`theme-initiative-${i.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                <Td className="font-medium max-w-xs">
                  <Link
                    to={`/initiatives/${i.id}`}
                    className="text-slate-900 hover:text-orange-600 inline-flex items-center gap-1 group"
                  >
                    {i.name}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                </Td>
                <Td className="text-xs text-slate-600">
                  {departments.find((d) => d.id === i.lead_department_id)?.name?.replace(" Department", "") || "—"}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${i.completion_pct || 0}%`, background: RAG_COLORS[i.rag]?.solid }} />
                    </div>
                    <span className="text-xs font-mono">{i.completion_pct || 0}%</span>
                  </div>
                </Td>
                <Td className="text-xs">{formatCrore(i.budget_utilized || 0)} / {formatCrore(i.budget_estimate || 0)}</Td>
                <Td><RAGBadge rag={i.rag} /></Td>
              </tr>
            ))}
            {initiatives.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-8">No initiatives found for this theme.</td></tr>
            )}
          </tbody>
        </DataTable>
      </SectionCard>

      <SectionCard
        title="KPI health"
        action={
          kpis.length > 0 ? (
            <Link to={`/kpis?theme_id=${themeId}`} className="text-xs font-medium text-orange-600 inline-flex items-center gap-1">
              KPI dashboard <Wallet className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      >
        <div className="grid grid-cols-3 gap-4 mb-4">
          <MiniStat label="On track" value={kpis.filter((k) => k.health === "green").length} color="#16A34A" />
          <MiniStat label="Watch" value={kpis.filter((k) => k.health === "amber").length} color="#D97706" />
          <MiniStat label="Off track" value={kpis.filter((k) => k.health === "red").length} color="#DC2626" />
        </div>
        <div className="space-y-2">
          {kpis.map((k) => (
            <Link
              key={k.id}
              to={`/kpis/${k.id}`}
              data-testid={`theme-kpi-${k.id}`}
              className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="font-medium truncate group-hover:text-orange-700">{k.name}</div>
                <div className="text-[11px] text-slate-500">
                  {k.current_value} / {k.target_2029} {k.unit}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RAGBadge rag={k.health === "green" ? "green" : k.health === "red" ? "red" : "amber"} />
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </div>
            </Link>
          ))}
          {kpis.length === 0 && <p className="text-sm text-slate-500">No KPIs registered for this theme.</p>}
        </div>
      </SectionCard>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ fontFamily: "Manrope", color: accent || "#0F172A" }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="border border-slate-200 rounded-md p-3 text-center">
      <div className="text-2xl font-bold" style={{ fontFamily: "Manrope", color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function DrillLink({ to, icon: Icon, label, count, testId }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 card-hover"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-orange-600 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          {count != null && <div className="text-[11px] text-slate-500">{count} records</div>}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
    </Link>
  );
}
