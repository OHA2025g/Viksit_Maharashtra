import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { I18nProvider } from "@/contexts/I18nContext";
import { A11yProvider } from "@/contexts/A11yContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <A11yProvider>
          <App />
        </A11yProvider>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
