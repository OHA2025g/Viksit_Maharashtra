import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
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
import { Plus, AlertTriangle, ArrowUpCircle, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

const TYPES = ["Policy", "Budget", "Land", "Vendor", "Coordination", "Data", "Legal", "Social", "Environmental", "Technology"];
const ESC = ["Task Owner", "Department Nodal", "Secretary", "ACS", "Chief Secretary", "CM"];

export default function Risks() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const themeFilter = params.get("theme_id") || "all";
  const initiativeFilter = params.get("initiative_id") || "all";
  const [list, setList] = useState([]);
  const [themes, setThemes] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return {
      pillar_id: "", theme_id: "", initiative_id: "", risk_type: "Policy",
      description: "", probability: 3, impact: 3, mitigation_plan: "", owner: "Owner",
      escalation_level: "Task Owner", status: "Open", due_date: "",
    };
  }

  const load = async () => {
    const q = {};
    if (statusFilter !== "all") q.status = statusFilter;
    if (themeFilter !== "all") q.theme_id = themeFilter;
    if (initiativeFilter !== "all") q.initiative_id = initiativeFilter;
    const { data } = await api.get("/risks", { params: q });
    setList(data);
  };
  useEffect(() => { load(); }, [statusFilter, themeFilter, initiativeFilter]);
  useEffect(() => {
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/initiatives").then(({ data }) => setInitiatives(data));
  }, []);

  const submit = async () => {
    try {
      const init = initiatives.find((i) => i.id === form.initiative_id);
      if (!init) { toast.error(t("risk.pickInitiative")); return; }
      await api.post("/risks", {
        ...form,
        pillar_id: init.pillar_id, theme_id: init.theme_id,
      });
      toast.success(t("risk.added"));
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(`${t("risk.failedPrefix")} ${e.response?.data?.detail || e.message}`);
    }
  };

  const escalate = async (r) => {
    const idx = ESC.indexOf(r.escalation_level);
    const next = ESC[Math.min(idx + 1, ESC.length - 1)];
    await api.put(`/risks/${r.id}`, { escalation_level: next, status: "Escalated" });
    toast.success(`${t("risk.escalatedTo")} ${next}`);
    load();
  };

  const summary = {
    open: list.filter((r) => r.status === "Open").length,
    progress: list.filter((r) => r.status === "Mitigation In Progress").length,
    escalated: list.filter((r) => r.status === "Escalated").length,
    closed: list.filter((r) => r.status === "Closed").length,
  };

  const riskColor = (score) => {
    if (score >= 16) return "text-red-600 bg-red-100";
    if (score >= 9) return "text-amber-700 bg-amber-100";
    return "text-green-700 bg-green-100";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.risks.eyebrow"
        titleKey="page.risks.title"
        subtitleKey="page.risks.subtitle"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-[#0F172A]" data-testid="risk-create-btn">
            <Plus className="h-4 w-4 mr-2" /> {t("risk.newRisk")}
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <Stat label={t("risk.statOpen")} value={summary.open} color="#DC2626" />
        <Stat label={t("risk.statMitigation")} value={summary.progress} color="#F59E0B" />
        <Stat label={t("risk.statEscalated")} value={summary.escalated} color="#7C3AED" />
        <Stat label={t("risk.statClosed")} value={summary.closed} color="#16A34A" />
      </div>

      <SectionCard titleKey="risk.intelligenceTitle">
        <p className="text-sm text-slate-600 mb-3">{t("risk.intelligenceDesc")}</p>
        <Link to="/intelligence" className="text-sm text-orange-600 font-semibold inline-flex items-center gap-1">
          <Brain className="h-4 w-4" /> {t("risk.openHub")}
        </Link>
      </SectionCard>

      <SectionCard titleKey="risk.registerTitle" action={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="risk-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["Open", "Mitigation In Progress", "Escalated", "Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      }>
        <DataTable captionKey="table.caption.riskRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Prob</Th>
              <Th>Impact</Th>
              <Th>Score</Th>
              <Th>Escalation</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th scope="col"><span className="sr-only">{t("common.actions")}</span></Th>
            </tr>
          </THead>
          <tbody>
            {list.map((r) => (
              <tr
                key={r.id}
                data-testid={`risk-row-${r.id}`}
                className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedRisk?.id === r.id ? "bg-orange-50" : ""}`}
                onClick={() => setSelectedRisk(r)}
              >
                <Td className="font-mono text-xs">{r.code}</Td>
                <Td className="text-xs">{r.risk_type}</Td>
                <Td className="text-xs max-w-xs truncate">{r.description}</Td>
                <Td className="text-center">{r.probability}</Td>
                <Td className="text-center">{r.impact}</Td>
                <Td><span className={`inline-flex items-center justify-center w-9 h-7 rounded font-bold text-xs ${riskColor(r.risk_score)}`}>{r.risk_score}</span></Td>
                <Td className="text-xs">{r.escalation_level}</Td>
                <Td className="text-xs">{r.status}</Td>
                <Td className="text-xs">{r.due_date}</Td>
                <Td>
                  {r.status !== "Closed" && (
                    <button onClick={(e) => { e.stopPropagation(); escalate(r); }} data-testid={`risk-esc-${r.id}`} className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline">
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Escalate
                    </button>
                  )}
                  <Link to={`/intelligence?risk=${r.id}`} className="block text-xs text-orange-600 mt-1" onClick={(e) => e.stopPropagation()}>RCA</Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>

      {selectedRisk && (
        <EntityCollaborationPanel
          entityType="risk"
          entityId={selectedRisk.id}
          entityLabel={selectedRisk.code}
          author={selectedRisk.owner || "User"}
        />
      )}

      <SectionCard titleKey="risk.escalationMatrix">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { days: "7d", to: "Task Owner" },
            { days: "15d", to: "Dept Nodal" },
            { days: "30d", to: "Secretary" },
            { days: "45d", to: "ACS" },
            { days: "60d", to: "Chief Secretary" },
            { days: "Critical", to: "CM Review" },
          ].map((e) => (
            <div key={e.days} className="border border-slate-200 rounded-md p-3 text-center">
              <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto mb-2" />
              <div className="font-bold text-slate-900">{e.days}</div>
              <div className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">{e.to}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("risk.newRiskDialog")}</DialogTitle><DialogA11yDescription labelKey="a11y.dialog.risk" /></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Initiative</Label>
              <Select value={form.initiative_id} onValueChange={(v) => setForm({ ...form, initiative_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Risk Type</Label>
              <Select value={form.risk_type} onValueChange={(v) => setForm({ ...form, risk_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Owner</Label>
              <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Probability (1-5)</Label>
              <Input type="number" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-xs">Impact (1-5)</Label>
              <Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-xs">Escalation Level</Label>
              <Select value={form.escalation_level} onValueChange={(v) => setForm({ ...form, escalation_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESC.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Open", "Mitigation In Progress", "Escalated", "Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Mitigation Plan</Label>
              <Textarea value={form.mitigation_plan} onChange={(e) => setForm({ ...form, mitigation_plan: e.target.value })} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} className="bg-[#0F172A]" data-testid="risk-form-save">Save Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="text-3xl font-bold mt-2" style={{ fontFamily: "Manrope", color }}>{value}</div>
    </div>
  );
}
