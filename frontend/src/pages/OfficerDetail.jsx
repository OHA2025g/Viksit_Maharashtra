import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  FileWarning,
  Flag,
  Mail,
  Target,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { HEALTH_STYLES, officerHealth, officerInitials } from "@/lib/officerMetrics";

export default function OfficerDetail() {
  const { officerId } = useParams();
  const { t } = useI18n();
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    api.get(`/officers/${officerId}`)
      .then(({ data }) => {
        if (!active) return;
        setOfficer(data);
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
  }, [officerId]);

  if (loading) return <div className="text-slate-500 text-sm">{t("officer.loading")}</div>;
  if (notFound) return <Navigate to="/officers" replace />;

  const deptId = officer.department_id;
  const health = officerHealth(officer);
  const style = HEALTH_STYLES[health.level];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/officers" className="inline-flex items-center gap-1 hover:text-orange-600">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("nav.officers")}
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{officer.name}</span>
      </div>

      {/* Profile hero */}
      <div className={`rounded-2xl bg-gradient-to-br ${style.gradient} text-white p-6 md:p-8 shadow-lg`}>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold shrink-0 border border-white/30">
            {officerInitials(officer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-bold">
              {officer.role_title || t("page.officers.eyebrow")}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ fontFamily: "Manrope" }}>
              {officer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/90">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {officer.department_name}
              </span>
              {officer.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {officer.email}
                </span>
              )}
            </div>
          </div>
          <div className="md:text-right shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
              {t("officer.accountabilityScore")}
            </div>
            <div className="text-4xl font-bold" style={{ fontFamily: "Manrope" }}>
              {health.pct}%
            </div>
            <span className="inline-flex mt-2 text-xs font-bold uppercase px-3 py-1 rounded-full bg-white/20 border border-white/30">
              {t(health.labelKey)}
            </span>
          </div>
        </div>
        <div className="mt-6 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${health.pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 -mt-2">
        <StatCard icon={Target} label={t("officer.stat.milestones")} value={officer.milestones_owned} />
        <StatCard
          icon={Flag}
          label={t("officer.stat.overdue")}
          value={officer.overdue_actions}
          warn={officer.overdue_actions > 0}
        />
        <StatCard icon={FileWarning} label={t("officer.stat.risks")} value={officer.open_risks} warn={officer.open_risks > 2} />
        <StatCard icon={FileWarning} label={t("officer.stat.evidence")} value={officer.evidence_pending} warn={officer.evidence_pending > 0} />
        <StatCard icon={Clock} label={t("officer.stat.avgDelay")} value={`${officer.avg_delay_days}d`} warn={officer.avg_delay_days > 10} />
        <StatCard icon={Building2} label={t("officer.stat.themes")} value={officer.themes_owned} />
      </div>

      <SectionCard title={t("officer.quickLinks")}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink to={`/milestones?department_id=${deptId}`} label={t("officer.link.milestones")} count={officer.milestones_owned} />
          <QuickLink to={`/initiatives?department_id=${deptId}`} label={t("officer.link.initiatives")} count={officer.initiatives?.length} />
          <QuickLink to="/risks" label={t("officer.link.risks")} count={officer.open_risks} />
          <QuickLink to="/evidence" label={t("officer.link.evidence")} count={officer.evidence_pending} />
          <QuickLink to="/departments" label={t("officer.link.departments")} />
        </div>
      </SectionCard>

      <SectionCard title={t("officer.milestonesSection")} subtitle={t("officer.departmentScope")}>
        <EntityTable
          empty={t("officer.empty.milestones")}
          rows={officer.milestones}
          columns={[
            { key: "code", label: t("table.code") },
            { key: "name", label: t("table.name"), render: (r) => r.name?.slice(0, 48) },
            { key: "status", label: t("evidence.status") },
            { key: "rag", label: t("table.rag"), render: (r) => <RAGBadge rag={r.rag} /> },
            { key: "completion_pct", label: "%", render: (r) => `${r.completion_pct ?? 0}%` },
          ]}
          link={() => `/milestones?department_id=${deptId}`}
        />
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title={t("officer.risksSection")}>
          <EntityTable
            empty={t("officer.empty.risks")}
            rows={officer.risks}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "risk_type", label: t("officer.riskType") },
              { key: "status", label: t("evidence.status") },
              { key: "risk_score", label: t("officer.score") },
            ]}
            link={(r) => `/risks?initiative_id=${r.initiative_id}`}
          />
        </SectionCard>

        <SectionCard title={t("officer.evidenceSection")}>
          <EntityTable
            empty={t("officer.empty.evidence")}
            rows={officer.evidence}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "evidence_type", label: t("officer.evidenceType") },
              { key: "verification_status", label: t("officer.verification") },
            ]}
            link={() => "/evidence"}
          />
        </SectionCard>
      </div>

      <SectionCard title={t("officer.actionsSection")}>
        <EntityTable
          empty={t("officer.empty.actions")}
          rows={officer.action_items}
          columns={[
            { key: "code", label: t("table.code") },
            { key: "title", label: t("table.name"), render: (r) => r.title?.slice(0, 50) },
            { key: "status", label: t("evidence.status") },
            { key: "due_date", label: t("officer.dueDate") },
          ]}
          link={() => `/milestones?department_id=${deptId}`}
        />
      </SectionCard>

      {officer.initiatives?.length > 0 && (
        <SectionCard title={t("officer.initiativesSection")}>
          <div className="grid md:grid-cols-2 gap-3">
            {officer.initiatives.map((init) => (
              <Link
                key={init.id}
                to={`/initiatives/${init.id}`}
                className="flex items-center justify-between border rounded-xl px-4 py-3 text-sm hover:bg-slate-50 hover:border-orange-200 card-hover group"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-mono text-xs text-slate-500">{init.code}</div>
                  <div className="font-medium truncate group-hover:text-orange-700">{init.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{init.completion_pct ?? 0}% complete</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RAGBadge rag={init.rag} />
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, warn }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
        <Icon className={`h-4 w-4 ${warn ? "text-red-500" : "text-slate-400"}`} />
      </div>
      <div className={`text-2xl font-bold ${warn ? "text-red-700" : "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
    </div>
  );
}

function QuickLink({ to, label, count }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 text-sm font-medium text-slate-800 border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 rounded-xl px-4 py-3 card-hover transition-colors"
    >
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 text-orange-600">
        {count != null && <span className="text-xs font-bold bg-orange-100 px-2 py-0.5 rounded-full">{count}</span>}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function EntityTable({ rows, columns, empty, link }) {
  if (!rows?.length) {
    return <p className="text-sm text-slate-500 py-4">{empty}</p>;
  }
  return (
    <DataTable>
      <THead>
        <tr>
          {columns.map((c) => (
            <Th key={c.key}>{c.label}</Th>
          ))}
          {link && <Th className="w-16" />}
        </tr>
      </THead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
            {columns.map((c, idx) => (
              <Td key={c.key} className={idx === 0 ? "font-mono text-xs" : ""}>
                {c.render ? c.render(row) : row[c.key]}
              </Td>
            ))}
            {link && (
              <Td>
                <Link to={link(row)} className="text-xs font-medium text-orange-600 hover:underline">
                  View
                </Link>
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
