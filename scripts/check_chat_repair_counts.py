"""Read-only independent production count audit. Read service variables from stdin.

Never prints or saves credentials, connection strings, or document bodies.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[1]


async def main():
    variables = json.loads(sys.stdin.read().lstrip("\ufeff"))
    connection = await asyncpg.connect(
        variables["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://"),
        timeout=30,
        statement_cache_size=0,
    )
    try:
        async with connection.transaction(readonly=True):
            patterns_checked = []
            for term, source, expected in [
                ("contamination", "Contamination was observed.", True),
                ("contamination", "decontamination", False),
                ("data integrity", "DATA\nintegrity", True),
                ("data integrity", "data integrityx", False),
                ("a.*[b]", "Literal a.*[b] text", True),
                ("a.*[b]", "axxxb", False),
            ]:
                pattern = r"(?<!\w)" + r"\s+".join(re.escape(w) for w in term.split()) + r"(?!\w)"
                actual = await connection.fetchval("SELECT $1::text ~* $2::text", source, pattern)
                assert actual == expected
                patterns_checked.append({"term": term, "expected": expected, "actual": actual})
            # Independent SQL aggregation; never calls the chatbot's parser or counting code.
            records = await connection.fetch(
                """
                SELECT DISTINCT w.id, w.company_name, w.issue_date, w.posted_date, w.country
                FROM warning_letters w
                JOIN document_chunks c ON c.warning_letter_id = w.id
                JOIN document_versions v ON v.id = c.document_version_id
                JOIN documents d ON d.id = v.document_id
                WHERE w.current_in_scope AND w.scope_status = 'IN_SCOPE_DRUGS'
                  AND w.current_version_id = v.id AND d.current_version_id = v.id
                  AND d.warning_letter_id = w.id AND d.current_in_scope AND d.source_available
                  AND v.scope_status = 'IN_SCOPE_DRUGS' AND c.corpus_id = 'fda-drugs'
                  AND c.chunker_version = $1
                  AND (c.acl->'roles' IS NULL OR c.acl::jsonb->'roles' = '[]'::jsonb
                       OR c.acl::jsonb->'roles' @> '["viewer"]'::jsonb)
            """,
                variables.get("CHUNKER_VERSION", "structure-v1"),
            )
            counts = {}
            for name, pattern, year in [
                ("mentions", r"\mcontamination\M", None),
                ("mentions-2025", r"\mcontamination\M", 2025),
                ("quoted", r"\mdata\s+integrity\M", 2025),
                ("plain-country-term", r"\mIndia\M", 2025),
                ("zero-term", r"\mPharmaAgentOS nonexistent test phrase\M", None),
            ]:
                ids = [
                    r["id"]
                    for r in records
                    if year is None or (r["issue_date"] and r["issue_date"].year == year)
                ]
                counts[name] = await connection.fetchval(
                    """
                    SELECT count(DISTINCT c.warning_letter_id)
                    FROM document_chunks c JOIN warning_letters w ON w.id = c.warning_letter_id
                    WHERE c.warning_letter_id = ANY($1::text[]) AND c.document_version_id = w.current_version_id
                      AND c.chunker_version = $2 AND c.corpus_id = 'fda-drugs' AND c.content ~* $3
                      AND (c.acl->'roles' IS NULL OR c.acl::jsonb->'roles' = '[]'::jsonb
                           OR c.acl::jsonb->'roles' @> '["viewer"]'::jsonb)
                """,
                    ids,
                    variables.get("CHUNKER_VERSION", "structure-v1"),
                    pattern,
                )
            catalog = [dict(r) for r in records]
            output = {
                "counts": counts,
                "catalog": catalog,
                "postgres_pattern_checks": patterns_checked,
            }
            target = ROOT / ".artifacts/chat-repairs/independent-counts.json"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(output, default=str, indent=2), encoding="utf-8")
            print(json.dumps({"records": len(records), "counts": counts}))
    finally:
        await connection.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Read-only audit failed ({type(error).__name__}); credentials were not printed.")
        raise SystemExit(1) from None
