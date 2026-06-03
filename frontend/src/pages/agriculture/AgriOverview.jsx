import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { RAG_COLORS } from "@/lib/api";
import { Sprout, FileSpreadsheet, ArrowRight, Wheat, Layers, Building2, Calendar } from "lucide-react";

export default function AgriOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/agriculture/overview").then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="text-slate-500 text-sm">Loading agriculture mission…</div>;

  if (!data.imported) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrowKey="page.agri.overview.emptyEyebrow" titleKey="page.agri.overview.emptyTitle" />
        <SectionCard>
          <div className="text-center py-12">
            <Sprout className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No baseline imported yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Import the Agriculture Excel to start tracking 10 milestones, 53 tasks and 203 sub-tasks.</p>
            <Link to="/agriculture/import" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm">
              <FileSpreadsheet className="h-4 w-4" /> Go to Excel Import
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  const s = data.summary;
  const h = data.hierarchy;
  const rag = s.rag_distribution;
  const ragPie = [
    { name: "On Track", value: rag.green, fill: RAG_COLORS.green.solid },
    { name: "Minor Delay", value: rag.amber, fill: RAG_COLORS.amber.solid },
    { name: "Major Delay", value: rag.red, fill: RAG_COLORS.red.solid },
    { name: "Closed", value: rag.blue, fill: RAG_COLORS.blue.solid },
    { name: "Not Started", value: rag.grey, fill: RAG_COLORS.grey.solid },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowKey="page.agri.overview.eyebrow"
        titleKey="page.agri.overview.title"
        subtitleKey="page.agri.overview.subtitle"
        actions={
          <Link to="/agriculture/import" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-xs font-semibold">
            <FileSpreadsheet className="h-4 w-4" /> Excel Import
          </Link>
        }
      />

      {/* Hierarchy ribbon */}
      <SectionCard className="!p-0 overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-px bg-slate-200">
          <HierStep icon={Layers} label="Pillar" value={h.pillar} testId="hier-pillar" />
          <HierStep icon={Wheat} label="Sector" value={h.sector} testId="hier-sector" />
          <HierStep icon={Sprout} label={`Initiative ${h.initiative_no}`} value={h.initiative} testId="hier-initiative" />
          <HierStep icon={Calendar} label="Milestones" value={h.milestones} testId="hier-milestones" />
          <HierStep icon={Layers} label="Tasks" value={h.tasks} testId="hier-tasks" />
          <HierStep icon={Building2} label="Sub-tasks" value={h.subtasks} testId="hier-subtasks" />
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Sub-tasks" value={s.total_subtasks} sub={`${s.total_tasks} tasks · ${s.total_milestones} milestones`} />
        <Kpi label="Completion" value={`${s.completion_pct}%`} sub={`${s.completed} completed`} color="#16A34A" />
        <Kpi label="Delayed / At-Risk" value={s.delayed} sub={`${s.blocked} blocked`} color="#DC2626" />
        <Kpi label="Departments" value={s.departments} sub="responsible" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Schedule Health (RAG)" className="lg:col-span-1">
          <ChartRegion labelKey="chart.agriRag">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={ragPie} dataKey="value" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {ragPie.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Pie>
              <Tooltip /><Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>

        <SectionCard title="Quick links" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { to: "/agriculture/milestones", label: "Milestone Tracker", desc: "10 milestones · Gantt-style" },
              { to: "/agriculture/tasks", label: "Task & Sub-task Tracker", desc: "All 203 rows · filters" },
              { to: "/agriculture/departments", label: "Department Dashboard", desc: "9 departments · workload" },
              { to: "/agriculture/dependencies", label: "Dependencies & Critical Path", desc: "Cascading delays" },
              { to: "/agriculture/import", label: "Excel Import", desc: "Re-import / new baseline" },
              { to: "/copilot", label: "Agri AI Copilot", desc: "Mistral · grounded on this data" },
            ].map((q) => (
              <Link key={q.to} to={q.to} data-testid={`agri-quick-${q.to.split('/').pop()}`} className="block border border-slate-200 rounded-md p-4 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>{q.label}</div>
                <div className="text-[11px] text-slate-500 mt-1">{q.desc}</div>
                <div className="text-[11px] text-emerald-600 font-medium mt-2 inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function HierStep({ icon: Icon, label, value, testId }) {
  return (
    <div data-testid={testId} className="bg-white p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-700 font-bold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 leading-snug">{value}</div>
    </div>
  );
}

function Kpi({ label, value, sub, color = "#0F172A" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="text-3xl font-bold mt-2" style={{ fontFamily: "Manrope", color }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
