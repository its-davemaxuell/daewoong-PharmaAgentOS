# Workspace migration dataset preparation — September 11, 2026

Target: Supabase `iqevzrztpdiysnojzpur`, identified by the current Railway deployment
record and verified by connecting with its existing API database identity.
Production migration and deployment are separate from this preparation.

## Hosted preflight and backup result

Preparation started at `2026-09-10T15:17:42Z` (September 11,
00:17 KST), against PostgreSQL 17.6. All 59 public application tables were readable
under unconditional applicable runtime policies, with no applicable restrictive
read policy. No prerequisite columns were missing.

| Snapshot contents | Count |
| --- | ---: |
| Warning letters | 1,920 |
| Documents / document versions | 1,922 / 1,920 |
| Document chunks | 8,224 |
| Versioned chunk embeddings | 1 |
| Change events | 1,926 |
| Research runs | 1 |
| Chat threads / messages | 39 / 94 |
| Subscriptions, including bookmarks | 3 |
| Referenced raw evidence files | 770 |

Missing subscription/research owners, orphan documents/versions/chunks/embeddings,
invalid current-version bindings, malformed bookmark markers, and orphan bookmark
targets all returned zero. One legacy bookmark is eligible for the automatic
backfill. No manual data corrections were necessary. The existing embedding
coverage is preserved; this workspace migration does not expand semantic indexing.

The public-schema recovery export completed successfully, and all 770 private
evidence objects were downloaded and matched their recorded SHA-256. The export
digest is `c0ce14ad178ad822f5de98eb14f5388c892266e356775d31e76e3fd1ac4cd010`.
Private recovery files and detailed receipts are retained at
`.artifacts/linear-workspace/dataset-ready-20260911/`. The earlier 444-file import
record is historical and must not be treated as the current dataset inventory.

## Restored-live-data rehearsal result

Completed at `2026-09-10T15:24:06Z` (September 11, 00:24 KST). All 59 restored
table counts matched the exported snapshot. SHA-256 fingerprints of every original
column's content matched before and after the first migration and again after
the second migration, updated runtime grants, and Supabase boundary. The one
legacy bookmark was converted correctly. The three focused PostgreSQL/Supabase
tests passed, including saved-brief update/delete denial, API access, non-API
denial, and preservation of unrelated tables.

The local rehearsal container `pharma-workspace-restore-20260911` is stopped;
its database files remain under the ignored recovery directory. The tested
migration SHA-256 is
`e895f5f4029d6d2de3388d4a262c8512bc602e1c037e046a213d6f5d89cbe778`.
Ruff and Python compilation passed for the two preparation scripts.

The application dataset is prepared for this migration. No production database
schema/data or deployed application was changed. Provider-wide auth/configuration
backup status and the previously documented performance/release qualifications
were not evaluated by this data preparation.

## Repeatable preparation

Run from the PharmaAgentOS workspace using its API virtual environment. These
commands read the hosted source and write private recovery files under ignored
`.artifacts`. Use a fresh output directory for each run. They never ingest,
reclassify, re-chunk, re-embed, or alter source records.

```powershell
services/api/.venv/Scripts/python.exe scripts/prepare-workspace-dataset.py `
  --runtime-credentials .artifacts/migration-iqevzrztpdiysnojzpur/runtime.secret.json `
  --provider-credentials .artifacts/migration-iqevzrztpdiysnojzpur/provider.secret.json `
  --project iqevzrztpdiysnojzpur `
  --output .artifacts/linear-workspace/dataset-ready-20260911

services/api/.venv/Scripts/python.exe scripts/rehearse-workspace-migration.py `
  --backup-dir .artifacts/linear-workspace/dataset-ready-20260911 `
  --container pharma-workspace-restore-20260911 `
  --port 55437
```

Prerequisites: Docker, the PostgreSQL 17/pgvector image, and existing credential
files supplied locally. Credentials are read in-process and never printed.
The recovery directory contains private application records: do not commit or
publish it. A SHA-256 checksum verifies integrity; it is not encryption.

The preflight checks prerequisite columns, complete API read visibility under
the current RLS policies, missing owners, malformed/orphaned legacy bookmarks,
document/version/chunk/embedding references, and current-version ownership.
It exports the public schema using PostgreSQL 17 `pg_dump`, within the same
repeatable-read snapshot used for table counts. Source transactions are read-only.
Every referenced raw evidence object is downloaded and checked against its
recorded SHA-256. The bucket must remain private.

The rehearsal refuses an existing output database directory or container name.
It binds a new PostgreSQL 17 instance to localhost only, restores the export,
compares every table count against the snapshot, and hashes all original column
contents before and after two migration passes. It applies runtime grants and
the Supabase application boundary, then runs the database permission and immutable
snapshot tests. The local container is stopped and retained afterward.

## Recovery scope and release sequence

The export covers the application's public schema, including research and chat
history, and referenced raw source files. It excludes Supabase auth identities,
managed platform configuration, original login credentials/ACLs, and unrelated
storage objects. Runtime permissions are reconstructed from the reviewed SQL.
This is an application recovery copy, not a full Supabase project disaster-recovery
qualification. Keep the provider's existing project backup procedure in place.

At rollout, arrange the normal write-maintenance window and take a fresh recovery
copy if data has changed since this preparation. A live worker can add records
after a snapshot; that does not invalidate the historical snapshot, but it makes
it unsuitable as a zero-data-loss rollback point for a later deployment.

Apply `infra/migrations/20260910_linear_workspace.sql` with the migration-owner
identity before the new API/web code. Apply runtime grants, reapply the migration
if roles were created afterward, then apply the Supabase boundary. Use bounded
lock/statement timeouts in the deployment connection. Roll out API then web and
verify owner isolation, bookmark operations, research controls, saved-brief export,
and formal reviewer access. Keep `AUTO_CREATE_SCHEMA=false` in production.

If application rollback is necessary, restore the previous API/web revisions and
retain the additive schema and immutable saved briefs. Do not restore this data
dump over a populated production database or delete newer records as a routine
rollback. Restore into a fresh isolated target first and reconcile any later writes.

The first sequential source-download attempt is retained under
`.artifacts/linear-workspace/dataset-preparation-20260911` as incomplete. Only a
run with `backup_complete: true`, no preflight blockers, and a successful rehearsal
receipt qualifies the application data for the migration.
