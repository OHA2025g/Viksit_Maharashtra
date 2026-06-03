import axios from "axios";
import { getApiBase } from "./runtimeConfig";

export const API = getApiBase();

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vm2047_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const RAG_COLORS = {
  green: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", solid: "#16A34A", label: "On Track" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", solid: "#F59E0B", label: "Minor Delay" },
  red: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", solid: "#DC2626", label: "Major Delay" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", solid: "#2563EB", label: "Closed" },
  grey: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", solid: "#64748B", label: "Not Started" },
};

export const PILLAR_COLORS = ["#F97316", "#16A34A", "#2563EB", "#0F172A"];

export function formatCrore(n) {
  if (n == null) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L Cr`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${Number(n).toFixed(0)} Cr`;
}

export function formatNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}
