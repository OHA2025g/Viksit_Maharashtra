import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";

export default function Watchlist() {
  const { t } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/watchlist").then(({ data: d }) => setData(d));
  }, []);

  if (!data) return <div className="text-sm text-slate-500">{t("watchlist.loading")}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.watchlist.eyebrow"
        titleKey="page.watchlist.title"
        subtitle={`${data.count} ${t("watchlist.flaggedSuffix")} ${new Date(data.generated_at).toLocaleString()}`}
      />
      <SectionCard titleKey="watchlist.itemsTitle">
        <DataTable captionKey="table.caption.watchlist">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <ThKey labelKey="watchlist.milestone" />
              <ThKey labelKey="table.rag" />
              <ThKey labelKey="watchlist.reasons" />
              <ThKey labelKey="watchlist.risk" />
              <ThKey labelKey="common.actions" scope="col" />
            </tr>
          </THead>
          <tbody>
            {data.items?.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                <Td className="py-3 font-mono text-xs">{item.code}</Td>
                <Td className="max-w-xs">{item.name}</Td>
                <Td><RAGBadge rag={item.rag} /></Td>
                <Td className="max-w-sm">
                  <ul className="list-disc pl-4 text-xs text-slate-600">
                    {item.reasons?.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </Td>
                <Td>
                  <span className={`text-xs font-bold ${item.delay_risk?.risk_category === "Critical" ? "text-red-600" : "text-amber-600"}`}>
                    {item.delay_risk?.risk_category} ({item.delay_risk?.delay_risk_score})
                  </span>
                </Td>
                <Td>
                  <Link to={`/intelligence?milestone=${item.id}`} className="text-orange-600 text-xs font-semibold hover:underline">
                    {t("watchlist.analyze")}
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>
    </div>
  );
}
