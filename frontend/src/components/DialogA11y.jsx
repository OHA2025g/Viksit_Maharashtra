import React from "react";
import { DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/contexts/I18nContext";

/** Screen-reader description for dialogs without visible helper text */
export function DialogA11yDescription({ children, labelKey }) {
  const { t } = useI18n();
  return (
    <DialogDescription className="sr-only">
      {labelKey ? t(labelKey) : children}
    </DialogDescription>
  );
}
