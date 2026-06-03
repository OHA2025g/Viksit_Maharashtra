import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useI18n } from "@/contexts/I18nContext";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main-content" className="skip-link">
        {t("a11y.skipToMain")}
      </a>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main id="main-content" tabIndex={-1} data-testid="app-main" className="p-4 sm:p-6 lg:p-8 fade-up outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
