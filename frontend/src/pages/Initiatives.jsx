import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatCrore } from "@/lib/api";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { DialogA11yDescription } from "@/components/DialogA11y";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";

export default function Initiatives() {
  const [params] = useSearchParams();
  const [list, setList] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [themes, setThemes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    pillar_id: params.get("pillar_id") || "all",
    theme_id: params.get("theme_id") || "all",
    status: params.get("status") || "all",
    rag: params.get("rag") || "all",
  });
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return {
      name: "", description: "", pillar_id: "", theme_id: "", lead_department_id: "",
      target_year: 2035, budget_estimate: 0, funding_source: "State Budget",
      ppp_potential: "Medium", status: "In Progress", rag: "amber", priority: "P1",
    };
  }

  const load = async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") params[k] = v; });
    const { data } = await api.get("/initiatives", { params });
    setList(data);
  };

  useEffect(() => { load(); }, [filters]);
  useEffect(() => {
    api.get("/pillars").then(({ data }) => setPillars(data));
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/departments").then(({ data }) => setDepartments(data));
  }, []);

  const filtered = list.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setOpenDialog(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setOpenDialog(true);
  };
  const save = async () => {
    try {
      if (editItem) {
        await api.put(`/initiatives/${editItem.id}`, form);
        toast.success("Initiative updated");
      } else {
        await api.post("/initiatives", form);
        toast.success("Initiative created");
      }
      setOpenDialog(false);
      load();
    } catch (e) {
      toast.error("Failed: " + (e.response?.data?.detail || e.message));
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this initiative?")) return;
    await api.delete(`/initiatives/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowKey="page.initiatives.eyebrow"
        titleKey="page.initiatives.title"
        subtitleKey="page.initiatives.subtitle"
        actions={
          <Button onClick={openCreate} data-testid="initiative-create-btn" className="bg-[#0F172A] hover:bg-[#1E293B]">
            <Plus className="h-4 w-4 mr-2" /> New Initiative
          </Button>
        }
      />

      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search initiatives…" className="pl-9" data-testid="initiative-search" />
          </div>
          <FilterSelect label="Pillar" value={filters.pillar_id} onChange={(v) => setFilters({ ...filters, pillar_id: v })} options={[{ value: "all", label: "All Pillars" }, ...pillars.map((p) => ({ value: p.id, label: p.name }))]} testId="filter-pillar" />
          <FilterSelect label="Theme" value={filters.theme_id} onChange={(v) => setFilters({ ...filters, theme_id: v })} options={[{ value: "all", label: "All Themes" }, ...themes.map((t) => ({ value: t.id, label: t.name }))]} testId="filter-theme" />
          <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={[{ value: "all", label: "All Status" }, "In Progress", "Delayed", "At Risk", "Completed", "Not Started", "Blocked"].map((s) => typeof s === "string" ? { value: s, label: s } : s)} testId="filter-status" />
          <FilterSelect label="RAG" value={filters.rag} onChange={(v) => setFilters({ ...filters, rag: v })} options={[{ value: "all", label: "All RAG" }, { value: "green", label: "Green" }, { value: "amber", label: "Amber" }, { value: "red", label: "Red" }, { value: "blue", label: "Closed" }]} testId="filter-rag" />
        </div>

        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.initiatives">
            <THead>
              <tr>
                <Th>Code</Th><Th>Name</Th><Th>Theme</Th><Th>Department</Th>
                <Th>Target</Th><Th>Budget</Th><Th>Status</Th><Th>RAG</Th><Th>Actions</Th>
              </tr>
            </THead>
            <tbody>
              {filtered.map((it) => (
                <tr
                  key={it.id}
                  data-testid={`init-row-${it.id}`}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selected?.id === it.id ? "bg-orange-50" : ""}`}
                  onClick={() => setSelected(it)}
                >
                  <Td className="font-mono text-xs">{it.code}</Td>
                  <Td className="font-medium">
                    <Link
                      to={`/initiatives/${it.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-900 hover:text-orange-600 inline-flex items-center gap-1"
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    </Link>
                  </Td>
                  <Td className="text-slate-600">{themes.find((t) => t.id === it.theme_id)?.name?.slice(0, 30)}</Td>
                  <Td className="text-slate-600">{departments.find((d) => d.id === it.lead_department_id)?.name?.replace(" Department", "")}</Td>
                  <Td>{it.target_year}</Td>
                  <Td className="font-mono text-xs">{formatCrore(it.budget_estimate)}</Td>
                  <Td><span className="text-xs">{it.status}</span></Td>
                  <Td><RAGBadge rag={it.rag} /></Td>
                  <Td>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(it)} data-testid={`edit-${it.id}`} className="p-1.5 rounded hover:bg-slate-200"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(it.id)} data-testid={`del-${it.id}`} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-slate-400 py-8">No initiatives match the current filters.</td></tr>
              )}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>

      {selected && (
        <EntityCollaborationPanel
          entityType="initiative"
          entityId={selected.id}
          entityLabel={selected.code}
          author="Department Secretary"
        />
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Initiative" : "New Initiative"}</DialogTitle>
            <DialogA11yDescription labelKey="a11y.dialog.initiative" />
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-name" /></Field>
            <Field label="Target Year">
              <Select value={String(form.target_year)} onValueChange={(v) => setForm({ ...form, target_year: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2029, 2035, 2047].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Pillar">
              <Select value={form.pillar_id} onValueChange={(v) => setForm({ ...form, pillar_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select pillar" /></SelectTrigger>
                <SelectContent>{pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Theme">
              <Select value={form.theme_id} onValueChange={(v) => setForm({ ...form, theme_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                <SelectContent>{themes.filter((t) => !form.pillar_id || t.pillar_id === form.pillar_id).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Lead Department">
              <Select value={form.lead_department_id} onValueChange={(v) => setForm({ ...form, lead_department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Budget Estimate (₹ Cr)"><Input type="number" value={form.budget_estimate} onChange={(e) => setForm({ ...form, budget_estimate: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Funding Source">
              <Select value={form.funding_source} onValueChange={(v) => setForm({ ...form, funding_source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["State Budget", "PPP", "Multilateral", "CSR", "Mixed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="PPP Potential">
              <Select value={form.ppp_potential} onValueChange={(v) => setForm({ ...form, ppp_potential: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["High", "Medium", "Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Not Started", "In Progress", "Delayed", "At Risk", "Completed", "Blocked"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="RAG">
              <Select value={form.rag} onValueChange={(v) => setForm({ ...form, rag: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["green", "amber", "red", "blue", "grey"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["P0", "P1", "P2"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={save} data-testid="form-save" className="bg-[#0F172A]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-xs text-slate-600 mb-1.5 block">{label}</Label>{children}</div>;
}
function FilterSelect({ value, onChange, options, testId }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
