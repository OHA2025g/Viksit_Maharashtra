import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AppContext = createContext(null);

export const ROLES = [
  { code: "CM", name: "Chief Minister / Deputy CM", email: "cm@mh.gov.in" },
  { code: "ChiefSecretary", name: "Chief Secretary", email: "cs@mh.gov.in" },
  { code: "VMUHead", name: "VMU Head", email: "vmu@mh.gov.in" },
  { code: "DepartmentSecretary", name: "Department Secretary", email: "secy.industries@mh.gov.in" },
  { code: "DistrictCollector", name: "District Collector", email: "collector.pune@mh.gov.in" },
  { code: "NodalOfficer", name: "Nodal Officer", email: "nodal@mh.gov.in" },
  { code: "PMOAnalyst", name: "PMO Analyst", email: "pmo@mh.gov.in" },
  { code: "FinanceOfficer", name: "Finance Officer", email: "finance@mh.gov.in" },
  { code: "Public", name: "Public User", email: "public@mh.gov.in" },
];

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vm2047_user") || "null");
    } catch { return null; }
  });
  const [period, setPeriod] = useState("Q4 FY 2025-26");

  const login = async (email, password = "demo123") => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("vm2047_token", data.token);
    localStorage.setItem("vm2047_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const switchRole = async (roleCode) => {
    const r = ROLES.find((x) => x.code === roleCode);
    if (!r) return;
    await login(r.email);
  };

  const logout = () => {
    localStorage.removeItem("vm2047_token");
    localStorage.removeItem("vm2047_user");
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, login, switchRole, logout, period, setPeriod }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
