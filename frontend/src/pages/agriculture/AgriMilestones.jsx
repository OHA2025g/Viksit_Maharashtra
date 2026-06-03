import React, { useEffect, useState } from "react";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function AgriMilestones() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/agriculture/milestones").then(({ data }) => setList(data));
  }, []);

  // Compute Gantt timeline range
  const allDates = list.flatMap((m) => [m.planned_start, m.planned_end]).filter(Boolean);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => new Date(d)))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => new Date(d)))) : new Date();
  const total = Math.max(1, maxDate - minDate);

  const pctFromStart = (d) => Math.max(0, Math.min(100, ((new Date(d) - minDate) / total) * 100));
  const widthFor = (s, e) => Math.max(2, ((new Date(e) - new Date(s)) / total) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.agri.milestones.eyebrow"
        titleKey="page.agri.milestones.title"
        subtitleKey="page.agri.milestones.subtitle"
      />

      <SectionCard title="Milestones Register">
        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriMilestones">
            <THead>
              <tr>
                <Th>No</Th><Th>Milestone</Th><Th>Type</Th><Th>Sub-tasks</Th><Th>Tasks</Th>
                <Th>Depts</Th><Th>Planned End</Th><Th>Completion</Th>
                <Th>Avg FV (d)</Th><Th>Delayed</Th><Th>Blocked</Th><Th>RAG</Th><Th><span className="sr-only">Drill down</span></Th>
              </tr>
            </THead>
            <tbody>
              {list.map((m) => (
                <tr key={m.milestone_no} data-testid={`agri-ms-${m.milestone_no}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{m.milestone_no}</Td>
                  <Td className="font-medium max-w-[300px]"><div className="line-clamp-2">{m.milestone}</div></Td>
                  <Td className="text-xs">{m.type}</Td>
                  <Td className="text-center">{m.total_subtasks}</Td>
                  <Td className="text-center">{m.total_tasks}</Td>
                  <Td className="text-center">{m.department_count}</Td>
                  <Td className="text-xs">{m.planned_end}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${m.completion_pct}%`, background: RAG_COLORS[m.rag].solid }} /></div>
                      <span className="text-xs font-mono">{m.completion_pct}%</span>
                    </div>
                  </Td>
                  <Td className="text-xs">{m.avg_finish_variance}</Td>
                  <Td className={m.delayed_subtasks > 0 ? "text-amber-700 font-semibold" : ""}>{m.delayed_subtasks}</Td>
                  <Td className={m.blocked_subtasks > 0 ? "text-red-700 font-semibold" : ""}>{m.blocked_subtasks}</Td>
                  <Td><RAGBadge rag={m.rag} /></Td>
                  <Td><Link to={`/agriculture/tasks?milestone_no=${m.milestone_no}`} className="text-emerald-600 hover:underline text-xs inline-flex items-center" data-testid={`agri-ms-drill-${m.milestone_no}`}>Drill <ChevronRight className="h-3 w-3" /></Link></Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>

      <SectionCard title="Gantt-style Timeline">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
            <span>{minDate.toISOString().slice(0, 10)}</span>
            <span>{maxDate.toISOString().slice(0, 10)}</span>
          </div>
          {list.map((m) => {
            if (!m.planned_start || !m.planned_end) return null;
            const left = pctFromStart(m.planned_start);
            const width = widthFor(m.planned_start, m.planned_end);
            return (
              <div key={m.milestone_no} data-testid={`agri-gantt-${m.milestone_no}`} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3 text-xs">
                  <div className="font-mono text-[10px] text-slate-500">{m.milestone_no}</div>
                  <div className="font-medium line-clamp-1">{m.milestone}</div>
                </div>
                <div className="col-span-9 relative h-7 bg-slate-100 rounded">
                  <div
                    className="absolute top-1 bottom-1 rounded flex items-center justify-end px-2 text-[10px] font-bold text-white"
                    style={{ left: `${left}%`, width: `${width}%`, background: RAG_COLORS[m.rag].solid }}
                    title={`${m.planned_start} → ${m.planned_end}`}
                  >
                    {width > 8 && `${m.completion_pct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
