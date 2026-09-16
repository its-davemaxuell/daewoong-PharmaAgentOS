"""Capture real chatbot responses in a fresh private test session, without publishing them."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = [
    ("greeting", "Hello, what can you do?"),
    ("general", "What is an FDA Drug warning letter?"),
    ("count-2025", "How many FDA warning letters were issued in 2025?"),
    ("count-posted", "How many FDA warning letters were posted in August 2026?"),
    ("latest-issued", "Show the five most recently issued FDA warning letters with their issue dates."),
    ("oldest", "Which is the oldest FDA warning letter in the saved library?"),
    ("company-date", "When was the Bausch & Lomb Inc. warning letter issued and posted?"),
    ("country", "How many FDA warning letters were sent to companies in India in 2025?"),
    ("group-year", "Count the saved FDA warning letters by issue year."),
    ("range-ko", "2025년 1월부터 3월까지 발행된 FDA 경고서한은 몇 건인가요?"),
    ("relative", "Which FDA warning letters were issued last month?"),
    ("no-match", "How many FDA warning letters were issued in 2099?"),
    ("mixed", "Find FDA data integrity findings in letters issued in 2025, with citations."),
    ("content", "Give two specific quality-unit oversight findings from FDA warning letters, citing each company."),
    ("content-count", "How many FDA warning letters mention contamination?"),
    ("unrelated", "What is the weather in Seoul today?"),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://pharmaagent-os-ochre.vercel.app")
    parser.add_argument("--output", default=".artifacts/chat-metadata/before")
    parser.add_argument("--only", nargs="*")
    parser.add_argument("--catalog-only", action="store_true")
    args = parser.parse_args()
    out = (ROOT / args.output).resolve()
    out.relative_to(ROOT)
    out.mkdir(parents=True, exist_ok=True)
    with httpx.Client(base_url=args.base, timeout=180, follow_redirects=True) as client:
        client.get("/api/research").raise_for_status()
        catalog = client.get("/api/drug-letters?pageSize=100")
        if catalog.is_success:
            (out / "catalog-page.json").write_text(catalog.text, encoding="utf-8")
        if args.catalog_only:
            first = catalog.json()["data"]
            items = list(first["items"])
            for page in range(2, (first["total"] + 99) // 100 + 1):
                response = client.get(f"/api/drug-letters?pageSize=100&page={page}")
                response.raise_for_status()
                items.extend(response.json()["data"]["items"])
            (out / "catalog.json").write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
            coverage = {"letters": len(items), "missing_issue_dates": sum(not x["issueDate"] for x in items),
                        "missing_posted_dates": sum(not x["postedDate"] for x in items)}
            (out / "coverage.json").write_text(json.dumps(coverage, indent=2), encoding="utf-8")
            print(json.dumps(coverage), flush=True)
            return
        for slug, question in QUESTIONS:
            if args.only and slug not in args.only:
                continue
            target = out / f"{slug}.json"
            if target.exists():
                continue
            start = time.monotonic()
            response = client.post("/api/chat/query", headers={"Origin": args.base}, json={
                "question": question, "language": "auto", "filters": {}, "maxSources": 6,
                "options": {"retrievalMode": "auto", "modelProfile": "auto"},
            })
            record = {"question": question, "status": response.status_code,
                      "elapsed_seconds": round(time.monotonic() - start, 2),
                      "response": response.json()}
            target.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"{slug}: {response.status_code}, {record['elapsed_seconds']}s", flush=True)


if __name__ == "__main__":
    main()
