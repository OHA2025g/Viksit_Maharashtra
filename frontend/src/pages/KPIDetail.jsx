import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from "recharts";

export default function KPIDetail() {
  const { kpiId } = useParams();
  const [kpi, setKpi] = useState(null);
  const [theme, setTheme] = useState(null);
  const [department, setDepartment] = useState(null);
  const [anomaly, setAnomaly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    api.get(`/kpis/${kpiId}`)
      .then(async ({ data: k }) => {
        if (!active) return;
        const [themeRes, deptRes, anomalyRes] = await Promise.all([
          api.get(`/themes/${k.theme_id}`),
          api.get("/departments"),
          api.get("/kpis/anomalies").catch(() => ({ data: { anomalies: [] } })),
        ]);
        if (!active) return;
        setKpi(k);
        setTheme(themeRes.data);
        setDepartment(deptRes.data.find((d) => d.id === k.department_id) || null);
        const found = (anomalyRes.data?.anomalies || []).find((a) => a.kpi_id === kpiId);
        setAnomaly(found || null);
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
  }, [kpiId]);

  const trajectory = useMemo(() => {
    if (!kpi) return [];
    return [
      { label: "Baseline", value: kpi.baseline_value },
      { label: "Current", value: kpi.current_value },
      { label: "2029", value: kpi.target_2029 },
      { label: "2035", value: kpi.target_2035 },
      { label: "2047", value: kpi.target_2047 },
    ];
  }, [kpi]);

  const progressTo2029 = useMemo(() => {
    if (!kpi) return 0;
    const span = kpi.target_2029 - kpi.baseline_value;
    if (span === 0) return 100;
    const pct = ((kpi.current_value - kpi.baseline_value) / span) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }, [kpi]);

  if (loading) return <div className="text-slate-500 text-sm">Loading KPI…</div>;
  if (notFound) return <Navigate to="/kpis" replace />;

  const healthRag = kpi.health === "green" ? "green" : kpi.health === "red" ? "red" : "amber";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <Link to="/themes" className="inline-flex items-center gap-1 hover:text-orange-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Themes
        </Link>
        <span>/</span>
        <Link to={`/themes/${kpi.theme_id}`} className="hover:text-orange-600">{theme?.name}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{kpi.code}</span>
      </div>

      <PageHeader
        eyebrow={theme?.name || "KPI"}
        title={kpi.name}
        subtitle={`${kpi.unit} · ${kpi.reporting_frequency} · ${kpi.data_source}`}
        actions={<RAGBadge rag={healthRag} />}
      />

      {anomaly && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Anomaly detected:</span>{" "}
          {(anomaly.flags || []).join(" · ") || "Review current value against expected trajectory."}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Stat label="Current" value={kpi.current_value} accent={RAG_COLORS[healthRag]?.solid} sub={kpi.unit} />
        <Stat label="Baseline" value={kpi.baseline_value} sub={kpi.unit} />
        <Stat label="2029 target" value={kpi.target_2029} sub={kpi.unit} />
        <Stat label="Progress to 2029" value={`${progressTo2029}%`} accent={RAG_COLORS[healthRag]?.solid} />
        <Stat label="2035 target" value={kpi.target_2035} sub={kpi.unit} />
        <Stat label="2047 target" value={kpi.target_2047} sub={kpi.unit} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Target trajectory">
          <ChartRegion label={`KPI trajectory chart for ${kpi.name}`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trajectory} margin={{ left: 8, right: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip formatter={(v) => [`${v} ${kpi.unit}`, "Value"]} />
                <ReferenceLine y={kpi.target_2029} stroke="#0F172A" strokeDasharray="4 4" label={{ value: "2029", position: "right", fontSize: 10 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {trajectory.map((row) => (
                    <Cell
                      key={row.label}
                      fill={
                        row.label === "Current"
                          ? RAG_COLORS[healthRag]?.solid
                          : row.label === "Baseline"
                            ? "#94A3B8"
                            : "#CBD5E1"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>

        <SectionCard title="KPI metadata">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Code" value={kpi.code} />
            <Detail label="Health" value={kpi.health} />
            <Detail label="Department" value={department?.name?.replace(" Department", "")} />
            <Detail label="Remarks" value={kpi.remarks} />
            <Detail label="Last updated" value={kpi.last_updated?.slice(0, 10)} />
            <Detail label="Reporting" value={kpi.reporting_frequency} />
          </dl>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to={`/kpis?theme_id=${kpi.theme_id}`}
              className="text-xs font-semibold text-orange-600 inline-flex items-center gap-1"
            >
              All KPIs in this theme <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Milestone targets">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TargetCard year="Baseline" value={kpi.baseline_value} unit={kpi.unit} />
          <TargetCard year="Current" value={kpi.current_value} unit={kpi.unit} highlight />
          <TargetCard year="2029" value={kpi.target_2029} unit={kpi.unit} />
          <TargetCard year="2035" value={kpi.target_2035} unit={kpi.unit} />
          <TargetCard year="2047" value={kpi.target_2047} unit={kpi.unit} />
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
      <div className="text-xl font-bold mt-1" style={{ fontFamily: "Manrope", color: accent || "#0F172A" }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value ?? "—"}</dd>
    </>
  );
}

function TargetCard({ year, value, unit, highlight }) {
  return (
    <div className={`rounded-lg border p-4 text-center ${highlight ? "border-orange-200 bg-orange-50/40" : "border-slate-200"}`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{year}</div>
      <div className="text-2xl font-bold mt-1" style={{ fontFamily: "Manrope" }}>{value}</div>
      <div className="text-[11px] text-slate-500">{unit}</div>
    </div>
  );
}
