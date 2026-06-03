import React, { useId } from "react";
import { useI18n } from "@/contexts/I18nContext";

export function PageHeader({ title, subtitle, actions, eyebrow, titleKey, subtitleKey, eyebrowKey }) {
  const { t } = useI18n();
  const displayTitle = titleKey ? t(titleKey) : title;
  const displaySubtitle = subtitleKey ? t(subtitleKey) : subtitle;
  const displayEyebrow = eyebrowKey ? t(eyebrowKey) : eyebrow;

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        {displayEyebrow && (
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-2">{displayEyebrow}</div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "Manrope" }}>
          {displayTitle}
        </h1>
        {displaySubtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{displaySubtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, titleKey, action, children, className = "", chartSummary }) {
  const { t } = useI18n();
  const titleId = useId();
  const displayTitle = titleKey ? t(titleKey) : title;

  return (
    <section
      className={`bg-white border border-slate-200 rounded-lg p-6 ${className}`}
      aria-labelledby={displayTitle ? titleId : undefined}
      role="region"
    >
      {(displayTitle || action) && (
        <div className="flex items-center justify-between mb-4">
          {displayTitle && (
            <h3 id={titleId} className="text-base font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>
              {displayTitle}
            </h3>
          )}
          {action}
        </div>
      )}
      {chartSummary && (
        <p className="sr-only">{chartSummary}</p>
      )}
      {children}
    </section>
  );
}

/** Wrap chart content for screen readers */
export function ChartRegion({ label, labelKey, children, className = "" }) {
  const { t } = useI18n();
  const summary = labelKey ? t(labelKey) : (label || t("a11y.chartSummary"));
  return (
    <div role="img" aria-label={summary} className={className}>
      <p className="sr-only">{summary}</p>
      {children}
    </div>
  );
}
