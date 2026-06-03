export const HEALTH_STYLES = {
  green: {
    ring: "ring-emerald-200",
    bg: "bg-emerald-500",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    text: "text-emerald-700",
    gradient: "from-emerald-600 to-emerald-800",
  },
  amber: {
    ring: "ring-amber-200",
    bg: "bg-amber-500",
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-700",
    gradient: "from-amber-500 to-orange-600",
  },
  red: {
    ring: "ring-red-200",
    bg: "bg-red-500",
    bar: "bg-red-500",
    chip: "bg-red-50 text-red-800 border-red-200",
    text: "text-red-700",
    gradient: "from-red-600 to-red-800",
  },
};

export function officerHealth(o) {
  const pressure =
    (o.overdue_actions || 0) * 3 +
    (o.open_risks || 0) * 2 +
    (o.evidence_pending || 0) * 2 +
    Math.min(o.avg_delay_days || 0, 40) * 0.4;
  if (pressure < 4) {
    return { level: "green", labelKey: "officer.health.onTrack", pct: Math.max(72, 100 - pressure * 3) };
  }
  if (pressure < 12) {
    return { level: "amber", labelKey: "officer.health.watch", pct: Math.max(40, 72 - pressure * 2) };
  }
  return { level: "red", labelKey: "officer.health.attention", pct: Math.max(12, 40 - pressure) };
}

export function officerInitials(name) {
  return (name || "?")
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
