import React, { useEffect, useState } from "react";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export default function AgriDepartments() {
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    api.get("/agriculture/departments").then(({ data }) => setDepts(data));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.agri.departments.eyebrow"
        titleKey="page.agri.departments.title"
      />

      <SectionCard title="Workload by Department">
        <ChartRegion labelKey="chart.agriDeptWorkload">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={depts} layout="vertical" margin={{ left: 220, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis type="category" dataKey="department" width={240} tick={{ fontSize: 10, fill: "#475569" }} />
            <Tooltip />
            <Bar dataKey="total_subtasks" radius={[0, 6, 6, 0]}>
              {depts.map((d) => <Cell key={d.department} fill={RAG_COLORS[d.rag].solid} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </ChartRegion>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {depts.map((d) => (
          <div key={d.department} data-testid={`agri-dept-${d.department.slice(0, 20)}`} className="bg-white border border-slate-200 rounded-lg p-5 card-hover">
            <div className="flex items-start justify-between mb-3 gap-3">
              <h4 className="text-sm font-semibold text-slate-900 leading-tight" style={{ fontFamily: "Manrope" }}>{d.department}</h4>
              <RAGBadge rag={d.rag} />
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl font-bold" style={{ fontFamily: "Manrope", color: RAG_COLORS[d.rag].solid }}>{d.total_subtasks}</span>
              <span className="text-xs text-slate-500">sub-tasks owned</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Item label="Unique tasks" value={d.unique_tasks} />
              <Item label="Milestones" value={d.milestones_involved} />
              <Item label="Completed" value={d.completed} color="#16A34A" />
              <Item label="In Progress" value={d.in_progress} color="#2563EB" />
              <Item label="Delayed" value={d.delayed} color={d.delayed > 0 ? "#F59E0B" : undefined} />
              <Item label="Blocked" value={d.blocked} color={d.blocked > 0 ? "#DC2626" : undefined} />
              <Item label="Upcoming 30d" value={d.upcoming_30d} />
              <Item label="Avg FV (d)" value={d.avg_finish_variance} />
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full">
              <div className="h-full rounded-full" style={{ width: `${d.completion_pct}%`, background: RAG_COLORS[d.rag].solid }} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{d.completion_pct}% complete · {d.evidence_pending} evidence pending</div>
            <Link to={`/agriculture/tasks?department=${encodeURIComponent(d.department)}`} className="mt-3 inline-flex items-center text-xs font-medium text-emerald-600 hover:underline" data-testid={`agri-dept-drill-${d.department.slice(0, 10)}`}>
              View sub-tasks →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function Item({ label, value, color }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-base font-bold" style={{ fontFamily: "Manrope", color: color || "#0F172A" }}>{value}</div>
    </div>
  );
}
