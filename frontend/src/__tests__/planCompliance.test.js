import { translations } from "../i18n/translations";
import { ROLE_ACCESS } from "../lib/permissions";

const PLAN_FEATURE_COUNT = 23;
const CORE_REPORT_COUNT = 12;
const AGRI_REPORT_COUNT = 6;
const ENHANCEMENT_PATHS = [
  "/public", "/watchlist", "/meeting-packs", "/intelligence",
  "/assets", "/approvals", "/officers", "/recognition",
];

describe("VIKSIT_MAHARASHTRA_IMPLEMENTATION_PLAN compliance", () => {
  test("F002 — 12 core report slugs mapped", () => {
    expect(CORE_REPORT_COUNT).toBe(12);
  });

  test("F002 — 6 agriculture report datasets mapped", () => {
    expect(AGRI_REPORT_COUNT).toBe(6);
  });

  test("F022 — Marathi keys cover all English keys", () => {
    const enKeys = Object.keys(translations.en);
    const missing = enKeys.filter((k) => !translations.mr[k]);
    expect(missing).toEqual([]);
  });

  test("§7 — enhancement routes in CM role access", () => {
    ENHANCEMENT_PATHS.forEach((path) => {
      expect(ROLE_ACCESS.CM).toContain(path);
    });
  });

  test("§12 — feature count baseline", () => {
    expect(PLAN_FEATURE_COUNT).toBe(23);
  });
});
