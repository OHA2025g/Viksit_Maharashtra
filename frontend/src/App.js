import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
import PublicDashboard from "@/pages/PublicDashboard";
import Watchlist from "@/pages/Watchlist";
import MeetingPacks from "@/pages/MeetingPacks";
import IntelligenceHub from "@/pages/IntelligenceHub";
import Assets from "@/pages/Assets";
import Approvals from "@/pages/Approvals";
import Officers from "@/pages/Officers";
import OfficerDetail from "@/pages/OfficerDetail";
import Recognition from "@/pages/Recognition";
import Pillars from "@/pages/Pillars";
import Themes from "@/pages/Themes";
import ThemeDetail from "@/pages/ThemeDetail";
import Initiatives from "@/pages/Initiatives";
import InitiativeDetail from "@/pages/InitiativeDetail";
import Milestones from "@/pages/Milestones";
import KPIs from "@/pages/KPIs";
import KPIDetail from "@/pages/KPIDetail";
import Departments from "@/pages/Departments";
import Districts from "@/pages/Districts";
import Budget from "@/pages/Budget";
import Evidence from "@/pages/Evidence";
import Risks from "@/pages/Risks";
import Reviews from "@/pages/Reviews";
import AICopilot from "@/pages/AICopilot";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AgriOverview from "@/pages/agriculture/AgriOverview";
import AgriImport from "@/pages/agriculture/AgriImport";
import AgriMilestones from "@/pages/agriculture/AgriMilestones";
import AgriTasks from "@/pages/agriculture/AgriTasks";
import AgriDepartments from "@/pages/agriculture/AgriDepartments";
import AgriDependencies from "@/pages/agriculture/AgriDependencies";

function PrivateRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useApp();
  const home = user?.role === "Public" ? "/public" : "/";
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/public" element={<PublicDashboard />} />
      <Route path="/" element={<PrivateRoute><ExecutiveDashboard /></PrivateRoute>} />
      <Route path="/watchlist" element={<PrivateRoute><Watchlist /></PrivateRoute>} />
      <Route path="/meeting-packs" element={<PrivateRoute><MeetingPacks /></PrivateRoute>} />
      <Route path="/intelligence" element={<PrivateRoute><IntelligenceHub /></PrivateRoute>} />
      <Route path="/assets" element={<PrivateRoute><Assets /></PrivateRoute>} />
      <Route path="/approvals" element={<PrivateRoute><Approvals /></PrivateRoute>} />
      <Route path="/officers" element={<PrivateRoute><Officers /></PrivateRoute>} />
      <Route path="/officers/:officerId" element={<PrivateRoute><OfficerDetail /></PrivateRoute>} />
      <Route path="/recognition" element={<PrivateRoute><Recognition /></PrivateRoute>} />
      <Route path="/pillars" element={<PrivateRoute><Pillars /></PrivateRoute>} />
      <Route path="/themes" element={<PrivateRoute><Themes /></PrivateRoute>} />
      <Route path="/themes/:themeId" element={<PrivateRoute><ThemeDetail /></PrivateRoute>} />
      <Route path="/initiatives" element={<PrivateRoute><Initiatives /></PrivateRoute>} />
      <Route path="/initiatives/:initiativeId" element={<PrivateRoute><InitiativeDetail /></PrivateRoute>} />
      <Route path="/milestones" element={<PrivateRoute><Milestones /></PrivateRoute>} />
      <Route path="/kpis" element={<PrivateRoute><KPIs /></PrivateRoute>} />
      <Route path="/kpis/:kpiId" element={<PrivateRoute><KPIDetail /></PrivateRoute>} />
      <Route path="/departments" element={<PrivateRoute><Departments /></PrivateRoute>} />
      <Route path="/districts" element={<PrivateRoute><Districts /></PrivateRoute>} />
      <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
      <Route path="/evidence" element={<PrivateRoute><Evidence /></PrivateRoute>} />
      <Route path="/risks" element={<PrivateRoute><Risks /></PrivateRoute>} />
      <Route path="/reviews" element={<PrivateRoute><Reviews /></PrivateRoute>} />
      <Route path="/copilot" element={<PrivateRoute><AICopilot /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/agriculture" element={<PrivateRoute><AgriOverview /></PrivateRoute>} />
      <Route path="/agriculture/import" element={<PrivateRoute><AgriImport /></PrivateRoute>} />
      <Route path="/agriculture/milestones" element={<PrivateRoute><AgriMilestones /></PrivateRoute>} />
      <Route path="/agriculture/tasks" element={<PrivateRoute><AgriTasks /></PrivateRoute>} />
      <Route path="/agriculture/departments" element={<PrivateRoute><AgriDepartments /></PrivateRoute>} />
      <Route path="/agriculture/dependencies" element={<PrivateRoute><AgriDependencies /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AppProvider>
    </BrowserRouter>
  );
}
