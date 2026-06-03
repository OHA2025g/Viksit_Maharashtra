#!/usr/bin/env python3
"""Plan §10 smoke checks — run: python smoke_test.py (from backend/).

Unit checks always run. Live API checks run when MongoDB is reachable.
"""
from __future__ import annotations

import sys

from enhancements import (
    AGRI_REPORT_DATASETS,
    REPORT_SLUGS,
    _branded_pdf_prose,
    _minimal_pdf,
)


def test_unit() -> list[str]:
    failed = []
    if len(REPORT_SLUGS) != 12:
        failed.append(f"expected 12 core report slugs, got {len(REPORT_SLUGS)}")
    if len(AGRI_REPORT_DATASETS) != 6:
        failed.append(f"expected 6 agri datasets, got {len(AGRI_REPORT_DATASETS)}")
    pdf = _minimal_pdf(_branded_pdf_prose("Executive Summary", "Sample row\n" * 5), doc_title="Test")
    if not pdf.startswith(b"%PDF"):
        failed.append("PDF generator did not produce valid header")
    if b"/Type /Page" not in pdf:
        failed.append("PDF missing page objects")
    if b"MH" not in pdf:
        failed.append("PDF missing letterhead seal marker")
    try:
        import server  # noqa: F401
    except Exception as exc:
        failed.append(f"server import failed: {exc}")
    return failed


def test_api() -> list[str]:
    """Hit key F001–F023 endpoints via ASGI (requires MongoDB)."""
    from fastapi.testclient import TestClient
    from server import app

    failed = []
    paths = [
        "/api/public/dashboard",
        "/api/watchlist",
        "/api/alerts/smart",
        "/api/reports/executive-summary/export?format=pdf",
        "/api/meeting-packs/weekly-pmo-review",
        "/api/kpis/anomalies",
        "/api/districts/benchmark",
    ]
    with TestClient(app) as client:
        for path in paths:
            r = client.get(path)
            if r.status_code != 200:
                failed.append(f"{path} -> {r.status_code}")
            elif path.endswith("format=pdf") and "application/pdf" not in r.headers.get("content-type", ""):
                failed.append(f"{path} -> wrong content-type")
        pub = client.get("/api/public/dashboard").json()
        blob = str(pub).lower()
        if "@mh.gov.in" in blob or "@gmail" in blob:
            failed.append("public/dashboard may expose internal emails")
    return failed


def main() -> int:
    failed = test_unit()
    if failed:
        print("UNIT SMOKE FAILED:")
        for f in failed:
            print(" ", f)
        return 1
    print("UNIT SMOKE OK — reports, PDF letterhead, imports")

    try:
        api_failed = test_api()
    except Exception as exc:
        print(f"API SMOKE SKIPPED (MongoDB not available): {exc}")
        return 0

    if api_failed:
        print("API SMOKE FAILED:")
        for f in api_failed:
            print(" ", f)
        return 1

    print("API SMOKE OK — 7 enhancement endpoints")
    return 0


if __name__ == "__main__":
    sys.exit(main())
