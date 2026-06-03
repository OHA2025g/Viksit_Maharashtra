import React, { useEffect, useState } from "react";
import { api, RAG_COLORS, formatCrore } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Link } from "react-router-dom";
import { Sprout, ArrowRight, ChevronRight } from "lucide-react";

export default function Themes() {
  const [overview, setOverview] = useState(null);
  const [pillars, setPillars] = useState([]);
  const [pillarFilter, setPillarFilter] = useState("all");

  useEffect(() => {
    api.get("/analytics/overview").then(({ data }) => setOverview(data));
    api.get("/pillars").then(({ data }) => setPillars(data));
  }, []);

  if (!overview) return <div className="text-slate-500 text-sm">Loading themes…</div>;

  const themes = overview.themes.filter((t) => pillarFilter === "all" || t.pillar_id === pillarFilter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowKey="page.themes.eyebrow"
        titleKey="page.themes.title"
        subtitleKey="page.themes.subtitle"
        actions={
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-56" data-testid="theme-pillar-filter">
              <SelectValue placeholder="Filter by Pillar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pillars</SelectItem>
              {pillars.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Agriculture drill-down shortcut */}
      <Link to="/agriculture" data-testid="agri-shortcut-themes" className="block">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-600 flex items-center justify-center">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Drill-Down Module</div>
              <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>Agriculture, Allied Sectors & Rural · Mission Monitoring</div>
              <div className="text-xs text-slate-600">203 sub-tasks · 53 tasks · 10 milestones · 9 departments</div>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">Open Mission <ArrowRight className="h-4 w-4" /></div>
        </div>
      </Link>

      <SectionCard title="Completion by Theme">
        <ChartRegion labelKey="chart.themeCompletion">
        <ResponsiveContainer width="100%" height={350}>          <BarChart data={themes} margin={{ left: 0, right: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-30} textAnchor="end" interval={0} height={80} />
            <YAxis unit="%" tick={{ fontSize: 11, fill: "#64748B" }} />
            <Tooltip />
            <Bar dataKey="completion_pct" radius={[6, 6, 0, 0]}>
              {themes.map((t) => <Cell key={t.id} fill={RAG_COLORS[t.rag].solid} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </ChartRegion>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((t) => {
          const pillar = pillars.find((p) => p.id === t.pillar_id);
          return (
            <Link
              key={t.id}
              to={`/themes/${t.id}`}
              data-testid={`theme-card-${t.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-5 card-hover group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pillar?.color }}>{pillar?.name}</span>
                <RAGBadge rag={t.rag} />
              </div>
              <h4 className="text-base font-semibold text-slate-900 leading-tight group-hover:text-orange-700 transition-colors" style={{ fontFamily: "Manrope" }}>{t.name}</h4>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-bold" style={{ fontFamily: "Manrope", color: RAG_COLORS[t.rag].solid }}>{t.completion_pct}%</span>
                <span className="text-xs text-slate-500">progress</span>
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full">
                <div className="h-full rounded-full" style={{ width: `${t.completion_pct}%`, background: RAG_COLORS[t.rag].solid }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
                <Mini label="Initiatives" value={t.initiatives} />
                <Mini label="Milestones" value={t.milestones} />
                <Mini label="KPIs" value={t.kpis} />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Budget</span>
                <span className="font-semibold text-slate-700">{formatCrore(t.budget_utilized)} / {formatCrore(t.budget_allocated)}</span>
              </div>
              <div className="mt-3 text-xs font-semibold text-orange-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View drill-down <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="text-base font-bold text-slate-800" style={{ fontFamily: "Manrope" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}
