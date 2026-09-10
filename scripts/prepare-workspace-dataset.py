"""Read-only hosted preflight and consistent public-schema recovery export.

Run with the API venv. Credentials stay in an ignored JSON file; never log them.
This does not migrate the source or claim a full Supabase/auth backup.
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import asyncpg
import httpx

ROOT = Path(__file__).resolve().parents[1]
MARKER = r"^Drug letter bookmark:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
REQUIRED = {
    "subscriptions": {"id", "owner_id", "name", "updated_at"},
    "research_runs": {"id", "owner_id", "updated_at", "revision", "result"},
    "change_events": {"id"},
    "warning_letters": {"id"},
    "documents": {"id", "warning_letter_id", "current_version_id"},
    "document_versions": {"id", "document_id", "raw_object_key", "raw_sha256"},
    "document_chunks": {"id", "document_version_id"},
    "chunk_embeddings": {"id", "document_chunk_id"},
}


def workspace_path(value):
    path = Path(value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Paths must remain inside the PharmaAgentOS workspace")
    return path


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


async def prepare(args):
    credentials = json.loads(workspace_path(args.runtime_credentials).read_text())[
        "api"
    ]
    if not credentials["username"].endswith("." + args.project):
        raise ValueError("Credential target does not match the explicit project")
    output = workspace_path(args.output)
    if not output.is_relative_to(ROOT / ".artifacts"):
        raise ValueError("Recovery exports must be inside ignored .artifacts")
    output.mkdir(parents=True, exist_ok=False)
    report = {
        "project": args.project,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "source_mutated": False,
        "scope": "public schema and referenced raw evidence; excludes auth and platform configuration",
        "checks": {},
        "blockers": [],
        "backup_complete": False,
    }
    conn = await asyncpg.connect(
        host=credentials["host"],
        port=5432,
        user=credentials["username"],
        password=credentials["password"],
        database="postgres",
        ssl="require",
        statement_cache_size=0,
        timeout=30,
    )
    try:
        async with conn.transaction(isolation="repeatable_read", readonly=True):
            await conn.execute("SET LOCAL statement_timeout = '120s'")
            report["server_version"] = await conn.fetchval("SHOW server_version")
            columns = await conn.fetch(
                "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'"
            )
            schema = {}
            for row in columns:
                schema.setdefault(row["table_name"], set()).add(row["column_name"])
            missing = {
                t: sorted(cols - schema.get(t, set()))
                for t, cols in REQUIRED.items()
                if cols - schema.get(t, set())
            }
            report["missing_columns"] = missing
            if missing:
                report["blockers"].append("missing prerequisite columns")
                return report
            tables = await conn.fetch("""SELECT c.relname, has_table_privilege(c.oid,'SELECT') readable,
                NOT c.relrowsecurity OR EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid
                AND p.polpermissive AND p.polcmd IN ('r','*')
                AND pg_get_expr(p.polqual,p.polrelid)='true'
                AND EXISTS (SELECT 1 FROM unnest(p.polroles) r WHERE r=0 OR pg_has_role(r,'MEMBER')))
                AS unrestricted_read FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1""")
            # Reject restrictive RLS policies too: a permissive true policy alone is insufficient.
            restrictive = await conn.fetchval("""SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT p.polpermissive
                AND p.polcmd IN ('r','*') AND EXISTS
                (SELECT 1 FROM unnest(p.polroles) r WHERE r=0 OR pg_has_role(r,'MEMBER'))""")
            if restrictive or any(
                not r["readable"] or not r["unrestricted_read"] for r in tables
            ):
                report["blockers"].append(
                    "cannot prove complete runtime read visibility"
                )
                return report
            report["complete_public_read_visibility"] = True
            report["counts"] = {}
            for row in tables:
                name = row["relname"]
                quoted = '"' + name.replace('"', '""') + '"'
                report["counts"][name] = await conn.fetchval(
                    f"SELECT count(*) FROM public.{quoted}"
                )
            queries = {
                "blank_subscription_owners": "SELECT count(*) FROM subscriptions WHERE owner_id IS NULL OR btrim(owner_id)=''",
                "blank_research_owners": "SELECT count(*) FROM research_runs WHERE owner_id IS NULL OR btrim(owner_id)=''",
                "orphan_documents": "SELECT count(*) FROM documents d LEFT JOIN warning_letters w ON w.id=d.warning_letter_id WHERE w.id IS NULL",
                "orphan_versions": "SELECT count(*) FROM document_versions v LEFT JOIN documents d ON d.id=v.document_id WHERE d.id IS NULL",
                "invalid_current_versions": "SELECT count(*) FROM documents d LEFT JOIN document_versions v ON v.id=d.current_version_id AND v.document_id=d.id WHERE d.current_version_id IS NOT NULL AND v.id IS NULL",
                "orphan_chunks": "SELECT count(*) FROM document_chunks c LEFT JOIN document_versions v ON v.id=c.document_version_id WHERE v.id IS NULL",
                "orphan_embeddings": "SELECT count(*) FROM chunk_embeddings e LEFT JOIN document_chunks c ON c.id=e.document_chunk_id WHERE c.id IS NULL",
                "malformed_legacy_bookmarks": "SELECT count(*) FROM subscriptions WHERE name LIKE 'Drug letter bookmark:%' AND name !~ $1",
                "orphan_legacy_bookmarks": "SELECT count(*) FROM subscriptions s LEFT JOIN warning_letters w ON w.id=substring(s.name from 22) WHERE s.name ~ $1 AND w.id IS NULL",
            }
            for name, sql in queries.items():
                value = await conn.fetchval(sql, *([MARKER] if "$1" in sql else []))
                report["checks"][name] = value
                if value:
                    report["blockers"].append(name)
            report["legacy_bookmarks_to_backfill"] = await conn.fetchval(
                "SELECT count(*) FROM subscriptions WHERE name ~ $1", MARKER
            )
            files = [
                dict(r)
                for r in await conn.fetch(
                    "SELECT DISTINCT raw_object_key,raw_sha256 FROM document_versions WHERE raw_object_key IS NOT NULL"
                )
            ]
            (output / "evidence-manifest.json").write_text(
                json.dumps(files, indent=2), encoding="utf-8"
            )
            snapshot = await conn.fetchval("SELECT pg_export_snapshot()")
            env = os.environ.copy()
            env.update(
                PGHOST=credentials["host"],
                PGPORT="5432",
                PGUSER=credentials["username"],
                PGPASSWORD=credentials["password"],
                PGDATABASE="postgres",
                PGSSLMODE="require",
                PGOPTIONS="-c default_transaction_read_only=on",
                PGCONNECT_TIMEOUT="30",
            )
            command = ["docker", "run", "--rm"]
            for key in [
                "PGHOST",
                "PGPORT",
                "PGUSER",
                "PGPASSWORD",
                "PGDATABASE",
                "PGSSLMODE",
                "PGOPTIONS",
                "PGCONNECT_TIMEOUT",
            ]:
                command += ["-e", key]
            command += [
                "pgvector/pgvector:pg17",
                "pg_dump",
                "--format=custom",
                "--schema=public",
                "--no-owner",
                "--no-acl",
                "--enable-row-security",
                "--inserts",
                "--snapshot=" + snapshot,
            ]
            with (
                (output / "public.dump").open("wb") as dump,
                (output / "dump-private.log").open("wb") as log,
            ):
                result = await asyncio.to_thread(
                    subprocess.run,
                    command,
                    env=env,
                    stdout=dump,
                    stderr=log,
                    timeout=1800,
                )
            if result.returncode:
                raise RuntimeError("Database export failed; inspect private log")
            report["dump_sha256"] = digest(output / "public.dump")
            report["database_export_complete"] = True
            (output / "public.dump.sha256").write_text(
                report["dump_sha256"] + "  public.dump\n", encoding="ascii"
            )
            (output / "preflight.json").write_text(
                json.dumps(report, indent=2), encoding="utf-8"
            )
        print(
            "Consistent database export completed; verifying source files.", flush=True
        )
        key = json.loads(workspace_path(args.provider_credentials).read_text())[
            "supabase"
        ]
        from urllib.parse import quote

        target = f"https://{args.project}.supabase.co"
        objects = output / "objects"
        objects.mkdir()
        async with httpx.AsyncClient(
            headers={"apikey": key}, timeout=60, follow_redirects=False
        ) as client:
            bucket = await client.get(target + "/storage/v1/bucket/pharma-evidence")
            bucket.raise_for_status()
            report["storage_private"] = bucket.json()["public"] is False
            if not report["storage_private"]:
                report["blockers"].append("evidence bucket is public")
            gate = asyncio.Semaphore(8)
            completed = 0

            async def transfer(row):
                nonlocal completed
                async with gate:
                    sha = row["raw_sha256"]
                    if not re.fullmatch(r"[a-fA-F0-9]{64}", sha):
                        raise ValueError("Invalid raw evidence digest")
                    for attempt in range(3):
                        try:
                            response = await client.get(
                                target
                                + "/storage/v1/object/pharma-evidence/"
                                + quote(row["raw_object_key"], safe="/")
                            )
                            response.raise_for_status()
                            break
                        except httpx.HTTPError:
                            if attempt == 2:
                                raise
                            await asyncio.sleep(attempt + 1)
                    if hashlib.sha256(response.content).hexdigest() != sha.lower():
                        raise ValueError("Raw evidence checksum mismatch")
                    (objects / sha).write_bytes(response.content)
                    completed += 1
                    if completed % 100 == 0:
                        print(
                            f"Verified and backed up {completed}/{len(files)} source files",
                            flush=True,
                        )

            await asyncio.gather(*(transfer(row) for row in files))
        report["verified_source_files"] = len(files)
        report["backup_complete"] = True
        return report
    finally:
        await conn.close()
        (output / "preflight.json").write_text(
            json.dumps(report, indent=2), encoding="utf-8"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["runtime-credentials", "provider-credentials", "project", "output"]:
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z]{20}", args.project):
        parser.error("Expected a Supabase project reference")
    try:
        report = asyncio.run(prepare(args))
        print(
            json.dumps(
                {
                    k: report.get(k)
                    for k in [
                        "project",
                        "counts",
                        "checks",
                        "blockers",
                        "backup_complete",
                        "verified_source_files",
                    ]
                },
                indent=2,
            )
        )
        return 0 if report["backup_complete"] and not report["blockers"] else 1
    except Exception as exc:  # noqa: BLE001 -- SQL/HTTP exceptions can expose private records or credentials
        print(
            json.dumps(
                {
                    "failed": type(exc).__name__,
                    "sqlstate": getattr(exc, "sqlstate", None),
                }
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
