import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogA11yDescription } from "@/components/DialogA11y";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

const STAGES = ["Draft", "Submitted", "Department Review", "Finance Review", "ACS Review", "Approved", "Rejected", "Needs Clarification"];
const WORKFLOWS = [
  "DPR Approval", "Financial Sanction", "Utilization Certificate Approval",
  "Evidence Approval", "Milestone Closure Approval", "Budget Reallocation Approval",
];

export default function Approvals() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ workflow_type: WORKFLOWS[0], entity_name: "", remarks: "" });

  const load = () => api.get("/approvals").then(({ data }) => setItems(data || []));
  useEffect(() => {
    load();
  }, []);

  const advance = async (id, stage) => {
    await api.put(`/approvals/${id}`, { stage, by: "Reviewer", remarks: `Moved to ${stage}` });
    load();
  };

  const deleteWorkflow = async (id, code) => {
    if (!window.confirm(`Delete approval workflow ${code}?`)) return;
    try {
      await api.delete(`/approvals/${id}`, { params: { by: "Reviewer" } });
      toast.success(t("approval.deleted"));
      if (selected?.id === id) setSelected(null);
      load();
    } catch {
      toast.error(t("approval.deleteFailed"));
    }
  };

  const createWorkflow = async () => {
    if (!form.entity_name.trim()) {
      toast.error(t("approval.entityRequired"));
      return;
    }
    try {
      await api.post("/approvals", {
        workflow_type: form.workflow_type,
        entity_name: form.entity_name.trim(),
        remarks: form.remarks,
        submitted_by: "Department Secretary",
      });
      setDialogOpen(false);
      setForm({ workflow_type: WORKFLOWS[0], entity_name: "", remarks: "" });
      load();
      toast.success(t("approval.created"));
    } catch {
      toast.error(t("approval.createFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.approvals.eyebrow"
        titleKey="page.approvals.title"
        subtitleKey="page.approvals.subtitle"
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />{t("approval.newWorkflow")}</Button>}
      />
      <SectionCard title={`${t("approval.activeWorkflows")} (${items.length})`}>
        <div className="space-y-4">
          {items.map((a) => (
            <div
              key={a.id}
              className={`border rounded-lg p-4 cursor-pointer ${selected?.id === a.id ? "border-orange-400 bg-orange-50/40" : ""}`}
              onClick={() => setSelected(a)}
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <div className="font-mono text-xs text-slate-500">{a.code}</div>
                  <div className="font-semibold">{a.workflow_type}</div>
                  <div className="text-sm text-slate-600">{a.entity_name}</div>
                  <div className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">{a.stage}</div>
                </div>
                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <Select onValueChange={(v) => advance(a.id, v)}>
                    <SelectTrigger className="w-44 h-8 text-xs" aria-label={`Advance stage for ${a.code}`}><SelectValue placeholder={t("approval.advanceStage")} /></SelectTrigger>
                    <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{t("approval.history")}</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteWorkflow(a.id, a.code)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {expanded === a.id && (
                <ul className="mt-3 text-xs border-t pt-3 space-y-1">
                  {a.history?.map((h, i) => (
                    <li key={i}>{h.at?.slice(0, 10)} · {h.stage} · {h.by} — {h.remarks}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {selected && (
        <EntityCollaborationPanel
          entityType="approval"
          entityId={selected.id}
          entityLabel={selected.code}
          author="Department Secretary"
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("approval.newDialog")}</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.approval" /></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t("approval.workflowType")}</Label>
              <Select value={form.workflow_type} onValueChange={(v) => setForm({ ...form, workflow_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKFLOWS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("approval.entitySubject")}</Label>
              <Input value={form.entity_name} onChange={(e) => setForm({ ...form, entity_name: e.target.value })} />
            </div>
            <div>
              <Label>{t("approval.remarks")}</Label>
              <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createWorkflow}>{t("approval.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
