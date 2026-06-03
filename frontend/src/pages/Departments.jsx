import React, { useEffect, useState } from "react";
import { api, formatCrore } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { RAG_COLORS } from "@/lib/api";
import { Link } from "react-router-dom";
import { Sprout, ArrowRight, ListTodo } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function Departments() {
  const { t } = useI18n();
  const [ranks, setRanks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    api.get("/analytics/department-rank").then(({ data }) => setRanks(data));
    api.get("/watchlist").then(({ data }) => setWatchlist(data?.items || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrowKey="page.departments.eyebrow" titleKey="page.departments.title" subtitleKey="page.departments.subtitle" />

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
            <Bar dataKey="completion_pct" radius={[0, 6, 6, 0]}>
              {ranks.map((d) => <Cell key={d.id} fill={RAG_COLORS[d.rag].solid} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </ChartRegion>
      </SectionCard>

      <SectionCard titleKey="dept.dashboardTitle">
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
            </tr>
          </THead>
          <tbody>
            {ranks.map((d) => (
              <tr key={d.id} data-testid={`dept-row-${d.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                <Td className="font-medium">{d.name}</Td>
                <Td className="text-xs text-slate-600">{d.head}</Td>
                <Td>{d.initiatives}</Td>
                <Td>{d.milestones}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${d.completion_pct}%`, background: RAG_COLORS[d.rag].solid }} /></div>
                    <span className="text-xs font-mono">{d.completion_pct}%</span>
                  </div>
                </Td>
                <Td className={d.delayed > 5 ? "text-red-600 font-semibold" : ""}>{d.delayed}</Td>
                <Td><RAGBadge rag={d.rag} /></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>
    </div>
  );
}
