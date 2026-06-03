import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td } from "@/components/DataTable";
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
import { Plus, ClipboardList } from "lucide-react";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";
import { toast } from "sonner";

const TYPES = ["Weekly PMO Review", "Monthly Department Review", "Monthly VMU Review",
                "Quarterly CM Review", "Chief Secretary Steering Committee"];

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [actions, setActions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [revDialog, setRevDialog] = useState(false);
  const [actDialog, setActDialog] = useState(false);
  const [revForm, setRevForm] = useState({
    title: "", review_type: "Monthly VMU Review", date: new Date().toISOString().slice(0, 10),
    chaired_by: "VMU Head", departments_involved: [], themes_reviewed: [], agenda: "",
    decisions_taken: "", remarks: "",
  });
  const [actForm, setActForm] = useState({
    review_id: "", title: "", owner_department_id: "",
    due_date: "", status: "Open", remarks: "",
  });

  const load = async () => {
    const r = await api.get("/reviews");
    setReviews(r.data);
    const a = await api.get("/action-items");
    setActions(a.data);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get("/departments").then(({ data }) => setDepartments(data)); }, []);

  const saveRev = async () => {
    try {
      await api.post("/reviews", revForm);
      toast.success("Review created");
      setRevDialog(false);
      load();
    } catch (e) { toast.error("Failed"); }
  };

  const saveAct = async () => {
    try {
      await api.post("/action-items", actForm);
      toast.success("Action item added");
      setActDialog(false);
      load();
    } catch (e) { toast.error("Failed"); }
  };

  const updateActStatus = async (id, status) => {
    await api.put(`/action-items/${id}`, { status });
    toast.success("Updated");
    load();
  };

  const reviewActions = selected ? actions.filter((a) => a.review_id === selected.id) : actions;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.reviews.eyebrow"
        titleKey="page.reviews.title"
        subtitleKey="page.reviews.subtitle"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setActDialog(true)} variant="outline" data-testid="add-action-btn">
              <Plus className="h-4 w-4 mr-2" /> Action Item
            </Button>
            <Button onClick={() => setRevDialog(true)} className="bg-[#0F172A]" data-testid="add-review-btn">
              <Plus className="h-4 w-4 mr-2" /> New Review
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Review Meetings" className="lg:col-span-1">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            <button
              onClick={() => setSelected(null)}
              className={`w-full text-left p-3 rounded-md border ${!selected ? "border-orange-500 bg-orange-50" : "border-slate-200"}`}
              data-testid="select-all-reviews"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">All Action Items</div>
              <div className="text-xs text-slate-400 mt-1">{actions.length} items</div>
            </button>
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                data-testid={`review-item-${r.id}`}
                className={`w-full text-left p-3 rounded-md border transition-colors ${selected?.id === r.id ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">{r.review_type.split(" ")[0]}</span>
                  <span className="text-[10px] text-slate-500">{r.date}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">{r.title}</div>
                <div className="text-xs text-slate-500 mt-1">Chair: {r.chaired_by}</div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={selected ? `Action Items · ${selected.code}` : "All Action Items"} className="lg:col-span-2">
          {selected && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Agenda</div>
              <p className="text-sm text-slate-800 mb-3">{selected.agenda}</p>
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Decisions Taken</div>
              <p className="text-sm text-slate-800">{selected.decisions_taken}</p>
            </div>
          )}
          <DataTable captionKey="table.caption.actionItems">
            <THead>
              <tr>
                <ThKey labelKey="table.code" />
                <ThKey labelKey="table.name" />
                <Th>Owner Dept</Th>
                <Th>Due</Th>
                <ThKey labelKey="table.health" />
              </tr>
            </THead>
            <tbody>
              {reviewActions.map((a) => (
                <tr key={a.id} data-testid={`act-row-${a.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{a.code}</Td>
                  <Td className="font-medium">{a.title}</Td>
                  <Td className="text-xs">{departments.find((d) => d.id === a.owner_department_id)?.name?.replace(" Department", "")}</Td>
                  <Td className="text-xs">{a.due_date}</Td>
                  <Td>
                    <Select value={a.status} onValueChange={(v) => updateActStatus(a.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-32" data-testid={`act-status-${a.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{["Open", "In Progress", "Closed", "Overdue"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Td>
                </tr>
              ))}
              {reviewActions.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-6">No action items.</td></tr>
              )}
            </tbody>
          </DataTable>
        </SectionCard>
      </div>

      {selected && (
        <EntityCollaborationPanel
          entityType="review"
          entityId={selected.id}
          entityLabel={selected.title}
          author={selected.chaired_by || "Reviewer"}
        />
      )}

      {/* New Review Dialog */}
      <Dialog open={revDialog} onOpenChange={setRevDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Review Meeting</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.review" /></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Title</Label>
              <Input value={revForm.title} onChange={(e) => setRevForm({ ...revForm, title: e.target.value })} data-testid="rev-form-title" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={revForm.review_type} onValueChange={(v) => setRevForm({ ...revForm, review_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={revForm.date} onChange={(e) => setRevForm({ ...revForm, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Chaired By</Label>
              <Input value={revForm.chaired_by} onChange={(e) => setRevForm({ ...revForm, chaired_by: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Agenda</Label>
              <Textarea value={revForm.agenda} onChange={(e) => setRevForm({ ...revForm, agenda: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Decisions Taken</Label>
              <Textarea value={revForm.decisions_taken} onChange={(e) => setRevForm({ ...revForm, decisions_taken: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevDialog(false)}>Cancel</Button>
            <Button onClick={saveRev} className="bg-[#0F172A]" data-testid="rev-form-save">Save Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Action Dialog */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Action Item</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.actionItem" /></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Review</Label>
              <Select value={actForm.review_id} onValueChange={(v) => setActForm({ ...actForm, review_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick review" /></SelectTrigger>
                <SelectContent>{reviews.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} data-testid="act-form-title" />
            </div>
            <div>
              <Label className="text-xs">Owner Department</Label>
              <Select value={actForm.owner_department_id} onValueChange={(v) => setActForm({ ...actForm, owner_department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={actForm.due_date} onChange={(e) => setActForm({ ...actForm, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActDialog(false)}>Cancel</Button>
            <Button onClick={saveAct} className="bg-[#0F172A]" data-testid="act-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
