import React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

export function TableCaption({ children, visuallyHidden = true, className }) {
  return (
    <caption className={cn(visuallyHidden ? "sr-only" : "text-left text-sm text-slate-600 mb-2", className)}>
      {children}
    </caption>
  );
}

export function Th({ children, scope = "col", className }) {
  return (
    <th scope={scope} className={cn("px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", className)}>
      {children}
    </th>
  );
}

export function ThKey({ labelKey, children, ...props }) {
  const { t } = useI18n();
  return <Th {...props}>{labelKey ? t(labelKey) : children}</Th>;
}

export function Td({ children, className = "", ...props }) {
  return (
    <td className={cn("px-3 py-2.5", className)} {...props}>
      {children}
    </td>
  );
}

export function THead({ children, className }) {
  return <thead className={cn("bg-slate-50 text-left", className)}>{children}</thead>;
}

export function DataTable({ caption, captionKey, children, className }) {
  const { t } = useI18n();
  const captionText = captionKey ? t(captionKey) : caption;

  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>
        {captionText && <TableCaption>{captionText}</TableCaption>}
        {children}
      </table>
    </div>
  );
}
