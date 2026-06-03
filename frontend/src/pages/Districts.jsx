import React, { useEffect, useState } from "react";
import { api, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, Th, ThKey, Td, THead } from "@/components/DataTable";
import { useI18n } from "@/contexts/I18nContext";
import { RAGBadge } from "@/components/RAGBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Map as MapIcon, Table as TableIcon } from "lucide-react";
import DistrictMap from "@/components/DistrictMap";

export default function Districts() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState("map");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/districts").then(({ data }) => setList(data));
    api.get("/districts/benchmark").then(({ data }) => setBenchmark(data)).catch(() => {});
  }, []);

  const filtered = list.filter(
    (d) => !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.region.toLowerCase().includes(q.toLowerCase())
  );

  const regions = ["Konkan", "Pune", "Nashik", "Aurangabad", "Amravati", "Nagpur"];

  return (
    <div className="space-y-6">
      <PageHeader eyebrowKey="page.districts.eyebrow" titleKey="page.districts.title" subtitleKey="page.districts.subtitle" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {regions.map((r) => {
          const reg = list.filter((d) => d.region === r);
          const avg = reg.length ? Math.round(reg.reduce((s, d) => s + d.progress_score, 0) / reg.length) : 0;
          return (
            <div key={r} className="bg-white border border-slate-200 rounded-md p-4 text-center">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{r}</div>
              <div className="text-2xl font-bold mt-1" style={{ fontFamily: "Manrope" }}>{avg}%</div>
              <div className="text-[10px] text-slate-400">{reg.length} districts</div>
            </div>
          );
        })}
      </div>

      {benchmark && (
        <SectionCard title={t("district.benchmarkTitle")}>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-xs text-slate-500 uppercase">{t("district.stateAvg")}</div>
              <div className="text-2xl font-bold">{benchmark.state_average}%</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-xs font-semibold text-green-700 mb-2">{t("district.topPerforming")}</div>
              {(benchmark.top_performers || []).slice(0, 3).map((d) => (
                <div key={d.id} className="text-xs flex justify-between py-1"><span>{d.name}</span><span className="font-bold">{d.district_score ?? d.progress_score}%</span></div>
              ))}
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-xs font-semibold text-red-700 mb-2">{t("district.needsIntervention")}</div>
              {(benchmark.underperformers || []).slice(0, 3).map((d) => (
                <div key={d.id} className="text-xs flex justify-between py-1"><span>{d.name}</span><span className="font-bold">{d.district_score ?? d.progress_score}%</span></div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-64">
            <DataTable captionKey="table.caption.districtBenchmark">
              <thead>
                <tr className="text-left border-b text-slate-500">
                  <Th scope="col">{t("table.district")}</Th>
                  <Th scope="col">{t("table.score")}</Th>
                  <Th scope="col">{t("table.vsAvg")}</Th>
                  <Th scope="col">{t("table.peerGroup")}</Th>
                  <Th scope="col">{t("table.rag")}</Th>
                </tr>
              </thead>
              <tbody>
                {(benchmark.all_districts || []).slice(0, 15).map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <Td className="py-1.5">{d.name}</Td>
                    <Td>{d.district_score ?? d.progress_score}%</Td>
                    <Td className={d.vs_state_avg >= 0 ? "text-green-600" : "text-red-600"}>{d.vs_state_avg > 0 ? "+" : ""}{d.vs_state_avg}</Td>
                    <Td className="text-xs">{d.peer_group}</Td>
                    <Td><RAGBadge rag={d.rag} /></Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </SectionCard>
      )}

      <Tabs value={view} onValueChange={setView}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="map" data-testid="district-view-map"><MapIcon className="h-3.5 w-3.5 mr-1.5" /> {t("district.mapTab")}</TabsTrigger>
            <TabsTrigger value="table" data-testid="district-view-table"><TableIcon className="h-3.5 w-3.5 mr-1.5" /> {t("district.tableTab")}</TabsTrigger>
          </TabsList>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("district.search")} className="pl-9" data-testid="district-search" />
          </div>
        </div>

        <TabsContent value="map" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <ChartRegion labelKey="a11y.mapDistricts">
                <DistrictMap districts={filtered} onSelect={setSelected} ariaLabel={t("a11y.mapDistricts")} />
              </ChartRegion>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                <span className="font-semibold uppercase tracking-widest">{t("district.legend")}:</span>
                {["green", "amber", "red", "blue", "grey"].map((r) => (
                  <span key={r} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: RAG_COLORS[r].solid }} />
                    {RAG_COLORS[r].label}
                  </span>
                ))}
                <span className="text-slate-400">· {t("district.markerSize")}</span>
              </div>
            </div>
            <div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-20">
                {selected ? (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">{selected.region} {t("district.division")}</div>
                    <h4 className="text-lg font-bold mt-1" style={{ fontFamily: "Manrope" }}>{selected.name}</h4>
                    <RAGBadge rag={selected.rag} />
                    <div className="mt-4 space-y-2 text-xs">
                      <Stat label={t("district.stat.overall")} value={`${selected.progress_score}%`} color={RAG_COLORS[selected.rag].solid} />
                      <Stat label={t("district.stat.infrastructure")} value={`${selected.infrastructure_progress}%`} />
                      <Stat label={t("district.stat.employment")} value={`${selected.employment_progress}%`} />
                      <Stat label={t("district.stat.investment")} value={`${selected.investment_progress}%`} />
                      <Stat label={t("district.stat.welfare")} value={`${selected.welfare_coverage}%`} />
                      <Stat label={t("district.stat.localRisks")} value={selected.local_risks} accent={selected.local_risks > 8} />
                      <Stat label={t("district.stat.evidence")} value={selected.evidence_uploaded} />
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-8">
                    <MapIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    {t("district.clickMarker")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <SectionCard>
            <DataTable captionKey="table.caption.districtList">
              <THead>
                <tr>
                  <ThKey labelKey="table.district" />
                  <ThKey labelKey="table.region" />
                  <ThKey labelKey="table.progress" />
                  <ThKey labelKey="table.infra" />
                  <ThKey labelKey="table.employment" />
                  <ThKey labelKey="table.investment" />
                  <ThKey labelKey="table.welfare" />
                  <ThKey labelKey="table.risks" />
                  <ThKey labelKey="table.rag" />
                </tr>
              </THead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} data-testid={`district-${d.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <Td className="font-medium">{d.name}</Td>
                    <Td className="text-xs text-slate-600">{d.region}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${d.progress_score}%`, background: RAG_COLORS[d.rag].solid }} /></div>
                        <span className="text-xs font-mono">{d.progress_score}%</span>
                      </div>
                    </Td>
                    <Td className="text-xs">{d.infrastructure_progress}%</Td>
                    <Td className="text-xs">{d.employment_progress}%</Td>
                    <Td className="text-xs">{d.investment_progress}%</Td>
                    <Td className="text-xs">{d.welfare_coverage}%</Td>
                    <Td className={d.local_risks > 8 ? "text-red-600 font-semibold text-xs" : "text-xs"}>{d.local_risks}</Td>
                    <Td><RAGBadge rag={d.rag} /></Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, color, accent }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${accent ? "text-red-600" : ""}`} style={color ? { color } : {}}>{value}</span>
    </div>
  );
}
