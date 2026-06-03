import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { RAGBadge } from "@/components/RAGBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DialogA11yDescription } from "@/components/DialogA11y";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { Search, Pencil, Download } from "lucide-react";
import { toast } from "sonner";

export default function AgriTasks() {
  const [params, setParams] = useSearchParams();
  const [subtasks, setSubtasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [depts, setDepts] = useState([]);
  const [filters, setFilters] = useState({
    milestone_no: params.get("milestone_no") || "all",
    department: params.get("department") || "all",
    status: "all",
    rag: "all",
    search: "",
  });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const q = {};
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") q[k] = v; });
    const { data } = await api.get("/agriculture/subtasks", { params: { ...q, limit: 500 } });
    setSubtasks(data);
  };

  useEffect(() => { load(); }, [filters]);
  useEffect(() => {
    api.get("/agriculture/milestones").then(({ data }) => setMilestones(data));
    api.get("/agriculture/departments").then(({ data }) => setDepts(data));
  }, []);

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      status: s.status, actual_start: s.actual_start || "", actual_end: s.actual_end || "",
      finish_variance_days: s.finish_variance_days, start_variance_days: s.start_variance_days,
      evidence_status: s.evidence_status, remarks: s.remarks || "",
    });
  };
  const save = async () => {
    try {
      await api.put(`/agriculture/subtasks/${editing.id}`, form);
      toast.success("Sub-task updated");
      setEditing(null);
      load();
    } catch (e) {
      toast.error("Failed: " + (e.response?.data?.detail || e.message));
    }
  };

  const exportCsv = () => {
    const cols = ["subtask_no", "subtask", "task_no", "task", "responsible_department", "task_owner",
      "subtask_owner", "dependency", "planned_start", "planned_end", "actual_start", "actual_end",
      "status", "rag", "finish_variance_days", "evidence_status"];
    const head = cols.join(",");
    const rows = subtasks.map((s) => cols.map((c) => `"${(s[c] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([head + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "agriculture_subtasks.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.agri.tasks.eyebrow"
        titleKey="page.agri.tasks.title"
        subtitleKey="page.agri.tasks.subtitle"
        actions={
          <Button onClick={exportCsv} variant="outline" data-testid="agri-export-csv">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        }
      />

      <SectionCard>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search sub-task / task / no…" className="pl-9" data-testid="agri-search" />
          </div>
          <Select value={filters.milestone_no} onValueChange={(v) => setFilters({ ...filters, milestone_no: v })}>
            <SelectTrigger data-testid="agri-filter-ms"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Milestones</SelectItem>
              {milestones.map((m) => <SelectItem key={m.milestone_no} value={m.milestone_no}>{m.milestone_no} · {m.milestone.slice(0, 40)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.department} onValueChange={(v) => setFilters({ ...filters, department: v })}>
            <SelectTrigger data-testid="agri-filter-dept"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d) => <SelectItem key={d.department} value={d.department}>{d.department}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.rag} onValueChange={(v) => setFilters({ ...filters, rag: v })}>
            <SelectTrigger data-testid="agri-filter-rag"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RAG</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="amber">Amber</SelectItem>
              <SelectItem value="red">Red</SelectItem>
              <SelectItem value="blue">Closed</SelectItem>
              <SelectItem value="grey">Not Started</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriSubtasks" className="text-xs">
            <THead>
              <tr>
                <Th className="px-2 py-2 text-[10px]">Sub-task No</Th><Th className="px-2 py-2 text-[10px]">Sub-task</Th><Th className="px-2 py-2 text-[10px]">MS</Th><Th className="px-2 py-2 text-[10px]">Dept</Th>
                <Th className="px-2 py-2 text-[10px]">Owner</Th><Th className="px-2 py-2 text-[10px]">Dep</Th><Th className="px-2 py-2 text-[10px]">Plan End</Th><Th className="px-2 py-2 text-[10px]">Actual End</Th>
                <Th className="px-2 py-2 text-[10px]">FV (d)</Th><Th className="px-2 py-2 text-[10px]">Status</Th><Th className="px-2 py-2 text-[10px]">RAG</Th><Th className="px-2 py-2 text-[10px]">Evidence</Th><Th className="px-2 py-2 text-[10px]"><span className="sr-only">Edit</span></Th>
              </tr>
            </THead>
            <tbody>
              {subtasks.map((s) => (
                <tr key={s.id} data-testid={`agri-row-${s.subtask_no}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td className="px-2 py-2 font-mono">{s.subtask_no}</Td>
                  <Td className="px-2 py-2 max-w-[300px]"><div className="line-clamp-2 font-medium text-slate-800">{s.subtask}</div></Td>
                  <Td className="px-2 py-2 font-mono text-[10px]">{s.milestone_no}</Td>
                  <Td className="px-2 py-2 max-w-[160px] truncate">{s.responsible_department}</Td>
                  <Td className="px-2 py-2 max-w-[140px] truncate">{s.subtask_owner || s.task_owner}</Td>
                  <Td className="px-2 py-2 font-mono text-[10px]">{s.dependency && s.dependency !== "-" ? s.dependency : "—"}</Td>
                  <Td className="px-2 py-2">{s.planned_end}</Td>
                  <Td className="px-2 py-2">{s.actual_end || "—"}</Td>
                  <Td className={`px-2 py-2 ${s.finish_variance_days > 0 ? "text-red-600 font-semibold" : ""}`}>{s.finish_variance_days ?? "—"}</Td>
                  <Td className="px-2 py-2">{s.status}</Td>
                  <Td className="px-2 py-2"><RAGBadge rag={s.rag} /></Td>
                  <Td className="px-2 py-2">{s.evidence_status}</Td>
                  <Td className="px-2 py-2"><button onClick={() => openEdit(s)} data-testid={`agri-edit-${s.subtask_no}`} className="p-1.5 rounded hover:bg-slate-200"><Pencil className="h-3.5 w-3.5" /></button></Td>
                </tr>
              ))}
              {subtasks.length === 0 && <tr><td colSpan={13} className="text-center text-slate-400 py-8">No sub-tasks match the filters.</td></tr>}
            </tbody>
          </DataTable>
        </div>
        <div className="mt-3 text-xs text-slate-500">Showing {subtasks.length} sub-tasks</div>
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Sub-task {editing?.subtask_no}</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.agriTask" /></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">{editing.subtask}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Not Started", "In Progress", "Completed", "Delayed", "Blocked", "At Risk", "Revised", "Dropped"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Evidence Status</Label>
                  <Select value={form.evidence_status} onValueChange={(v) => setForm({ ...form, evidence_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Pending", "Submitted", "Accepted", "Rejected", "Missing"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Actual Start</Label><Input type="date" value={form.actual_start || ""} onChange={(e) => setForm({ ...form, actual_start: e.target.value })} /></div>
                <div><Label className="text-xs">Actual End</Label><Input type="date" value={form.actual_end || ""} onChange={(e) => setForm({ ...form, actual_end: e.target.value })} /></div>
                <div><Label className="text-xs">Finish Variance (days)</Label><Input type="number" value={form.finish_variance_days ?? 0} onChange={(e) => setForm({ ...form, finish_variance_days: parseInt(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">Start Variance (days)</Label><Input type="number" value={form.start_variance_days ?? 0} onChange={(e) => setForm({ ...form, start_variance_days: parseInt(e.target.value) || 0 })} /></div>
                <div className="col-span-2"><Label className="text-xs">Remarks</Label><Textarea value={form.remarks || ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} className="bg-slate-900" data-testid="agri-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
