import { API } from "@/lib/api";

export const REPORT_SLUGS = {
  "Vision 2047 Executive Summary": "executive-summary",
  "Pillar-wise Progress Report": "pillar-progress",
  "Theme-wise Progress Report": "theme-progress",
  "Department Performance Report": "department-performance",
  "District Progress Report": "district-progress",
  "Delayed Milestone Report": "delayed-milestones",
  "Risk and Escalation Report": "risk-escalation",
  "Evidence Compliance Report": "evidence-compliance",
  "Budget Utilization Report": "budget-utilization",
  "CM Review Note": "cm-review-note",
  "Chief Secretary Review Note": "cs-review-note",
  "Agriculture Mission Report": "agriculture-mission",
};

export const AGRI_REPORT_DATASETS = {
  "Agriculture Executive Progress Summary": "agri-overview",
  "Agriculture Milestone Progress Report": "agri-milestones",
  "Agriculture Department Performance Report": "agri-departments",
  "Agriculture Delayed Sub-task Report": "agri-subtasks",
  "Agriculture Dependency Blocker Report": "agri-dependencies",
  "Agriculture CM Review Note": "agri-cm-review",
};

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

export async function downloadReport(title, format = "csv") {
  const id = REPORT_SLUGS[title] || "executive-summary";
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  await downloadBlob(
    `${API}/reports/${id}/export?format=${format}`,
    `${title.replace(/\s+/g, "_")}.${ext}`,
  );
}

export async function downloadAgriReport(title, format = "csv", ragFilter) {
  const dataset = AGRI_REPORT_DATASETS[title];
  if (!dataset) throw new Error("Unknown agriculture report");
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  let url = `${API}/reports/agri/${dataset}/export?format=${format}`;
  if (ragFilter?.length) url += `&rag=${ragFilter.join(",")}`;
  await downloadBlob(url, `${title.replace(/\s+/g, "_")}.${ext}`);
}
