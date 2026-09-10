"""Restore a prepared export into a NEW local container and rehearse migration.

Never connects to the source. Retains recovery files and stops the local container.
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

ROOT = Path(__file__).resolve().parents[1]


def run(command, log, **kwargs):
    with log.open("ab") as stream:
        result = subprocess.run(
            command, stdout=stream, stderr=stream, timeout=1800, check=False, **kwargs
        )
    if result.returncode:
        raise RuntimeError("Local rehearsal command failed; inspect private log")


async def fingerprints(conn, schema):
    results = {}
    for table, columns in schema.items():

        def quoted(value):
            return '"' + value.replace('"', '""') + '"'

        query = f"SELECT row_to_json(t)::text value FROM (SELECT {','.join(map(quoted, columns))} FROM public.{quoted(table)}) t ORDER BY value"
        digest = hashlib.sha256()
        async with conn.transaction():
            async for row in conn.cursor(query):
                digest.update(row["value"].encode("utf-8") + b"\n")
        results[table] = digest.hexdigest()
    return results


async def rehearse(args):
    output = Path(args.backup_dir).resolve()
    if not output.is_relative_to(ROOT / ".artifacts"):
        raise ValueError("Backup must be in the workspace's ignored .artifacts")
    preflight = json.loads((output / "preflight.json").read_text())
    if not preflight["backup_complete"]:
        raise ValueError("Backup is incomplete")
    with (output / "public.dump").open("rb") as stream:
        if (
            hashlib.file_digest(stream, "sha256").hexdigest()
            != preflight["dump_sha256"]
        ):
            raise ValueError("Database dump checksum mismatch")
    # Fresh directory plus Docker's unique-name check refuse accidental target reuse.
    pgdata = output / "restore-pgdata"
    pgdata.mkdir(exist_ok=False)
    log = output / "restore-private.log"
    env = os.environ.copy()
    env["POSTGRES_PASSWORD"] = "local-rehearsal-only"
    run(
        [
            "docker",
            "run",
            "-d",
            "--name",
            args.container,
            "-e",
            "POSTGRES_PASSWORD",
            "-p",
            f"127.0.0.1:{args.port}:5432",
            "--mount",
            f"type=bind,source={output},target=/recovery,readonly",
            "--mount",
            f"type=bind,source={pgdata},target=/var/lib/postgresql/data",
            "pgvector/pgvector:pg17",
        ],
        log,
        env=env,
    )
    report = {
        "source_connected": False,
        "restore_verified": False,
        "migration_verified": False,
    }
    conn = None
    try:
        for _ in range(60):
            try:
                conn = await asyncpg.connect(
                    host="127.0.0.1",
                    port=args.port,
                    user="postgres",
                    password=env["POSTGRES_PASSWORD"],
                    database="postgres",
                    timeout=2,
                )
                break
            except (OSError, asyncpg.PostgresError):
                await asyncio.sleep(1)
        if conn is None:
            raise RuntimeError("Local restore database did not start")
        if await conn.fetchval(
            "SELECT count(*) FROM pg_tables WHERE schemaname='public'"
        ):
            raise ValueError("Restore database must be empty")
        # The hosted schema uses public.vector. Schema-filtered pg_dump excludes
        # extension definitions, so install these dependencies explicitly.
        await conn.execute("CREATE EXTENSION vector; CREATE EXTENSION pgcrypto")
        for role in [
            "anon",
            "authenticated",
            "service_role",
            "fda_api_runtime",
            "fda_worker_runtime",
            "fda_readonly_runtime",
            "pharma_orchestrator_runtime",
            "pharma_mcp_runtime",
        ]:
            await conn.execute(f"CREATE ROLE {role} NOLOGIN")
        listing = await asyncio.to_thread(
            subprocess.run,
            [
                "docker",
                "exec",
                args.container,
                "pg_restore",
                "--list",
                "/recovery/public.dump",
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if listing.returncode:
            raise RuntimeError("Cannot read dump contents")
        # public already exists in every fresh PostgreSQL database. Exclude only
        # that creation entry, retaining all tables, functions, data and policies.
        (output / "restore.list").write_text(
            "\n".join(
                line
                for line in listing.stdout.splitlines()
                if not re.search(r" SCHEMA - public ", line)
            )
            + "\n",
            encoding="utf-8",
        )
        run(
            [
                "docker",
                "exec",
                args.container,
                "pg_restore",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "--exit-on-error",
                "--no-owner",
                "--no-acl",
                "--use-list=/recovery/restore.list",
                "/recovery/public.dump",
            ],
            log,
        )
        schema = {}
        for row in await conn.fetch(
            "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"
        ):
            schema.setdefault(row["table_name"], []).append(row["column_name"])
        counts = {
            table: await conn.fetchval(f'SELECT count(*) FROM public."{table}"')
            for table in schema
        }
        if counts != preflight["counts"]:
            raise ValueError("Restored counts differ from the same exported snapshot")
        report["restored_counts"] = counts
        report["restore_verified"] = True
        before = await fingerprints(conn, schema)
        migration = (
            ROOT / "infra/migrations/20260910_linear_workspace.sql"
        ).read_text()
        await conn.execute(migration)
        if before != await fingerprints(conn, schema):
            raise ValueError("Migration changed original column content")
        for name in [
            "infra/policies/postgres-runtime-roles.sql",
            "infra/migrations/20260910_linear_workspace.sql",
            "infra/deployment/vercel/supabase-data-api-boundary.sql",
        ]:
            await conn.execute((ROOT / name).read_text())
        if before != await fingerprints(conn, schema):
            raise ValueError("Repeated migration changed original column content")
        bad = await conn.fetchval("""SELECT count(*) FROM subscriptions WHERE
            name ~ '^Drug letter bookmark:[0-9a-fA-F-]{36}$'
            AND (view_kind != 'source_bookmark' OR source_id IS DISTINCT FROM substring(name from 22))""")
        if bad:
            raise ValueError("Bookmark backfill mismatch")
        report["original_column_sha256"] = before
        report["migration_verified"] = True
        report["migration_passes"] = 2
        report["migration_sha256"] = hashlib.sha256(migration.encode()).hexdigest()
        print(
            "Restore counts and original-column checksums match after two migration passes.",
            flush=True,
        )
        env.update(
            DATABASE_URL=f"postgresql+asyncpg://postgres:{env['POSTGRES_PASSWORD']}@127.0.0.1:{args.port}/postgres",
            AGENT_OS_POSTGRES_TEST="1",
            AGENT_OS_SUPABASE_TEST="1",
            AUTO_CREATE_SCHEMA="false",
        )
        run(
            [
                str(ROOT / "services/api/.venv/Scripts/python.exe"),
                "-m",
                "pytest",
                "-q",
                "tests/test_workspace_postgres.py",
                "tests/test_supabase_boundary.py",
            ],
            output / "rehearsal-tests.log",
            env=env,
            cwd=ROOT / "services/api",
        )
        report["database_guard_tests_passed"] = True
        report["rehearsal_complete"] = True
        report["completed_at"] = datetime.now(timezone.utc).isoformat()
    finally:
        if conn:
            await conn.close()
        run(["docker", "stop", args.container], log)
        (output / "rehearsal.json").write_text(
            json.dumps(report, indent=2), encoding="utf-8"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backup-dir", required=True)
    parser.add_argument("--container", required=True)
    parser.add_argument("--port", type=int, default=55437)
    args = parser.parse_args()
    if (
        not re.fullmatch(r"pharma-workspace-restore-[a-z0-9-]+", args.container)
        or not 1024 <= args.port <= 65535
    ):
        parser.error(
            "Use a dedicated pharma-workspace-restore-* name and unprivileged port"
        )
    try:
        asyncio.run(rehearse(args))
    except Exception as exc:  # noqa: BLE001 -- avoid leaking restored private rows in errors
        print(
            json.dumps(
                {
                    "failed": type(exc).__name__,
                    "sqlstate": getattr(exc, "sqlstate", None),
                }
            )
        )
        raise SystemExit(1) from None
