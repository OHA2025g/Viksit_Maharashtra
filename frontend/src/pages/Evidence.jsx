import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
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
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";
import { useI18n } from "@/contexts/I18nContext";
import { Upload, FileCheck2, AlertCircle, FileText, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  "Government Resolution", "Approval Note", "DPR", "MoU", "Tender Document",
  "Work Order", "Completion Certificate", "Geo-tagged Photo", "Inspection Report",
  "Utilization Certificate", "KPI Data Report", "Social Audit Report",
  "Training Report", "Cyber Audit Report", "Financial Report",
];

export default function Evidence() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sufficiency, setSufficiency] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [form, setForm] = useState({
    pillar_id: "", theme_id: "", initiative_id: "", milestone_id: "",
    evidence_type: "DPR", file_name: "", uploaded_by: "User", verification_status: "Pending", remarks: "",
  });

  const load = async () => {
    const params = {};
    if (statusFilter !== "all") params.verification_status = statusFilter;
    const { data } = await api.get("/evidence", { params });
    setList(data);
  };
  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { api.get("/milestones?limit=200").then(({ data }) => setMilestones(data.slice(0, 200))); }, []);

  const summary = {
    total: list.length,
    accepted: list.filter((e) => e.verification_status === "Accepted").length,
    pending: list.filter((e) => e.verification_status === "Pending").length,
    rejected: list.filter((e) => e.verification_status === "Rejected").length,
    needs: list.filter((e) => e.verification_status === "Needs Clarification").length,
  };
  const compliance = list.length ? Math.round((summary.accepted / list.length) * 100) : 0;

  const submit = async () => {
    try {
      const ms = milestones.find((m) => m.id === form.milestone_id);
      if (!ms) { toast.error(t("evidence.pickMilestone")); return; }
      if (uploadFile) {
        const fd = new FormData();
        fd.append("pillar_id", ms.pillar_id);
        fd.append("theme_id", ms.theme_id);
        fd.append("initiative_id", ms.initiative_id);
        fd.append("milestone_id", ms.id);
        fd.append("evidence_type", form.evidence_type);
        fd.append("uploaded_by", form.uploaded_by);
        fd.append("remarks", form.remarks);
        fd.append("file", uploadFile);
        await api.post("/evidence/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/evidence", {
          ...form,
          pillar_id: ms.pillar_id, theme_id: ms.theme_id, initiative_id: ms.initiative_id,
        });
      }
      toast.success(t("evidence.uploadSuccess"));
      setDialogOpen(false);
      setUploadFile(null);
      load();
    } catch (e) {
      toast.error(`${t("evidence.failedPrefix")} ${e.response?.data?.detail || e.message}`);
    }
  };

  const selectEvidence = (e) => {
    setSelected(e);
    setSufficiency(null);
    if (e.milestone_id) {
      api.get(`/evidence/sufficiency/${e.milestone_id}`).then(({ data }) => setSufficiency(data)).catch(() => {});
    }
  };

  const updateStatus = async (id, newStatus) => {
    await api.put(`/evidence/${id}`, { verification_status: newStatus, verified_by: "PMO Analyst" });
    toast.success(`${t("evidence.markedStatus")} ${newStatus}`);
    load();
  };

  const statusIcon = (s) => {
    if (s === "Accepted") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    if (s === "Rejected") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    if (s === "Needs Clarification") return <HelpCircle className="h-3.5 w-3.5 text-amber-600" />;
    return <AlertCircle className="h-3.5 w-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.evidence.eyebrow"
        titleKey="page.evidence.title"
        subtitleKey="page.evidence.subtitle"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-[#0F172A]" data-testid="evidence-upload-btn">
            <Upload className="h-4 w-4 mr-2" /> {t("evidence.uploadTitle")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label={t("evidence.statTotal")} value={summary.total} icon={FileText} />
        <Stat label={t("evidence.statAccepted")} value={summary.accepted} icon={CheckCircle2} color="text-green-600" />
        <Stat label={t("evidence.statPending")} value={summary.pending} icon={AlertCircle} color="text-amber-600" />
        <Stat label={t("evidence.statRejected")} value={summary.rejected} icon={XCircle} color="text-red-600" />
        <Stat label={t("evidence.statCompliance")} value={`${compliance}%`} icon={FileCheck2} color="text-orange-600" />
      </div>

      <SectionCard titleKey="evidence.registerTitle" action={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="evidence-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("evidence.allStatus")}</SelectItem>
            <SelectItem value="Pending">{t("evidence.statusPending")}</SelectItem>
            <SelectItem value="Accepted">{t("evidence.statusAccepted")}</SelectItem>
            <SelectItem value="Rejected">{t("evidence.statusRejected")}</SelectItem>
            <SelectItem value="Needs Clarification">{t("evidence.statusNeedsClarification")}</SelectItem>
          </SelectContent>
        </Select>
      }>
        <DataTable captionKey="table.caption.evidenceRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <ThKey labelKey="evidence.type" />
              <ThKey labelKey="evidence.file" />
              <ThKey labelKey="evidence.milestone" />
              <ThKey labelKey="evidence.uploadedBy" />
              <ThKey labelKey="evidence.date" />
              <ThKey labelKey="evidence.status" />
              <Th scope="col"><span className="sr-only">{t("common.actions")}</span></Th>
            </tr>
          </THead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} data-testid={`ev-row-${e.id}`} className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selected?.id === e.id ? "bg-orange-50" : ""}`} onClick={() => selectEvidence(e)}>
                <Td className="font-mono text-xs">{e.code}</Td>
                <Td className="text-xs">{e.evidence_type}</Td>
                <Td className="text-xs font-medium">{e.file_name}</Td>
                <Td className="text-xs text-slate-600 max-w-[180px] truncate">{milestones.find((m) => m.id === e.milestone_id)?.name?.slice(0, 30)}</Td>
                <Td className="text-xs">{e.uploaded_by}</Td>
                <Td className="text-xs">{e.upload_date?.slice(0, 10)}</Td>
                <Td><span className="inline-flex items-center gap-1.5 text-xs">{statusIcon(e.verification_status)} {e.verification_status}</span></Td>
                <Td>
                  <Select value={e.verification_status} onValueChange={(v) => updateStatus(e.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-32" data-testid={`ev-status-${e.id}`} onClick={(ev) => ev.stopPropagation()}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Pending", "Accepted", "Rejected", "Needs Clarification"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>

      {selected && (
        <>
          <SectionCard titleKey="evidence.sufficiencyTitle">
            {sufficiency ? (
              <dl className="text-sm space-y-2 max-w-xl">
                <div><dt className="text-slate-500">{t("evidence.status")}</dt><dd className="font-semibold">{sufficiency.sufficiency_status || sufficiency.overall_status || sufficiency.status}</dd></div>
                <div><dt className="text-slate-500">{t("evidence.compliance")}</dt><dd>{sufficiency.compliance_pct ?? sufficiency.compliance_percentage ?? "—"}%</dd></div>
                <div><dt className="text-slate-500">{t("evidence.required")}</dt><dd className="text-xs">{(sufficiency.required_types || sufficiency.required || []).join(", ") || "—"}</dd></div>
                <div><dt className="text-slate-500">{t("evidence.missing")}</dt><dd className="text-xs text-red-600">{(sufficiency.missing_types || sufficiency.missing || []).join(", ") || t("evidence.noneMissing")}</dd></div>
              </dl>
            ) : <p className="text-sm text-slate-500">{t("evidence.loadingSufficiency")}</p>}
          </SectionCard>
          <EntityCollaborationPanel
            entityType="evidence"
            entityId={selected.id}
            entityLabel={selected.code}
            author={selected.uploaded_by || form.uploaded_by || "User"}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("evidence.uploadTitle")}</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.evidence" /></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("evidence.milestone")}</Label>
              <Select value={form.milestone_id} onValueChange={(v) => setForm({ ...form, milestone_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("evidence.selectMilestone")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} · {m.name.slice(0, 40)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("evidence.evidenceType")}</Label>
              <Select value={form.evidence_type} onValueChange={(v) => setForm({ ...form, evidence_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("evidence.fileOptional")}</Label>
              <Input type="file" onChange={(ev) => setUploadFile(ev.target.files?.[0] || null)} data-testid="ev-form-file" />
              <p className="text-[10px] text-slate-400 mt-1">{t("evidence.fileHint")}</p>
            </div>
            <div>
              <Label className="text-xs">{t("evidence.fileName")}</Label>
              <Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="dpr_pune_metro_phase3.pdf" data-testid="ev-form-filename" />
            </div>
            <div>
              <Label className="text-xs">{t("evidence.uploadedBy")}</Label>
              <Input value={form.uploaded_by} onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("evidence.remarks")}</Label>
              <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} className="bg-[#0F172A]" data-testid="ev-form-save">{t("evidence.submitEvidence")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color = "text-slate-900" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className={`text-2xl font-bold ${color}`} style={{ fontFamily: "Manrope" }}>{value}</div>
      </div>
    </div>
  );
}
