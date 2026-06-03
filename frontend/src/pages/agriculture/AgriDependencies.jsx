import React, { useEffect, useState } from "react";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default function AgriDependencies() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/agriculture/dependencies").then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="text-slate-500 text-sm">Loading dependencies…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.agri.dependencies.eyebrow"
        titleKey="page.agri.dependencies.title"
        subtitleKey="page.agri.dependencies.subtitle"
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Dependencies" value={data.total_dependencies} />
        <Stat label="Critical Path Items" value={data.critical_path.length} color="#DC2626" />
        <Stat label="Healthy Links" value={data.chains.length - data.critical_path.length} color="#16A34A" />
      </div>

      <SectionCard title="Critical Path · Cascading Delays" action={<span className="text-[11px] text-red-700 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Predecessor delayed/blocked</span>}>
        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriCriticalPath" className="text-xs">
            <THead>
              <tr><Th>From (predecessor)</Th><Th>Status</Th><Th>RAG</Th><Th><span className="sr-only">Link</span></Th><Th>To (dependent)</Th><Th>Status</Th><Th>RAG</Th></tr>
            </THead>
            <tbody>
              {data.critical_path.map((e, i) => (
                <tr key={i} data-testid={`agri-crit-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td><div className="font-mono text-[10px]">{e.from_no}</div><div className="max-w-[260px] truncate">{e.from_subtask}</div></Td>
                  <Td>{e.from_status}</Td>
                  <Td><Dot rag={e.from_rag} /></Td>
                  <Td className="text-slate-400"><ArrowRight className="h-3.5 w-3.5" aria-hidden /></Td>
                  <Td><div className="font-mono text-[10px]">{e.to_no}</div><div className="max-w-[260px] truncate">{e.to_subtask}</div></Td>
                  <Td>{e.to_status}</Td>
                  <Td><Dot rag={e.to_rag} /></Td>
                </tr>
              ))}
              {data.critical_path.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No critical-path issues right now 🎉</td></tr>}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>

      <SectionCard title="All Dependency Links (first 200)">
        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriDependencyLinks" className="text-xs">
            <THead>
              <tr><Th>From</Th><Th>From RAG</Th><Th><span className="sr-only">Link</span></Th><Th>To</Th><Th>To RAG</Th></tr>
            </THead>
            <tbody>
              {data.chains.slice(0, 200).map((e, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <Td className="font-mono">{e.from_no}</Td>
                  <Td><Dot rag={e.from_rag} /></Td>
                  <Td className="text-slate-400"><ArrowRight className="h-3.5 w-3.5" aria-hidden /></Td>
                  <Td className="font-mono">{e.to_no}</Td>
                  <Td><Dot rag={e.to_rag} /></Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, color = "#0F172A" }) { return <div className="bg-white border border-slate-200 rounded-lg p-5"><div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div><div className="text-3xl font-bold mt-2" style={{ fontFamily: "Manrope", color }}>{value}</div></div>; }
function Dot({ rag }) {
  const c = RAG_COLORS[rag] || RAG_COLORS.grey;
  return <span className="inline-flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: c.solid }} /> {rag}</span>;
}
