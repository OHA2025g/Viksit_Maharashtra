import React, { useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, FileBarChart, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { api, getAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { RAGBadge } from "@/components/RAGBadge";
import { useI18n } from "@/contexts/I18nContext";

const REPORTS = [
  { titleKey: "report.executiveSummary.title", descKey: "report.executiveSummary.desc", slug: "executive-summary" },
  { titleKey: "report.pillarProgress.title", descKey: "report.pillarProgress.desc", slug: "pillar-progress" },
  { titleKey: "report.themeProgress.title", descKey: "report.themeProgress.desc", slug: "theme-progress" },
  { titleKey: "report.deptPerformance.title", descKey: "report.deptPerformance.desc", slug: "department-performance" },
  { titleKey: "report.districtProgress.title", descKey: "report.districtProgress.desc", slug: "district-progress" },
  { titleKey: "report.delayedMilestones.title", descKey: "report.delayedMilestones.desc", slug: "delayed-milestones" },
  { titleKey: "report.riskEscalation.title", descKey: "report.riskEscalation.desc", slug: "risk-escalation" },
  { titleKey: "report.evidenceCompliance.title", descKey: "report.evidenceCompliance.desc", slug: "evidence-compliance" },
  { titleKey: "report.budgetUtilization.title", descKey: "report.budgetUtilization.desc", slug: "budget-utilization" },
  { titleKey: "report.cmReview.title", descKey: "report.cmReview.desc", slug: "cm-review-note" },
  { titleKey: "report.csReview.title", descKey: "report.csReview.desc", slug: "cs-review-note" },
  { titleKey: "report.agriMission.title", descKey: "report.agriMission.desc", slug: "agriculture-mission" },
  { titleKey: "report.agriOverview.title", descKey: "report.agriOverview.desc", agri: true, dataset: "agri-overview" },
  { titleKey: "report.agriMilestones.title", descKey: "report.agriMilestones.desc", agri: true, dataset: "agri-milestones" },
  { titleKey: "report.agriDepartments.title", descKey: "report.agriDepartments.desc", agri: true, dataset: "agri-departments" },
  { titleKey: "report.agriSubtasks.title", descKey: "report.agriSubtasks.desc", agri: true, dataset: "agri-subtasks", filter: { rag: ["red", "amber"] } },
  { titleKey: "report.agriDependencies.title", descKey: "report.agriDependencies.desc", agri: true, dataset: "agri-dependencies" },
  { titleKey: "report.agriCmReview.title", descKey: "report.agriCmReview.desc", agri: true, dataset: "agri-cm-review" },
];

async function downloadBlob(url, filename) {
  const token = localStorage.getItem("vm2047_token");
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function Reports() {
  const { t } = useI18n();
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    api.get("/watchlist").then(({ data }) => setWatchlist(data?.items || [])).catch(() => {});
  }, []);

  const download = async (report, format) => {
    const fmt = format === "xlsx" ? "xlsx" : format;
    const title = t(report.titleKey);
    const ext = fmt;
    try {
      if (report.agri) {
        let url = `${getAPI()}/reports/agri/${report.dataset}/export?format=${fmt}`;
        if (report.filter?.rag?.length) url += `&rag=${report.filter.rag.join(",")}`;
        await downloadBlob(url, `${title.replace(/\s+/g, "_")}.${ext}`);
      } else if (report.slug) {
        await downloadBlob(`${getAPI()}/reports/${report.slug}/export?format=${fmt}`, `${title.replace(/\s+/g, "_")}.${ext}`);
      } else {
        toast.error(t("report.exportNotConfigured"));
        return;
      }
      toast.success(`${title} ${t("report.downloadSuccess")} ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(`${t("report.downloadFailed")}: ${e.message || ""}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.reports.eyebrow"
        titleKey="page.reports.title"
        subtitleKey="page.reports.subtitle"
      />

      <SectionCard
        title={t("report.watchlistSection")}
        action={<Link to="/watchlist" className="text-xs text-orange-600 inline-flex items-center gap-1"><ListTodo className="h-3 w-3" /> {t("report.fullWatchlist")}</Link>}
      >
        <div className="space-y-2">
          {watchlist.length === 0 && <p className="text-sm text-slate-500">{t("report.noStuckItems")}</p>}
          {watchlist.slice(0, 4).map((w) => (
            <div key={w.id || w.milestone_id} className="flex justify-between text-sm border-b pb-2">
              <span className="truncate flex-1">{w.name || w.milestone_name}</span>
              <RAGBadge rag={w.rag || "amber"} />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORTS.map((r, idx) => (
          <div key={r.titleKey} data-testid={`report-${idx}`} className={`bg-white border rounded-lg p-5 card-hover ${r.agri ? "border-emerald-200" : "border-slate-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${r.agri ? "bg-emerald-600" : "bg-slate-900"}`}>
                <FileBarChart className="h-5 w-5 text-white" />
              </div>
              {r.agri && <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">{t("report.agriBadge")}</span>}
            </div>
            <h4 className="text-base font-semibold text-slate-900 leading-tight" style={{ fontFamily: "Manrope" }}>{t(r.titleKey)}</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t(r.descKey)}</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => download(r, "pdf")} className="text-xs flex-1">
                <FileText className="h-3.5 w-3.5 mr-1" /> {t("common.pdf")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => download(r, "csv")} className="text-xs flex-1" data-testid={`csv-${idx}`}>
                <Download className="h-3.5 w-3.5 mr-1" /> {t("common.csv")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => download(r, "xlsx")} className="text-xs flex-1">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> {t("common.xlsx")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
