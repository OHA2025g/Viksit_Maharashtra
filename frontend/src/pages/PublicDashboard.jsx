import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { useI18n } from "@/contexts/I18nContext";
import { Shield, ArrowLeft } from "lucide-react";

export default function PublicDashboard() {
  const [data, setData] = useState(null);
  const { t } = useI18n();

  useEffect(() => {
    api.get("/public/dashboard").then(({ data: d }) => setData(d)).catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-slate-500">{t("public.loading")}</div>;

  const citizenBody = t("public.citizenSnapshotBody").replace("{pct}", data.vision_progress_pct);

  return (
    <div className="min-h-screen bg-slate-50" role="main" aria-label={t("public.title")}>
      <a href="#public-main" className="skip-link">{t("a11y.skipToMain")}</a>
      <header className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-orange-300">{t("public.brand")}</div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Manrope" }}>{t("public.title")}</h1>
        </div>
        <Link to="/login" className="text-sm flex items-center gap-2 text-orange-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t("public.officerLogin")}
        </Link>
      </header>

      <div id="public-main" tabIndex={-1} className="max-w-7xl mx-auto p-6 space-y-8 outline-none">
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <Shield className="h-4 w-4 text-blue-600" aria-hidden />
          {data.disclaimer}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-5" aria-label={t("public.visionProgress")}>
            <div className="text-xs text-slate-500 uppercase">{t("public.visionProgress")}</div>
            <div className="text-3xl font-bold text-slate-900">{data.vision_progress_pct}%</div>
          </div>
          {Object.entries(data.public_rag_summary || {}).map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg border p-5">
              <div className="text-xs text-slate-500 uppercase">{k} {t("public.milestonesSuffix")}</div>
              <div className="text-2xl font-bold" style={{ color: RAG_COLORS[k]?.solid }}>{v}</div>
              <RAGBadge rag={k} showLabel />
            </div>
          ))}
        </div>

        <SectionCard titleKey="public.pillarProgress">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.pillars?.map((p) => (
              <div key={p.code} className="border rounded-lg p-4">
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-2xl font-bold mt-1">{p.progress_pct}%</div>
                <div className="text-xs text-slate-500 mt-1">G:{p.rag_green} A:{p.rag_amber} R:{p.rag_red}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titleKey="public.themeProgress">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.themes?.map((theme) => (
              <div key={theme.name} className="border rounded-lg p-3 bg-white">
                <div className="text-xs font-semibold text-slate-800 line-clamp-2 min-h-[2rem]">{theme.name}</div>
                <div className="text-xl font-bold mt-1">{theme.progress_pct}%</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-5" aria-label={t("public.evidenceBacked")}>
            <div className="text-xs text-slate-500 uppercase">{t("public.evidenceBacked")}</div>
            <div className="text-3xl font-bold text-emerald-700">{data.evidence_backed_milestones ?? 0}</div>
            <p className="text-xs text-slate-500 mt-2">{t("public.evidenceBackedDesc")}</p>
          </div>
          <div className="md:col-span-2 bg-gradient-to-r from-orange-50 to-green-50 rounded-lg border p-5">
            <div className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-2">{t("public.citizenSnapshot")}</div>
            <p className="text-sm text-slate-700">{citizenBody}</p>
          </div>
        </div>

        <SectionCard titleKey="public.districtProgress">
          <ChartRegion labelKey="chart.publicDistricts">
            <div className="overflow-x-auto">
              <DataTable captionKey="table.caption.publicDistricts">
                <THead>
                  <tr>
                    <ThKey labelKey="table.district" />
                    <ThKey labelKey="table.region" />
                    <ThKey labelKey="table.progress" />
                    <ThKey labelKey="table.rag" />
                  </tr>
                </THead>
                <tbody>
                  {data.districts?.slice(0, 12).map((d) => (
                    <tr key={d.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <Td className="py-2">{d.name}</Td>
                      <Td>{d.region}</Td>
                      <Td>{d.progress_score}%</Td>
                      <Td><RAGBadge rag={d.rag} /></Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </ChartRegion>
        </SectionCard>

        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard titleKey="public.completedProjects">
            <ul className="space-y-2 text-sm">
              {data.completed_projects?.map((p) => (
                <li key={p.name} className="flex justify-between border-b pb-2">
                  <span>{p.name}</span>
                  <span className="font-semibold">{p.completion_pct}%</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard titleKey="public.ongoingProjects">
            <ul className="space-y-2 text-sm">
              {data.ongoing_projects?.map((p) => (
                <li key={p.name} className="flex justify-between border-b pb-2">
                  <span>{p.name}</span>
                  <RAGBadge rag={p.rag} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <p className="text-xs text-slate-400 text-center">{t("public.generated")} {new Date(data.generated_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
