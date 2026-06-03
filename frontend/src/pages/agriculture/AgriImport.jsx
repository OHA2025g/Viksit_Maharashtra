import React, { useEffect, useState } from "react";
import { api, getAPI } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AgriImport() {
  const [history, setHistory] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [versionName, setVersionName] = useState("");

  const load = async () => {
    const h = await api.get("/agriculture/import-history");
    setHistory(h.data);
    const b = await api.get("/agriculture/baselines");
    setBaselines(b.data);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Pick a file");
    setUploading(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("vm2047_token");
      const res = await fetch(`${getAPI()}/agriculture/import/preview`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreview(data);
      toast.success(`Parsed ${data.total_rows} rows`);
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      await api.post(`/agriculture/import/${preview.batch_id}/commit`, null, {
        params: versionName ? { version_name: versionName } : {},
      });
      toast.success("Baseline committed — agriculture data refreshed.");
      setPreview(null);
      setFile(null);
      setVersionName("");
      load();
    } catch (e) {
      toast.error("Commit failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setCommitting(false);
    }
  };

  const seedFromUrl = async () => {
    setUploading(true);
    try {
      await api.post("/agriculture/seed-from-url");
      toast.success("Re-imported canonical Excel as Baseline 1.0");
      load();
    } catch (e) {
      toast.error("Re-seed failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrowKey="page.agri.import.eyebrow"
        titleKey="page.agri.import.title"
        subtitleKey="page.agri.import.subtitle"
        actions={
          <Button onClick={seedFromUrl} variant="outline" disabled={uploading} data-testid="seed-canonical-btn">
            <RefreshCw className="h-4 w-4 mr-2" /> Re-seed canonical Excel
          </Button>
        }
      />

      <SectionCard title="1. Upload Excel">
        <form onSubmit={onUpload} className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm"
            onChange={(e) => setFile(e.target.files[0])}
            data-testid="excel-file-input"
            className="text-xs file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white hover:file:bg-slate-800"
          />
          <Button type="submit" disabled={!file || uploading} className="bg-emerald-600 hover:bg-emerald-700" data-testid="excel-upload-btn">
            <Upload className="h-4 w-4 mr-2" /> {uploading ? "Parsing…" : "Parse & Preview"}
          </Button>
          {file && <span className="text-xs text-slate-500">{file.name} · {(file.size / 1024).toFixed(1)} KB</span>}
        </form>
      </SectionCard>

      {preview && (
        <SectionCard title="2. Import Preview & Validation">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Stat label="Total rows" value={preview.total_rows} icon={Database} />
            <Stat label="Duplicates" value={preview.duplicates.length} icon={AlertTriangle} accent={preview.duplicates.length > 0} />
            <Stat label="Missing mandatory" value={preview.missing_mandatory.length} icon={AlertTriangle} accent={preview.missing_mandatory.length > 0} />
            <Stat label="Broken dependencies" value={preview.broken_dependencies.length} icon={AlertTriangle} accent={preview.broken_dependencies.length > 0} />
            <Stat label="Sheet" value={preview.sheet_name} icon={FileSpreadsheet} />
          </div>

          {preview.broken_dependencies.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
              <strong>Broken dependencies detected:</strong>{" "}
              {preview.broken_dependencies.slice(0, 5).map((d) => `${d.subtask_no} → ${d.missing_dep}`).join(", ")}
              {preview.broken_dependencies.length > 5 && ` … +${preview.broken_dependencies.length - 5} more`}
            </div>
          )}

          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">First 20 rows</div>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <DataTable captionKey="table.caption.agriImportPreview" className="text-xs">
              <THead>
                <tr>
                  <Th>Sub-task No</Th><Th>Sub-task</Th><Th>Task</Th><Th>Department</Th>
                  <Th>Planned Start</Th><Th>Planned End</Th><Th>Status</Th>
                </tr>
              </THead>
              <tbody>
                {preview.preview.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <Td className="font-mono">{r.subtask_no}</Td>
                    <Td className="max-w-[260px] truncate">{r.subtask}</Td>
                    <Td className="max-w-[160px] truncate">{r.task}</Td>
                    <Td>{r.responsible_department}</Td>
                    <Td>{r.planned_start}</Td>
                    <Td>{r.planned_end}</Td>
                    <Td>{r.status}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Baseline version name (optional)"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="max-w-md"
              data-testid="baseline-name-input"
            />
            <Button onClick={commit} disabled={committing} className="bg-slate-900 hover:bg-slate-800" data-testid="excel-commit-btn">
              <CheckCircle2 className="h-4 w-4 mr-2" /> {committing ? "Committing…" : "Freeze as Baseline"}
            </Button>
            <Button onClick={() => setPreview(null)} variant="outline">Cancel</Button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Baselines">
        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriBaselines">
            <THead>
              <tr><Th>Version</Th><Th>Source File</Th><Th>Rows</Th><Th>Created</Th><Th>Active</Th></tr>
            </THead>
            <tbody>
              {baselines.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <Td className="font-medium">{b.version_name}</Td>
                  <Td className="text-xs">{b.source_file || "—"}</Td>
                  <Td>{b.row_count}</Td>
                  <Td className="text-xs">{b.created_at?.slice(0, 19).replace("T", " ")}</Td>
                  <Td>{b.active ? <span className="inline-flex items-center gap-1 text-green-700 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active</span> : <span className="text-slate-400 text-xs">Archived</span>}</Td>
                </tr>
              ))}
              {baselines.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6 text-sm">No baselines yet.</td></tr>}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>

      <SectionCard title="Import History">
        <div className="overflow-x-auto">
          <DataTable captionKey="table.caption.agriImportHistory">
            <THead>
              <tr><Th>File</Th><Th>Sheet</Th><Th>Rows</Th><Th>Duplicates</Th><Th>Missing</Th><Th>Broken Deps</Th><Th>Status</Th></tr>
            </THead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100">
                  <Td className="text-xs">{h.filename}</Td>
                  <Td className="text-xs">{h.sheet}</Td>
                  <Td>{h.total_rows}</Td>
                  <Td>{h.duplicates?.length || 0}</Td>
                  <Td>{h.missing_mandatory_count || 0}</Td>
                  <Td>{h.broken_deps_count || 0}</Td>
                  <Td className="text-xs"><span className={`px-2 py-0.5 rounded-full ${h.status === "committed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{h.status}</span></Td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6 text-sm">No imports yet.</td></tr>}
            </tbody>
          </DataTable>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className={`border rounded-md p-3 flex items-center gap-3 ${accent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <Icon className={`h-5 w-5 ${accent ? "text-amber-600" : "text-slate-500"}`} />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className="text-xl font-bold" style={{ fontFamily: "Manrope" }}>{value}</div>
      </div>
    </div>
  );
}
