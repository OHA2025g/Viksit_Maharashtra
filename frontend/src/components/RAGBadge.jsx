import React from "react";
import { RAG_COLORS } from "@/lib/api";

export function RAGBadge({ rag, label, showLabel = true, testId, i18nLabel }) {
  const c = RAG_COLORS[rag] || RAG_COLORS.grey;
  const text = label || c.label;
  const aria = i18nLabel || text;
  return (
    <span
      data-testid={testId || `rag-badge-${rag}`}
      role="status"
      aria-label={`Status: ${aria}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.solid }} aria-hidden="true" />
      {showLabel !== false ? text : null}
    </span>
  );
}

export function RAGDot({ rag, label }) {
  const c = RAG_COLORS[rag] || RAG_COLORS.grey;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: c.solid }}
      role="img"
      aria-label={label || c.label}
    />
  );
}
