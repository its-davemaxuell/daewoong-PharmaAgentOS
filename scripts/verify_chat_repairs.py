"""Check actual responses against independent read-only database/catalog results."""

import argparse
import calendar
import json
import re
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", default=".artifacts/chat-repairs/after")
args = parser.parse_args()
folder = (ROOT / args.output).resolve()
folder.relative_to(ROOT)
independent = json.loads(
    (ROOT / ".artifacts/chat-repairs/independent-counts.json").read_text(
        encoding="utf-8"
    )
)
rows = independent["catalog"]
today = datetime.now(UTC).date()
serial = today.year * 12 + today.month - 4
month_start = date(
    serial // 12,
    serial % 12 + 1,
    min(today.day, calendar.monthrange(serial // 12, serial % 12 + 1)[1]),
)
quarter_end = date(today.year, (today.month - 1) // 3 * 3 + 1, 1) - timedelta(days=1)
quarter_start = date(quarter_end.year, (quarter_end.month - 1) // 3 * 3 + 1, 1)
week_end = today - timedelta(days=today.weekday() + 1)
week_start = week_end - timedelta(days=6)


def in_range(row, first, last):
    return bool(row["issue_date"] and str(first) <= row["issue_date"] <= str(last))


expected = {
    **independent["counts"],
    "mentions-ko": independent["counts"]["quoted"],
    "fiscal": sum(in_range(r, "2024-10-01", "2025-09-30") for r in rows),
    "fiscal-quarter": sum(in_range(r, "2024-10-01", "2024-12-31") for r in rows),
    "countries": sum(
        in_range(r, "2025-01-01", "2025-12-31")
        and (r["country"] or "").lower() in {"india", "china"}
        for r in rows
    ),
    "years": sum((r["issue_date"] or "")[:4] in {"2024", "2026"} for r in rows),
    "months": sum(in_range(r, month_start, today) for r in rows),
    "quarter": sum(in_range(r, quarter_start, quarter_end) for r in rows),
    "week": sum(in_range(r, week_start, week_end) for r in rows),
    "companies": len(
        {
            " ".join(r["company_name"].casefold().split())
            for r in rows
            if in_range(r, "2025-01-01", "2025-12-31")
        }
    ),
}
expected["countries-group"] = expected["countries"]
expected["plain-zero"] = expected["zero-term"]
checks = []
for path in sorted(folder.glob("*.json")):
    if path.stem == "catalog-page":
        continue
    capture = json.loads(path.read_text(encoding="utf-8"))
    result = capture.get("response", {}).get("data", {})
    answer = result.get("answer", "")
    passed = capture["status"] == 200
    if path.stem in expected:
        number = re.search(r"\*\*(\d+)(?:건|개)?(?: saved| distinct|\*\*)", answer)
        actual = int(number[1]) if number else None
        passed &= (
            actual == expected[path.stem]
            and result.get("evidenceSufficiency") == "sufficient"
        )
        checks.append(
            {
                "question": path.stem,
                "expected": expected[path.stem],
                "actual": actual,
                "passed": passed,
            }
        )
    else:
        passed &= result.get(
            "evidenceSufficiency"
        ) == "insufficient" and not result.get("citations")
        checks.append({"question": path.stem, "clarification": True, "passed": passed})
    if path.stem in {"mentions", "quoted", "mentions-ko"}:
        term = "contamination" if path.stem == "mentions" else "data integrity"
        passed = bool(result.get("citations")) and all(
            re.search(
                r"\b" + r"\s+".join(term.split()) + r"\b", c.get("excerpt", ""), re.I
            )
            for c in result["citations"]
        )
        checks.append(
            {
                "question": path.stem,
                "matching_citation_excerpts": True,
                "passed": passed,
            }
        )
    if path.stem in {"countries", "countries-group"}:
        for country in ["India", "China"]:
            total = sum(
                in_range(r, "2025-01-01", "2025-12-31") and r["country"] == country
                for r in rows
            )
            checks.append(
                {
                    "question": path.stem,
                    "group": country,
                    "passed": f"{country}: **{total}**" in answer,
                }
            )
    if path.stem == "years":
        for year in [2024, 2026]:
            total = sum((r["issue_date"] or "").startswith(str(year)) for r in rows)
            checks.append(
                {
                    "question": path.stem,
                    "group": year,
                    "passed": f"{year}-01-01 – {year}-12-31: **{total}**" in answer,
                }
            )
summary = {
    "checks": checks,
    "passed": len(checks) >= 18 and all(c["passed"] for c in checks),
}
(folder.parent / (folder.name + "-verification.json")).write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(summary, ensure_ascii=True))
raise SystemExit(0 if summary["passed"] else 1)
