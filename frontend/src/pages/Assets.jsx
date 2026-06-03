import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import DistrictMap from "@/components/DistrictMap";
import { RAG_COLORS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogA11yDescription } from "@/components/DialogA11y";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";

const EMPTY_FORM = { name: "", district_id: "", latitude: "", longitude: "", rag: "green", status: "In Progress" };

export default function Assets() {
  const { t } = useI18n();
  const [assets, setAssets] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () => {
    api.get("/assets").then(({ data }) => setAssets(data || []));
    api.get("/districts").then(({ data }) => setDistricts(data || []));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter ? assets.filter((a) => a.district_id === filter) : assets;
  const mapDistricts = districts.map((d) => ({
    ...d,
    asset_count: assets.filter((a) => a.district_id === d.id).length,
  }));

  const openCreate = () => {
    setEditMode(false);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditMode(true);
    setForm({
      name: selected.name || "",
      district_id: selected.district_id || "",
      latitude: String(selected.latitude ?? ""),
      longitude: String(selected.longitude ?? ""),
      rag: selected.rag || "green",
      status: selected.status || "In Progress",
    });
    setDialogOpen(true);
  };

  const saveAsset = async () => {
    if (!form.name.trim()) {
      toast.error(t("assets.nameRequired"));
      return;
    }
    const payload = {
      name: form.name.trim(),
      district_id: form.district_id || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      rag: form.rag,
      status: form.status,
      by: "Asset Manager",
    };
    try {
      if (editMode && selected) {
        const { data } = await api.put(`/assets/${selected.id}`, payload);
        setSelected(data);
        toast.success(t("assets.updated"));
      } else {
        const { data } = await api.post("/assets", payload);
        setSelected(data);
        toast.success(t("assets.registered"));
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error(t("assets.saveFailed"));
    }
  };

  const deleteAsset = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete asset ${selected.asset_id}?`)) return;
    try {
      await api.delete(`/assets/${selected.id}`, { params: { by: "Asset Manager" } });
      toast.success(t("assets.deleted"));
      setSelected(null);
      load();
    } catch {
      toast.error(t("assets.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.assets.eyebrow"
        titleKey="page.assets.title"
        subtitleKey="page.assets.subtitle"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openEdit} disabled={!selected}>
              <Pencil className="h-4 w-4 mr-1" /> {t("assets.edit")}
            </Button>
            <Button size="sm" variant="outline" onClick={deleteAsset} disabled={!selected} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-1" /> {t("assets.delete")}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> {t("assets.register")}
            </Button>
          </div>
        }
      />

      <TabsFallback filter={filter} setFilter={setFilter} districts={districts} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard titleKey="assets.mapTitle">
            <ChartRegion labelKey="a11y.mapDistricts">
            <div className="h-[min(42rem,72vh)] min-h-[36rem] rounded-lg overflow-hidden border border-slate-200">
              <DistrictMap
                compact
                variant="assets"
                districts={mapDistricts}
                assets={filtered}
                selectedAssetId={selected?.id}
                onAssetSelect={(a) => { setSelected(a); setFilter(a.district_id || ""); }}
                ariaLabel={t("assets.mapTitle")}
              />
            </div>
            </ChartRegion>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="font-semibold uppercase tracking-widest">{t("assets.mapLegend")}:</span>
                {["green", "amber", "red", "blue"].map((r) => (
                  <span key={r} className="inline-flex items-center gap-1.5">
                    <span
                      className="relative inline-flex h-3 w-3 items-center justify-center"
                      aria-hidden
                    >
                      <span
                        className="absolute h-3 w-3 rounded-full opacity-35"
                        style={{ background: RAG_COLORS[r].solid }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: RAG_COLORS[r].solid }}
                      />
                    </span>
                    {RAG_COLORS[r].label}
                  </span>
                ))}
              </div>
              <a
                href="https://stategisportal.nic.in/stategisportal/Home/Map/27"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-600 hover:underline font-medium"
              >
                {t("assets.gisPortalLink")} ↗
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("assets.mapAttribution")}</p>
            {selected && (
              <p className="text-xs text-slate-500 mt-2">
                {t("assets.selectedCoords")} {selected.name} · {selected.latitude?.toFixed(4)}, {selected.longitude?.toFixed(4)}
              </p>
            )}
          </SectionCard>
        </div>
        <SectionCard titleKey={selected ? "assets.detailTitle" : "assets.selectAsset"}>
          {selected ? (
            <dl className="text-sm space-y-2">
              <div><dt className="text-slate-500">ID</dt><dd className="font-mono">{selected.asset_id}</dd></div>
              <div><dt className="text-slate-500">{t("table.name")}</dt><dd>{selected.name}</dd></div>
              <div><dt className="text-slate-500">{t("table.district")}</dt><dd>{selected.district_name}</dd></div>
              <div><dt className="text-slate-500">Lat/Lon</dt><dd>{selected.latitude?.toFixed(4)}, {selected.longitude?.toFixed(4)}</dd></div>
              <div><dt className="text-slate-500">{t("evidence.status")}</dt><dd><RAGBadge rag={selected.rag} /></dd></div>
            </dl>
          ) : <p className="text-sm text-slate-500">{t("assets.clickRow")}</p>}
        </SectionCard>
      </div>

      {selected && (
        <EntityCollaborationPanel
          entityType="asset"
          entityId={selected.id}
          entityLabel={selected.asset_id}
          author="Asset Manager"
        />
      )}

      <SectionCard title={`${t("assets.assetsCount")} (${filtered.length})`}>
        <DataTable captionKey="table.caption.assetRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <ThKey labelKey="table.name" />
              <ThKey labelKey="table.district" />
              <ThKey labelKey="table.rag" />
              <Th>Coords</Th>
            </tr>
          </THead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className={`border-b hover:bg-slate-50 cursor-pointer ${selected?.id === a.id ? "bg-orange-50" : ""}`}
                onClick={() => { setSelected(a); setFilter(a.district_id || ""); }}
              >
                <Td className="py-2 font-mono text-xs">{a.asset_id}</Td>
                <Td>{a.name?.slice(0, 50)}</Td>
                <Td>{a.district_name}</Td>
                <Td><RAGBadge rag={a.rag} /></Td>
                <Td className="text-xs">{a.latitude?.toFixed(3)}, {a.longitude?.toFixed(3)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? t("assets.editDialog") : t("assets.registerDialog")}</DialogTitle>
            <DialogA11yDescription labelKey="a11y.dialog.asset" />
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>District</Label>
              <Select value={form.district_id} onValueChange={(v) => setForm({ ...form, district_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="18.5204" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="73.8567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>RAG</Label>
                <Select value={form.rag} onValueChange={(v) => setForm({ ...form, rag: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["green", "amber", "red"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAsset}>{editMode ? "Save changes" : "Create asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabsFallback({ filter, setFilter, districts }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button type="button" onClick={() => setFilter("")} className={`px-3 py-1 rounded-full text-xs border ${!filter ? "bg-slate-900 text-white" : ""}`}>All districts</button>
      {districts.slice(0, 6).map((d) => (
        <button key={d.id} type="button" onClick={() => setFilter(d.id)} className={`px-3 py-1 rounded-full text-xs border ${filter === d.id ? "bg-orange-600 text-white" : ""}`}>{d.name}</button>
      ))}
    </div>
  );
}
