import React, { useEffect, useState } from "react";
import { api, getAPI } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

const PACK_CONFIG = [
  { apiSlug: "weekly-pmo-review", labelKey: "meeting.pack.weeklyPmo" },
  { apiSlug: "monthly-department-review", labelKey: "meeting.pack.monthlyDept" },
  { apiSlug: "monthly-vmu-review", labelKey: "meeting.pack.monthlyVmu" },
  { apiSlug: "chief-secretary-review", labelKey: "meeting.pack.csReview" },
  { apiSlug: "quarterly-cm-review", labelKey: "meeting.pack.quarterlyCm" },
];

export default function MeetingPacks() {
  const { t } = useI18n();
  const [packSlug, setPackSlug] = useState(PACK_CONFIG[0].apiSlug);
  const [pack, setPack] = useState(null);
  const [exporting, setExporting] = useState(null);

  const load = () => {
    api.get(`/meeting-packs/${packSlug}`).then(({ data }) => setPack(data));
  };

  useEffect(() => {
    load();
  }, [packSlug]);

  const exportPack = async (format) => {
    setExporting(format);
    try {
      const token = localStorage.getItem("vm2047_token");
      const res = await fetch(`${getAPI()}/meeting-packs/${packSlug}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "txt";
      const label = PACK_CONFIG.find((p) => p.apiSlug === packSlug)?.labelKey;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(label ? t(label) : packSlug).replace(/\s+/g, "_")}_pack.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${t("meeting.exportSuccess")} ${ext.toUpperCase()}`);
    } catch (e) {
      toast.error(e.message || t("meeting.exportFailed"));
    } finally {
      setExporting(null);
    }
  };

  if (!pack) return <div className="text-sm text-slate-500">{t("meeting.loading")}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.meetingPacks.eyebrow"
        titleKey="page.meetingPacks.title"
        subtitleKey="page.meetingPacks.subtitle"
        actions={
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={packSlug} onValueChange={setPackSlug}>
            <SelectTrigger className="w-64" aria-label={t("meeting.packType")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PACK_CONFIG.map((p) => <SelectItem key={p.apiSlug} value={p.apiSlug}>{t(p.labelKey)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportPack("txt")} disabled={!!exporting}>
            <Download className="h-4 w-4 mr-2" />{exporting === "txt" ? t("meeting.exporting") : t("meeting.exportTxt")}
          </Button>
          <Button onClick={() => exportPack("pdf")} disabled={!!exporting}>
            <FileText className="h-4 w-4 mr-2" />{exporting === "pdf" ? t("meeting.exporting") : t("meeting.exportPdf")}
          </Button>
        </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard titleKey="meeting.agenda">
          <ol className="list-decimal pl-5 text-sm space-y-1">{pack.agenda?.map((a) => <li key={a}>{a}</li>)}</ol>
        </SectionCard>
        <SectionCard titleKey="meeting.lastDecisions">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{pack.last_meeting_decisions || "—"}</p>
        </SectionCard>
        <SectionCard titleKey="meeting.pendingActions">
          <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
            {(pack.pending_action_items || []).map((a) => (
              <li key={a.id || a.code} className="border-b pb-1">{a.title || a.code} · {a.status}</li>
            ))}
            {(pack.pending_action_items || []).length === 0 && <li className="text-slate-500">{t("meeting.nonePending")}</li>}
          </ul>
        </SectionCard>
        <SectionCard titleKey="meeting.suggestedDecisions">
          <ul className="list-disc pl-5 text-sm space-y-1">{pack.suggested_decisions?.map((d) => <li key={d}>{d}</li>)}</ul>
        </SectionCard>
        <SectionCard titleKey="meeting.redAmberMs">
          <ul className="text-sm space-y-2 max-h-64 overflow-y-auto">
            {pack.red_amber_milestones?.slice(0, 12).map((m) => (
              <li key={m.id} className="border-b pb-1">{m.name} — {m.rag}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard titleKey="meeting.topDelayed">
          <ul className="text-sm space-y-2 max-h-64 overflow-y-auto">
            {(pack.top_delayed || []).map((m) => (
              <li key={m.id} className="border-b pb-1">{m.name}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard titleKey="meeting.topRisks">
          <ul className="text-sm space-y-2 max-h-64 overflow-y-auto">
            {(pack.top_risks || []).map((r) => (
              <li key={r.id} className="border-b pb-1">{r.description?.slice(0, 70)} · score {r.risk_score}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard titleKey="meeting.summaryMetrics">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt>{t("meeting.watchlistCount")}</dt><dd className="font-bold">{pack.watchlist_count}</dd></div>
            <div className="flex justify-between"><dt>{t("meeting.evidenceCompliance")}</dt><dd className="font-bold">{pack.evidence_compliance_pct}%</dd></div>
            <div className="flex justify-between"><dt>{t("meeting.avgBudgetUtil")}</dt><dd className="font-bold">{pack.budget_summary?.avg_utilization}%</dd></div>
            <div className="flex justify-between"><dt>{t("meeting.kpiHealth")}</dt><dd className="font-bold">{pack.kpi_summary?.green}/{pack.kpi_summary?.total}</dd></div>
          </dl>
        </SectionCard>
        <SectionCard titleKey="meeting.deptPerformance">
          <ul className="text-sm list-disc pl-5">
            {(pack.department_performance || []).map((d) => <li key={d.name}>{d.name}</li>)}
          </ul>
        </SectionCard>
      </div>

      <SectionCard titleKey="meeting.minutesTemplate">
        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{pack.minutes_template}</pre>
      </SectionCard>
    </div>
  );
}
