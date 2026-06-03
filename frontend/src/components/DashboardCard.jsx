import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RAGBadge } from "@/components/RAGBadge";

export function DashboardCard({ title, value, unit, trend, rag, explanation, drilldownTo, testId, accent = "navy" }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-slate-500";

  return (
    <div
      data-testid={testId}
      className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col gap-3 card-hover"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</h4>
        {rag && <RAGBadge rag={rag} />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
          {value}
        </span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
      {explanation && <p className="text-xs text-slate-500 leading-relaxed">{explanation}</p>}
      {drilldownTo && (
        <Link
          to={drilldownTo}
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-orange-600 transition-colors"
          data-testid={`${testId}-drilldown`}
        >
          View details <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
