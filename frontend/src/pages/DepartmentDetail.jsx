import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, formatCrore } from "@/lib/api";
import { SectionCard } from "@/components/PageHeader";
import { DataTable, THead, Th, Td } from "@/components/DataTable";
import { RAGBadge } from "@/components/RAGBadge";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Flag,
  Mail,
  Target,
  Users,
  Wallet,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const RAG_GRADIENT = {
  green: "from-emerald-600 to-emerald-800",
  amber: "from-amber-500 to-orange-600",
  red: "from-red-600 to-red-800",
  blue: "from-blue-600 to-blue-800",
  grey: "from-slate-600 to-slate-800",
};

export default function DepartmentDetail() {
  const { departmentId } = useParams();
  const { t } = useI18n();
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/departments/${departmentId}`)
      .then(({ data }) => {
        if (active) setDept(data);
      })
      .catch((err) => {
        if (active && err.response?.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [departmentId]);

  if (loading) return <div className="text-slate-500 text-sm">{t("dept.loading")}</div>;
  if (notFound) return <Navigate to="/departments" replace />;

  const gradient = RAG_GRADIENT[dept.rag] || RAG_GRADIENT.grey;
  const utilPct = dept.budget_utilization_pct ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/departments" className="inline-flex items-center gap-1 hover:text-orange-600">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("nav.departments")}
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{dept.name}</span>
      </div>

      <div className={`rounded-2xl bg-gradient-to-br ${gradient} text-white p-6 md:p-8 shadow-lg`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-bold">
              {t("dept.detail.eyebrow")}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ fontFamily: "Manrope" }}>
              {dept.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/90">
              <span>{dept.head}</span>
              {dept.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {dept.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/70">{t("table.progress")}</div>
              <div className="text-4xl font-bold" style={{ fontFamily: "Manrope" }}>
                {dept.completion_pct}%
              </div>
            </div>
            <RAGBadge rag={dept.rag} />
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white/90 rounded-full" style={{ width: `${dept.completion_pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Target} label={t("dept.initiatives")} value={dept.initiatives_count} />
        <StatCard icon={Flag} label={t("dept.milestones")} value={dept.milestones_count} />
        <StatCard
          icon={AlertTriangle}
          label={t("dept.delayed")}
          value={dept.delayed_milestones_count}
          warn={dept.delayed_milestones_count > 5}
        />
        <StatCard icon={BarChart3} label={t("dept.detail.kpis")} value={dept.kpi_count} sub={`${dept.kpi_green} green`} />
        <StatCard icon={Wallet} label={t("dept.detail.budgetUsed")} value={`${utilPct}%`} sub={formatCrore(dept.budget_utilized)} />
        <StatCard icon={Users} label={t("dept.detail.themes")} value={dept.themes_count} />
      </div>

      {dept.officer && (
        <Link
          to={`/officers/${dept.officer.id}`}
          className="block rounded-xl border border-orange-200 bg-orange-50/60 p-4 card-hover"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-orange-800 font-bold">
                {t("dept.detail.accountableOfficer")}
              </div>
              <div className="font-semibold text-slate-900 mt-1">{dept.officer.name}</div>
              <div className="text-xs text-slate-600">{dept.officer.role_title}</div>
            </div>
            <ArrowRight className="h-5 w-5 text-orange-600" />
          </div>
        </Link>
      )}

      <SectionCard title={t("dept.detail.quickLinks")}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink to={`/initiatives?department_id=${departmentId}`} label={t("dept.detail.linkInitiatives")} count={dept.initiatives_count} />
          <QuickLink to={`/milestones?department_id=${departmentId}`} label={t("dept.detail.linkMilestones")} count={dept.milestones_count} />
          <QuickLink to={`/kpis?department_id=${departmentId}`} label={t("dept.detail.linkKpis")} count={dept.kpi_count} />
          <QuickLink to="/risks" label={t("dept.detail.linkRisks")} count={dept.open_risks_count} />
          <QuickLink to="/budget" label={t("dept.detail.linkBudget")} />
          <QuickLink to="/intelligence" label={t("dept.detail.linkIntel")} />
        </div>
      </SectionCard>

      {dept.themes?.length > 0 && (
        <SectionCard title={t("dept.detail.themesOwned")}>
          <div className="flex flex-wrap gap-2">
            {dept.themes.map((theme) => (
              <Link
                key={theme.id}
                to={`/themes/${theme.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:border-orange-200 hover:bg-orange-50 card-hover"
              >
                {theme.name}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title={t("dept.detail.initiativesSection")}>
        {dept.initiatives?.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {dept.initiatives.map((init) => (
              <Link
                key={init.id}
                to={`/initiatives/${init.id}`}
                className="flex items-center justify-between border rounded-xl px-4 py-3 text-sm hover:bg-slate-50 hover:border-orange-200 card-hover group"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-mono text-xs text-slate-500">{init.code}</div>
                  <div className="font-medium truncate group-hover:text-orange-700">{init.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{init.completion_pct ?? 0}% · {formatCrore(init.budget_utilized)}</div>
                </div>
                <RAGBadge rag={init.rag} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty text={t("dept.detail.emptyInitiatives")} />
        )}
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title={t("dept.detail.milestonesSection")} subtitle={t("dept.detail.delayedFirst")}>
          <EntityTable
            rows={dept.milestones}
            empty={t("dept.detail.emptyMilestones")}
            link={() => `/milestones?department_id=${departmentId}`}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "name", render: (r) => r.name?.slice(0, 40) },
              { key: "rag", render: (r) => <RAGBadge rag={r.rag} /> },
              { key: "completion_pct", render: (r) => `${r.completion_pct ?? 0}%` },
            ]}
          />
        </SectionCard>

        <SectionCard title={t("dept.detail.kpiSection")}>
          <EntityTable
            rows={dept.kpis}
            empty={t("dept.detail.emptyKpis")}
            link={() => `/kpis?department_id=${departmentId}`}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "name", render: (r) => r.name?.slice(0, 35) },
              { key: "health", render: (r) => <RAGBadge rag={r.health} /> },
              { key: "current_value", label: t("dept.detail.current") },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title={t("dept.detail.risksSection")}>
          <EntityTable
            rows={dept.risks}
            empty={t("dept.detail.emptyRisks")}
            link={(r) => `/intelligence?risk=${r.id}`}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "risk_type", label: t("officer.riskType") },
              { key: "risk_score", label: t("officer.score") },
            ]}
          />
        </SectionCard>

        <SectionCard title={t("dept.detail.actionsSection")}>
          <EntityTable
            rows={dept.action_items}
            empty={t("dept.detail.emptyActions")}
            columns={[
              { key: "code", label: t("table.code") },
              { key: "title", render: (r) => r.title?.slice(0, 40) },
              { key: "status", label: t("evidence.status") },
            ]}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, warn }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
        <Icon className={`h-4 w-4 ${warn ? "text-red-500" : "text-slate-400"}`} />
      </div>
      <div className={`text-2xl font-bold ${warn ? "text-red-700" : "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function QuickLink({ to, label, count }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 text-sm font-medium border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-xl px-4 py-3 card-hover"
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
  if (!rows?.length) return <Empty text={empty} />;
  return (
    <DataTable>
      <THead>
        <tr>
          {columns.map((c) => (
            <Th key={c.key}>{c.label || c.key}</Th>
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

function Empty({ text }) {
  return <p className="text-sm text-slate-500 py-4">{text}</p>;
}
