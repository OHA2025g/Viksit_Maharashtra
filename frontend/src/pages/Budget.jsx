import React, { useEffect, useState } from "react";
import { api, formatCrore } from "@/lib/api";
import { PageHeader, SectionCard, ChartRegion } from "@/components/PageHeader";
import { DataTable, THead, ThKey, Td } from "@/components/DataTable";
import { useI18n } from "@/contexts/I18nContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

export default function Budget() {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState([]);
  const [themes, setThemes] = useState([]);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    api.get("/budgets").then(({ data }) => setBudgets(data));
    api.get("/themes").then(({ data }) => setThemes(data));
    api.get("/budget/forecast").then(({ data }) => setForecast(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const totals = budgets.reduce((acc, b) => ({
    total: acc.total + b.total_budget_required,
    alloc: acc.alloc + b.budget_allocated,
    util: acc.util + b.budget_utilized,
    priv: acc.priv + b.private_investment_committed,
    csr: acc.csr + b.csr_philanthropy,
    multi: acc.multi + b.multilateral_funding,
    asset: acc.asset + b.asset_monetization_value,
  }), { total: 0, alloc: 0, util: 0, priv: 0, csr: 0, multi: 0, asset: 0 });

  const themeMap = Object.fromEntries(themes.map((t) => [t.id, t]));
  const themeBudgets = themes.map((t) => {
    const bs = budgets.filter((b) => b.theme_id === t.id);
    return {
      name: t.name,
      allocated: bs.reduce((s, b) => s + b.budget_allocated, 0),
      utilized: bs.reduce((s, b) => s + b.budget_utilized, 0),
    };
  }).filter((t) => t.allocated > 0);

  const funding = [
    { name: "State Budget", value: totals.alloc, fill: "#0F172A" },
    { name: "Private", value: totals.priv, fill: "#F97316" },
    { name: "Multilateral", value: totals.multi, fill: "#2563EB" },
    { name: "CSR", value: totals.csr, fill: "#16A34A" },
    { name: "Asset Monetization", value: totals.asset, fill: "#A855F7" },
  ].filter((f) => f.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrowKey="page.budget.eyebrow" titleKey="page.budget.title" subtitleKey="page.budget.subtitle" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat labelKey="stat.totalRequired" value={formatCrore(totals.total)} t={t} />
        <Stat labelKey="stat.allocated" value={formatCrore(totals.alloc)} t={t} />
        <Stat labelKey="stat.utilized" value={formatCrore(totals.util)} accent="#F97316" t={t} />
        <Stat labelKey="stat.privateInvestment" value={formatCrore(totals.priv)} accent="#16A34A" t={t} />
      </div>

      {forecast.length > 0 && (
        <SectionCard title="Budget Burn-Rate Forecast & Warnings">
          <DataTable captionKey="table.caption.budgetForecast">
            <THead>
              <tr>
                <ThKey labelKey="table.code" />
                <ThKey labelKey="table.utilPct" />
                <ThKey labelKey="table.monthlyBurn" />
                <ThKey labelKey="table.projectedYe" />
                <ThKey labelKey="table.projUtilPct" />
                <ThKey labelKey="table.warnings" />
              </tr>
            </THead>
            <tbody>
              {forecast.slice(0, 12).map((f) => (
                <tr key={f.id || f.code} className="border-b border-slate-100">
                  <Td className="font-mono text-xs">{f.code}</Td>
                  <Td>{f.utilization_pct}%</Td>
                  <Td>{formatCrore(f.monthly_burn_rate)}</Td>
                  <Td>{formatCrore(f.projected_year_end_utilization)}</Td>
                  <Td className={f.projected_utilization_pct < 70 ? "text-amber-600 font-semibold" : ""}>{f.projected_utilization_pct}%</Td>
                  <Td className="text-xs text-red-600">{(f.warnings || []).join("; ") || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Funding Mix" className="lg:col-span-1">
          <ChartRegion labelKey="chart.fundingMix">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={funding} dataKey="value" innerRadius={55} outerRadius={95}>
                  {funding.map((f) => <Cell key={f.name} fill={f.fill} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>

        <SectionCard title="Theme-wise Budget (Allocated vs Utilized)" className="lg:col-span-2">
          <ChartRegion labelKey="chart.themeBudget">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={themeBudgets} margin={{ bottom: 50, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} angle={-30} textAnchor="end" interval={0} height={80} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="allocated" fill="#0F172A" name="Allocated (₹ Cr)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utilized" fill="#F97316" name="Utilized (₹ Cr)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartRegion>
        </SectionCard>
      </div>

      <SectionCard title="Budget Register">
        <DataTable captionKey="table.caption.budgetRegister">
          <THead>
            <tr>
              <ThKey labelKey="table.code" />
              <ThKey labelKey="table.theme" />
              <ThKey labelKey="table.required" />
              <ThKey labelKey="stat.allocated" />
              <ThKey labelKey="stat.utilized" />
              <ThKey labelKey="table.fundingGap" />
              <ThKey labelKey="table.private" />
              <ThKey labelKey="table.ppp" />
              <ThKey labelKey="table.closure" />
            </tr>
          </THead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} data-testid={`bud-row-${b.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                <Td className="font-mono text-xs">{b.code}</Td>
                <Td className="text-xs">{themeMap[b.theme_id]?.name?.slice(0, 30)}</Td>
                <Td className="font-mono text-xs">{formatCrore(b.total_budget_required)}</Td>
                <Td className="font-mono text-xs">{formatCrore(b.budget_allocated)}</Td>
                <Td className="font-mono text-xs text-orange-600 font-semibold">{formatCrore(b.budget_utilized)}</Td>
                <Td className="font-mono text-xs text-red-600">{formatCrore(b.funding_gap)}</Td>
                <Td className="font-mono text-xs text-green-600">{formatCrore(b.private_investment_committed)}</Td>
                <Td className="text-xs">{b.ppp_potential}</Td>
                <Td className="text-xs">{b.financial_closure_status}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>
    </div>
  );
}

function Stat({ labelKey, value, accent, t }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t(labelKey)}</div>
      <div className="text-3xl font-bold mt-2" style={{ fontFamily: "Manrope", color: accent || "#0F172A" }}>{value}</div>
    </div>
  );
}
