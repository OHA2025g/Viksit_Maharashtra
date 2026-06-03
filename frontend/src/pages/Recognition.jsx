import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { Trophy, AlertTriangle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function Recognition() {
  const { t } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/recognition/leaderboard").then(({ data: d }) => setData(d));
  }, []);

  if (!data) return <div className="text-sm text-slate-500">{t("recognition.loading")}</div>;

  const scoreLine = (d) =>
    t("recognition.scoreLine")
      .replace("{score}", d.score)
      .replace("{onTime}", d.on_time_rate)
      .replace("{evidence}", d.evidence_compliance);

  return (
    <div className="space-y-6">
      <PageHeader eyebrowKey="page.recognition.eyebrow" titleKey="page.recognition.title" subtitleKey="page.recognition.subtitle" />

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard titleKey="recognition.topDepts">
          <ul className="space-y-3">
            {data.top_departments?.map((d, i) => (
              <li key={d.department_id} className="flex items-center gap-3 border-b pb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Trophy className="h-4 w-4 text-amber-700" /></div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">#{i + 1} {d.department_name}</div>
                  <div className="text-xs text-slate-500">{scoreLine(d)}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard titleKey="recognition.needsIntervention">
          <ul className="space-y-3">
            {data.needs_intervention?.map((d) => (
              <li key={d.department_id} className="flex items-center gap-3 border-b pb-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-700" /></div>
                <div>
                  <div className="font-semibold text-sm">{d.department_name}</div>
                  <div className="text-xs text-slate-500">{t("recognition.scoreOnly").replace("{score}", d.score)}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard titleKey="recognition.notes">
        <ul className="list-disc pl-5 text-sm space-y-1">{data.recognition_notes?.filter(Boolean).map((n) => <li key={n}>{n}</li>)}</ul>
      </SectionCard>
    </div>
  );
}
