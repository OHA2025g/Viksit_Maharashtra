import React, { useEffect, useState } from "react";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Pillars() {
  const [overview, setOverview] = useState(null);
  const [themes, setThemes] = useState([]);

  useEffect(() => {
    api.get("/analytics/overview").then(({ data }) => setOverview(data));
    api.get("/themes").then(({ data }) => setThemes(data));
  }, []);

  if (!overview) return <div className="text-slate-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-8">
      <PageHeader eyebrowKey="page.pillars.eyebrow" titleKey="page.pillars.title" subtitleKey="page.pillars.subtitle" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overview.pillars.map((p) => {
          const pillarThemes = themes.filter((t) => t.pillar_id === p.id);
          return (
            <div key={p.id} data-testid={`pillar-detail-${p.id}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden card-hover">
              <div className="p-6 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${p.color}10 0%, ${p.color}05 100%)` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold" style={{ background: p.color }}>
                    {p.name.charAt(0)}
                  </div>
                  <RAGBadge rag={p.rag} />
                </div>
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{p.name}</h3>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-4xl font-bold" style={{ fontFamily: "Manrope", color: p.color }}>{p.completion_pct}%</span>
                  <span className="text-sm text-slate-500">overall completion</span>
                </div>
                <div className="mt-3 h-2 bg-slate-200 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${p.completion_pct}%`, background: p.color }} />
                </div>
              </div>
              <div className="p-6 grid grid-cols-4 gap-4 border-b border-slate-100">
                <Stat label="Themes" value={p.themes_count} />
                <Stat label="Initiatives" value={p.initiatives_count} />
                <Stat label="Milestones" value={p.milestones_count} />
                <Stat label="At Risk" value={p.at_risk_milestones} accent="red" />
              </div>
              <div className="p-6">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Themes in this pillar</div>
                <div className="space-y-1.5">
                  {pillarThemes.map((t) => (
                    <Link
                      key={t.id}
                      to={`/themes/${t.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-slate-50 transition-colors text-sm"
                      data-testid={`pillar-theme-${t.id}`}
                    >
                      <span className="font-medium text-slate-800">{t.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${accent === "red" ? "text-red-600" : "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
