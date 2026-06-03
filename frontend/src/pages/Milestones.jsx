import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatCrore } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td, Th } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DialogA11yDescription } from "@/components/DialogA11y";
import { Plus, Search, Pencil, AlertCircle, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";
import { toast } from "sonner";

export default function Milestones() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [themes, setThemes] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [filters, setFilters] = useState({
    pillar_id: params.get("pillar_id") || "all",
    theme_id: params.get("theme_id") || "all",
    initiative_id: params.get("initiative_id") || "all",
    department_id: params.get("department_id") || "all",
    district_id: params.get("district_id") || "all",
    status: params.get("status") || "all",
    rag: params.get("rag") || "all",
    search: params.get("search") || "",
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedMs, setSelectedMs] = useState(null);
  const [watchMap, setWatchMap] = useState({});
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return {
      name: "", initiative_id: "", pillar_id: "", theme_id: "", department_id: "",
      district_id: "", owner: "Owner", planned_start_date: "", planned_end_date: "",
      actual_start_date: "", actual_end_date: "", status: "Not Started", rag: "grey",
      completion_pct: 0, budget_allocated: 0, budget_utilized: 0, evidence_status: "Pending", remarks: "",
    };
  }

  const load = async () => {
    const q = {};
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") q[k] = v; });
    const { data } = await api.get("/milestones", { params: q });
    setList(data);
  };

  useEffect(() => { load(); }, [filters]);
  useEffect(() => {
    api.get("/pillars").then(({ data }) => setPillars(data));
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/initiatives").then(({ data }) => setInitiatives(data));
    api.get("/departments").then(({ data }) => setDepartments(data));
    api.get("/districts").then(({ data }) => setDistricts(data));
    api.get("/watchlist").then(({ data }) => {
      const map = {};
      (data?.items || []).forEach((w) => { map[w.id] = w; });
      setWatchMap(map);
    }).catch(() => {});
  }, []);

  const today = new Date();
  const delayBadge = (m) => {
    if (m.status === "Completed" || !m.planned_end_date) return null;
    const pe = new Date(m.planned_end_date);
    const delay = Math.floor((today - pe) / (1000 * 60 * 60 * 24));
    if (delay > 0) return <span className="text-[10px] text-red-600 font-bold">{delay}d late</span>;
    return null;
  };

  const initMap = useMemo(() => Object.fromEntries(initiatives.map((i) => [i.id, i])), [initiatives]);
  const themeMap = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);

  const openCreate = () => { setEditItem(null); setForm(emptyForm()); setOpenDialog(true); };
  const openEdit = (m) => { setEditItem(m); setForm({ ...m }); setOpenDialog(true); };
  const save = async () => {
    try {
      if (editItem) {
        await api.put(`/milestones/${editItem.id}`, form);
        toast.success("Milestone updated");
      } else {
        await api.post("/milestones", form);
        toast.success("Milestone created");
      }
      setOpenDialog(false);
      load();
    } catch (e) {
      toast.error("Save failed: " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.milestones.eyebrow"
        titleKey="page.milestones.title"
        subtitleKey="page.milestones.subtitle"
        actions={
          <Button onClick={openCreate} className="bg-[#0F172A] hover:bg-[#1E293B]" data-testid="milestone-create-btn">
            <Plus className="h-4 w-4 mr-2" /> New Milestone
          </Button>
        }
      />

      <SectionCard>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-9" data-testid="ms-search" />
          </div>
          <FilterSel value={filters.pillar_id} onChange={(v) => setFilters({ ...filters, pillar_id: v })} options={[{ value: "all", label: "All Pillars" }, ...pillars.map((p) => ({ value: p.id, label: p.name }))]} testId="ms-filter-pillar" />
          <FilterSel value={filters.theme_id} onChange={(v) => setFilters({ ...filters, theme_id: v })} options={[{ value: "all", label: "All Themes" }, ...themes.map((t) => ({ value: t.id, label: t.name }))]} testId="ms-filter-theme" />
          <FilterSel value={filters.department_id} onChange={(v) => setFilters({ ...filters, department_id: v })} options={[{ value: "all", label: "All Depts" }, ...departments.map((d) => ({ value: d.id, label: d.name.replace(" Department", "") }))]} testId="ms-filter-dept" />
          <FilterSel value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={[{ value: "all", label: "All Status" }, ...["Not Started", "In Progress", "Completed", "Delayed", "Blocked", "At Risk"].map((s) => ({ value: s, label: s }))]} testId="ms-filter-status" />
          <FilterSel value={filters.rag} onChange={(v) => setFilters({ ...filters, rag: v })} options={[{ value: "all", label: "All RAG" }, ...["green", "amber", "red", "blue", "grey"].map((r) => ({ value: r, label: r }))]} testId="ms-filter-rag" />
        </div>

        <DataTable captionKey="table.caption.milestoneRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <Th>Milestone</Th>
              <Th>Initiative</Th>
              <Th>Dept</Th>
              <Th>Planned End</Th>
              <Th>Actual End</Th>
              <Th>%</Th>
              <Th>Status</Th>
              <ThKey labelKey="table.rag" />
              <Th>Delay Risk</Th>
              <Th>Evidence</Th>
              <Th>Budget Util</Th>
              <Th scope="col"><span className="sr-only">Actions</span></Th>
            </tr>
          </THead>
            <tbody>
              {list.map((m) => (
                <tr
                  key={m.id}
                  data-testid={`ms-row-${m.id}`}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedMs?.id === m.id ? "bg-orange-50" : ""}`}
                  onClick={() => setSelectedMs(m)}
                >
                  <Td className="font-mono text-xs">{m.code}</Td>
                  <Td className="font-medium max-w-xs">
                    <div className="truncate">{m.name}</div>
                    {delayBadge(m)}
                    {m.evidence_status === "Missing" && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5"><AlertCircle className="h-3 w-3" /> Evidence missing</div>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-600 max-w-[120px] truncate">{initMap[m.initiative_id]?.name?.slice(0, 24)}</Td>
                  <Td className="text-xs">{deptMap[m.department_id]?.name?.replace(" Department", "")}</Td>
                  <Td className="text-xs">{m.planned_end_date}</Td>
                  <Td className="text-xs">{m.actual_end_date || "—"}</Td>
                  <Td><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${m.completion_pct}%` }} /></div><span className="text-xs">{m.completion_pct}%</span></div></Td>
                  <Td className="text-xs">{m.status}</Td>
                  <Td><RAGBadge rag={m.rag} /></Td>
                  <Td className="text-xs">
                    {watchMap[m.id]?.delay_risk ? (
                      <span className="font-semibold text-red-600">{watchMap[m.id].delay_risk.risk_category}</span>
                    ) : "—"}
                    <Link to={`/intelligence?milestone=${m.id}`} className="block text-orange-600 hover:underline mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Brain className="h-3 w-3 inline mr-0.5" />Analyze
                    </Link>
                  </Td>
                  <Td className="text-xs">{m.evidence_status}</Td>
                  <Td className="text-xs font-mono">{formatCrore(m.budget_utilized)}</Td>
                  <Td>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} data-testid={`ms-edit-${m.id}`} className="p-1.5 rounded hover:bg-slate-200">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={13} className="text-center text-slate-400 py-8">No milestones match the filters.</td></tr>
              )}
            </tbody>
        </DataTable>
        <div className="mt-3 text-xs text-slate-500">Showing {list.length} milestones · Click a row for discussion & audit</div>
      </SectionCard>

      {selectedMs && (
        <EntityCollaborationPanel
          entityType="milestone"
          entityId={selectedMs.id}
          entityLabel={selectedMs.code}
          author={selectedMs.owner || "User"}
        />
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Milestone" : "New Milestone"}</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.milestone" /></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FieldCol label="Name" cls="col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="ms-form-name" /></FieldCol>
            <FieldCol label="Pillar">
              <Select value={form.pillar_id} onValueChange={(v) => setForm({ ...form, pillar_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pillar" /></SelectTrigger>
                <SelectContent>{pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Theme">
              <Select value={form.theme_id} onValueChange={(v) => setForm({ ...form, theme_id: v })}>
                <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
                <SelectContent>{themes.filter((t) => !form.pillar_id || t.pillar_id === form.pillar_id).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Initiative" cls="col-span-2">
              <Select value={form.initiative_id} onValueChange={(v) => setForm({ ...form, initiative_id: v })}>
                <SelectTrigger><SelectValue placeholder="Initiative" /></SelectTrigger>
                <SelectContent>{initiatives.filter((i) => !form.theme_id || i.theme_id === form.theme_id).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Department">
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Dept" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="District">
              <Select value={form.district_id || ""} onValueChange={(v) => setForm({ ...form, district_id: v })}>
                <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
                <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Planned Start"><Input type="date" value={form.planned_start_date || ""} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} /></FieldCol>
            <FieldCol label="Planned End"><Input type="date" value={form.planned_end_date || ""} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })} /></FieldCol>
            <FieldCol label="Actual Start"><Input type="date" value={form.actual_start_date || ""} onChange={(e) => setForm({ ...form, actual_start_date: e.target.value })} /></FieldCol>
            <FieldCol label="Actual End"><Input type="date" value={form.actual_end_date || ""} onChange={(e) => setForm({ ...form, actual_end_date: e.target.value })} /></FieldCol>
            <FieldCol label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Not Started", "In Progress", "Completed", "Delayed", "Blocked", "At Risk", "Revised", "Dropped"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="RAG">
              <Select value={form.rag} onValueChange={(v) => setForm({ ...form, rag: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["green", "amber", "red", "blue", "grey"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Completion %"><Input type="number" value={form.completion_pct} onChange={(e) => setForm({ ...form, completion_pct: parseInt(e.target.value) || 0 })} /></FieldCol>
            <FieldCol label="Evidence Status">
              <Select value={form.evidence_status} onValueChange={(v) => setForm({ ...form, evidence_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Pending", "Submitted", "Verified", "Missing"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldCol>
            <FieldCol label="Budget Allocated (₹ Cr)"><Input type="number" value={form.budget_allocated} onChange={(e) => setForm({ ...form, budget_allocated: parseFloat(e.target.value) || 0 })} /></FieldCol>
            <FieldCol label="Budget Utilized (₹ Cr)"><Input type="number" value={form.budget_utilized} onChange={(e) => setForm({ ...form, budget_utilized: parseFloat(e.target.value) || 0 })} /></FieldCol>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[#0F172A]" data-testid="ms-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldCol({ label, children, cls = "" }) {
  return <div className={cls}><Label className="text-xs text-slate-600 mb-1.5 block">{label}</Label>{children}</div>;
}
function FilterSel({ value, onChange, options, testId }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-72">{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
