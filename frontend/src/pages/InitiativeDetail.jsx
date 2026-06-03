import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, formatCrore, RAG_COLORS } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import EntityCollaborationPanel from "@/components/EntityCollaborationPanel";

export default function InitiativeDetail() {
  const { initiativeId } = useParams();
  const [initiative, setInitiative] = useState(null);
  const [theme, setTheme] = useState(null);
  const [department, setDepartment] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    api.get(`/initiatives/${initiativeId}`)
      .then(async ({ data: init }) => {
        if (!active) return;
        const [themeRes, deptRes, msRes, riskRes] = await Promise.all([
          api.get(`/themes/${init.theme_id}`),
          api.get("/departments"),
          api.get("/milestones", { params: { initiative_id: initiativeId } }),
          api.get("/risks", { params: { initiative_id: initiativeId } }),
        ]);
        if (!active) return;
        setInitiative(init);
        setTheme(themeRes.data);
        setDepartment(deptRes.data.find((d) => d.id === init.lead_department_id) || null);
        setMilestones(msRes.data);
        setRisks(riskRes.data);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initiativeId]);

  if (loading) return <div className="text-slate-500 text-sm">Loading initiative…</div>;
  if (notFound) return <Navigate to="/initiatives" replace />;

  const utilPct = initiative.budget_estimate
    ? Math.round((initiative.budget_utilized / initiative.budget_estimate) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <Breadcrumb
        themeId={initiative.theme_id}
        themeName={theme?.name}
        current={initiative.code}
      />

      <PageHeader
        eyebrow={theme?.name || "Initiative"}
        title={initiative.name}
        subtitle={initiative.description}
        actions={<RAGBadge rag={initiative.rag} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Stat label="Progress" value={`${initiative.completion_pct ?? 0}%`} accent={RAG_COLORS[initiative.rag]?.solid} />
        <Stat label="Status" value={initiative.status} />
        <Stat label="Target year" value={initiative.target_year} />
        <Stat label="Priority" value={initiative.priority} />
        <Stat label="Budget used" value={`${utilPct}%`} sub={`${formatCrore(initiative.budget_utilized)} / ${formatCrore(initiative.budget_estimate)}`} />
        <Stat label="Department" value={department?.name?.replace(" Department", "") || "—"} sub={department?.head} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Initiative details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Code" value={initiative.code} />
            <Detail label="Funding" value={initiative.funding_source} />
            <Detail label="PPP potential" value={initiative.ppp_potential} />
            <Detail label="Private investment" value={formatCrore(initiative.private_investment_committed || 0)} />
            <Detail label="Created by" value={initiative.created_by} />
            <Detail label="Created at" value={initiative.created_at?.slice(0, 10)} />
          </dl>
        </SectionCard>

        <SectionCard title="Quick drill-down">
          <div className="space-y-2">
            <DrillRow
              to={`/milestones?initiative_id=${initiativeId}&theme_id=${initiative.theme_id}`}
              label="Milestones"
              count={milestones.length}
              testId="drill-init-milestones"
            />
            <DrillRow
              to={`/risks?initiative_id=${initiativeId}`}
              label="Risks"
              count={risks.length}
              testId="drill-init-risks"
            />
            <DrillRow
              to={`/themes/${initiative.theme_id}`}
              label="Parent theme"
              testId="drill-init-theme"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Milestone pipeline"
        action={
          milestones.length > 0 ? (
            <Link
              to={`/milestones?initiative_id=${initiativeId}&theme_id=${initiative.theme_id}`}
              className="text-xs font-medium text-orange-600 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      >
        <DataTable caption={`Milestones for ${initiative.name}`}>
          <THead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Progress</Th>
              <Th>RAG</Th>
            </tr>
          </THead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <Td className="font-mono text-xs">{m.code}</Td>
                <Td>
                  <Link
                    to={`/milestones?initiative_id=${initiativeId}&search=${encodeURIComponent(m.name)}`}
                    className="font-medium text-slate-900 hover:text-orange-600"
                  >
                    {m.name}
                  </Link>
                </Td>
                <Td className="text-xs">{m.status}</Td>
                <Td className="text-xs font-mono">{m.completion_pct}%</Td>
                <Td><RAGBadge rag={m.rag} /></Td>
              </tr>
            ))}
            {milestones.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-8">No milestones linked yet.</td></tr>
            )}
          </tbody>
        </DataTable>
      </SectionCard>

      {risks.length > 0 && (
        <SectionCard title={`Risks (${risks.length})`}>
          <div className="space-y-2">
            {risks.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-medium truncate">{r.description}</div>
                  <div className="text-[11px] text-slate-500">{r.risk_type} · Score {r.risk_score}</div>
                </div>
                <span className="text-xs text-slate-600">{r.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <EntityCollaborationPanel
        entityType="initiative"
        entityId={initiative.id}
        entityLabel={initiative.code}
        author="Department Secretary"
      />
    </div>
  );
}

function Breadcrumb({ themeId, themeName, current }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
      <Link to="/themes" className="inline-flex items-center gap-1 hover:text-orange-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Themes
      </Link>
      {themeId && (
        <>
          <span>/</span>
          <Link to={`/themes/${themeId}`} className="hover:text-orange-600">{themeName}</Link>
        </>
      )}
      <span>/</span>
      <span className="text-slate-700 font-medium">{current}</span>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
      <div className="text-xl font-bold mt-1 truncate" style={{ fontFamily: "Manrope", color: accent || "#0F172A" }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </>
  );
}

function DrillRow({ to, label, count, testId }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50 card-hover"
    >
      <span className="font-medium text-slate-800">{label}</span>
      <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold">
        {count != null ? `${count} · ` : ""}Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
