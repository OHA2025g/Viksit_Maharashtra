import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { useI18n } from "@/contexts/I18nContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function KPIs() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [kpis, setKpis] = useState([]);
  const [themes, setThemes] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [themeFilter, setThemeFilter] = useState(params.get("theme_id") || "all");
  const highlightKpiId = params.get("kpi_id");

  useEffect(() => {
    api.get("/kpis").then(({ data }) => setKpis(data));
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/kpis/anomalies").then(({ data }) => setAnomalies(data?.anomalies || [])).catch(() => {});
  }, []);

  const anomalyMap = Object.fromEntries(anomalies.map((a) => [a.kpi_id, a]));

  const filtered = kpis.filter((k) => themeFilter === "all" || k.theme_id === themeFilter);
  const themeMap = Object.fromEntries(themes.map((t) => [t.id, t]));

  const summary = {
    total: filtered.length,
    green: filtered.filter((k) => k.health === "green").length,
    amber: filtered.filter((k) => k.health === "amber").length,
    red: filtered.filter((k) => k.health === "red").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.kpis.eyebrow"
        titleKey="page.kpis.title"
        subtitleKey="page.kpis.subtitle"
        actions={
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-64" data-testid="kpi-theme-filter" aria-label={t("filter.allThemes")}>
              <SelectValue placeholder={t("filter.allThemes")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("filter.allThemes")}</SelectItem>
              {themes.map((th) => <SelectItem key={th.id} value={th.id}>{th.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <Stat labelKey="stat.totalKpis" value={summary.total} color="#0F172A" t={t} />
        <Stat labelKey="stat.onTrack" value={summary.green} color="#16A34A" t={t} />
        <Stat labelKey="stat.minorGap" value={summary.amber} color="#F59E0B" t={t} />
        <Stat labelKey="stat.offTrack" value={summary.red} color="#DC2626" t={t} />
      </div>

      {anomalies.length > 0 && (
        <SectionCard title={`KPI Anomalies Detected (${anomalies.length})`}>
          <div className="flex flex-wrap gap-2">
            {anomalies.slice(0, 8).map((a) => (
              <Link
                key={a.kpi_id}
                to={`/kpis/${a.kpi_id}`}
                className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100"
                title={a.flags?.join("; ")}
              >
                {a.kpi_name?.slice(0, 40)} — Anomaly
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="KPI Target vs Current (2029)">
        <ChartRegion labelKey="chart.kpiTarget">
          <ResponsiveContainer width="100%" height={Math.max(360, filtered.length * 24)}>
            <BarChart data={filtered.slice(0, 30)} layout="vertical" margin={{ left: 200, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10, fill: "#475569" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current_value" fill="#F97316" name="Current" />
              <Bar dataKey="target_2029" fill="#0F172A" name="2029 Target" />
            </BarChart>
          </ResponsiveContainer>
        </ChartRegion>
      </SectionCard>

      <SectionCard title="KPI Register">
        <DataTable captionKey="table.caption.kpiRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <ThKey labelKey="table.name" />
              <ThKey labelKey="table.theme" />
              <ThKey labelKey="table.unit" />
              <ThKey labelKey="table.baseline" />
              <ThKey labelKey="table.current" />
              <ThKey labelKey="table.target2029" />
              <ThKey labelKey="table.target2035" />
              <ThKey labelKey="table.target2047" />
              <ThKey labelKey="table.health" />
              <ThKey labelKey="table.anomaly" />
            </tr>
          </THead>
          <tbody>
            {filtered.map((k) => (
              <tr
                key={k.id}
                data-testid={`kpi-row-${k.id}`}
                className={`border-b border-slate-100 hover:bg-slate-50 ${highlightKpiId === k.id ? "bg-orange-50" : ""}`}
              >
                <Td className="font-mono text-xs">{k.code}</Td>
                <Td className="font-medium">
                  <Link to={`/kpis/${k.id}`} className="text-slate-900 hover:text-orange-600">
                    {k.name}
                  </Link>
                </Td>
                <Td className="text-xs text-slate-600">{themeMap[k.theme_id]?.name?.slice(0, 25)}</Td>
                <Td className="text-xs">{k.unit}</Td>
                <Td className="text-xs">{k.baseline_value}</Td>
                <Td className="text-xs font-bold" style={{ color: RAG_COLORS[k.health].solid }}>{k.current_value}</Td>
                <Td className="text-xs">{k.target_2029}</Td>
                <Td className="text-xs">{k.target_2035}</Td>
                <Td className="text-xs">{k.target_2047}</Td>
                <Td><RAGBadge rag={k.health} /></Td>
                <Td>
                  {anomalyMap[k.id] ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded" title={anomalyMap[k.id].flags?.join("; ")}>Anomaly</span>
                  ) : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>
    </div>
  );
}

function Stat({ labelKey, value, color, t }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t(labelKey)}</div>
      <div className="text-4xl font-bold mt-2" style={{ fontFamily: "Manrope", color }}>{value}</div>
    </div>
  );
}
