# Linear-inspired workspace implementation

Implementation: September 10, 2026. Final local verification: September 11, 2026.
Not deployed.
Source: the approved adaptation of `Linear_Research_2026-09-10.md`, under
`PHARMA_AGENT_OS_IMPLEMENTATION_PLAN.md`. The research describes proposed design
and latency targets; it is not a measured performance baseline for this service.

## Delivered behavior

| Area | Implementation |
| --- | --- |
| Shell | Attached 240px navigation, 52px utility bar, existing indigo/Daewoong identity, local Pretendard and Streamline. Research, Sources, Saved work, Inbox and Chat are primary. Team review and operations retain their authorization. |
| Research | Persistent searchable/status-filtered paginated run history; cached selected runs; URL run/evidence selection; citation inspector shows the retained version, source hash, anchor and excerpt. Stop/resume and worker semantics remain server-authoritative. |
| Sources | Existing server pagination and filters, URL selection, bounded preview prefetch, adjacent inspector on wide screens and modal inspector on narrow screens. Close restores the opening record's focus. Large property lists have an option-search field; native select keyboard behavior remains. |
| Saved work | Separate briefs, source bookmarks, saved source views and links to device-local drafts. Saved views retain existing subscriptions/cadences and add display preferences and revisions. Editing reports conflicts without dropping entered text. |
| Brief snapshots | Saving a completed run sends its ID and displayed revision. The server copies that exact result with retained source bindings and computes SHA-256. Repeated saves of the same owner/run/revision return the same snapshot. Snapshot detail/copy/JSON export are owner-scoped. Database triggers reject updates and deletes. |
| Inbox | Personal source-change triage, not a formal review queue. On first visit the server stores `starts_at = now - 30 days`; later visits never move that horizon forward. New, Later, Done and Dismissed have per-owner revisions. Dismissal requires a reason. Bulk actions affect explicitly selected rows on the current page and report partial success. |
| Search | Metadata/title search across admitted source records, owned research objectives, saved brief titles, saved view names and owned nonarchived chat titles. No message-body or internal-document search is added. All-results groups are bounded; each group has a paginated view. |
| Commands | Ctrl/Cmd K outside text editing opens the command dialog. Visible registered controls and commands use the same callbacks and current enabled checks. Source commands identify their record. Composition events do not trigger shortcuts. Conversation search is registered with the shared menu; it no longer opens a second dialog for the global shortcut. The open menu subscribes to actions as streamed content becomes interactive. |
| Cache | TanStack Query 5.102.8, memory only, keyed by browser owner; 30-second freshness and five-minute retention. Owner changes remount and clear the client. Writes refresh affected query families. Bookmark intent is optimistic with a distinct pending label and rollback; brief saves, triage and formal decisions wait for server confirmation. |
| Case execution | Run/event polling updates the execution panel through scoped queries instead of refreshing the entire route every two seconds. Existing plan/state binding and permission checks remain. |

Existing `/saved-views`, full source readers, chat, cases, approvals and operations
remain available. No new authentication flow, external messaging, issue tracker,
font asset or autonomous regulatory decision is introduced.

## Code map

- `apps/web/components/workspace/`: provider, action registry, inspectors, search,
  inbox, saved work and research history.
- `apps/web/app/workspace.css`: attached-shell geometry, density, responsive and
  reduced-motion behavior; imported after the existing theme.
- `apps/web/lib/workspace-*`: typed client contracts and same-origin API access.
- `apps/web/app/api/workspace/[...path]/route.ts`: allowlisted proxy preserving
  server-side identity, mutation-origin checks, response status and no-store.
- `services/api/app/workspace/`: owned search, inbox and immutable snapshots.
- `services/api/app/routes/intelligence.py`: SQL-paginated saved views, bounded
  source bookmark lookup, display metadata and conditional revision updates.
- `infra/migrations/20260910_linear_workspace.sql`: additive schema, backfill,
  indexes, immutability triggers, RLS and runtime grants.

## Persistence and failure contracts

Personal ownership uses the existing anonymous browser-session subject. It does
not imply permanent cross-device identity. Clearing/losing that session can make
personal work inaccessible; the existing session notice and export routes remain.
The API checks ownership on reads and writes. RLS denies direct browser access;
the trusted API runtime still enforces per-owner predicates, as in the existing
architecture. Runtime credentials are not an end-user authorization boundary.

New tables are `workspace_inbox_preferences`, `workspace_triage` and
`research_brief_snapshots`. Subscriptions gain `view_kind`, `source_id`, `display`
and `revision`; legacy bookmark name markers remain compatible. No existing
records are deleted. Source-version/hash metadata and snapshot content are copied
from the server's completed research result, never from a browser-submitted brief.

Inbox state/reason/revision changes emit audit events. Personal Done/Dismissed does
not change source review state. Stale writes return 409. Bulk triage is a sequence
of individually durable operations, not an all-or-nothing transaction; the UI
reports the number saved and retains failed selections for reconciliation.

Saved-view revisions are required by the new editor. The older saved-view editor
can omit the revision for compatibility. New controls use targeted refresh;
existing consequential case/review forms retain their authoritative server path.

## Rollout and rollback

1. Back up the target database using the existing deployment procedure. Apply
   `infra/migrations/20260910_linear_workspace.sql` as the migration owner before
   deploying application code that reads the new columns/tables.
2. Apply the updated `infra/policies/postgres-runtime-roles.sql`. Reapply the
   workspace migration if roles were created after the first migration pass, so
   the API policies are present. On Supabase apply the updated
   `infra/deployment/vercel/supabase-data-api-boundary.sql` after migrations/grants.
3. Deploy the matching API revision, then the web revision built with `npm ci`.
   Workers continue using the existing research persistence and do not need access
   to personal triage or snapshots. Keep production auto-schema creation disabled.
4. In preview, verify owned versus other-session reads, a stale triage edit,
   completed brief save/export, source bookmarks, run stop/resume, and a formal
   review workflow with the established reviewer identity. Verify browser roles
   cannot select the three new tables. Then use the normal production rollout.
5. `LINEAR_WORKSPACE_ENABLED=false` restores the older shell/navigation presentation
   only. It does not disable the new routes or undo persistence. For a full UI/API
   rollback, redeploy the prior application revision and retain the additive
   schema/data. Do not delete immutable snapshots as a rollback operation.

The local SQLite bootstrap adds subscription columns and snapshot immutability
triggers for development. It is not the production migration mechanism.

## Verification

The full API suite passed 587 tests with 10 environment-dependent skips before the
final bounded-bookmark regression was added. The final focused workspace and
saved-view suite passed 7 tests. Ruff passed. Frontend unit tests passed 74 tests;
ESLint and the production build passed. Browser and performance evidence is
recorded below.

An isolated PostgreSQL 16/pgvector container bound to localhost:55436 was used.
The complete model schema, runtime grants, workspace migration and Supabase
boundary applied successfully. Snapshot SQL update/delete denial, API-runtime access and browser/worker/readonly/
orchestrator/MCP grant checks passed. The seeded Supabase boundary test also passed,
including preservation of unrelated tables and runtime visibility. A separate minimal pre-change database
verified real subscription-column addition, legacy bookmark backfill, retention
of ordinary saved views and a second idempotent migration pass. No hosted
database was used.

Browser regressions cover mounted list identity, history/focus restoration,
commands, Korean IME, narrow screens, enlarged text, reduced motion, stale search,
saved-view and triage conflicts, failed bookmarks, brief evidence/export links,
existing source tabs, chat, case views and navigation.

`e2e/workspace-performance.spec.ts` measures 30 warm inspector activations for
100, 1,000 and 10,000 available-source fixtures per browser, with 20 rendered rows and long Korean/English fixture titles.
Reports include raw samples, browser version, OS, CPU, RAM and viewport. The final
latency run disables trace recording during timing, measures idle frame intervals,
and captures a separate representative interaction trace afterward. Timing
separates acknowledgment, useful cached content and animation completion. The
500ms regression ceiling is not the proposed 100ms product target. These local
fixture measurements exclude hardware input latency, save durability, deployment
network latency and field INP. Production p75 INP and representative laptop/
network qualification remain release measurements, not claims of this change.

Reproduce from `apps/web`: `npm test`, `npm run lint`, `npm run build`, then
`npx playwright test`. Local browser binaries were installed under the workspace
at `.cache/playwright`; set `PLAYWRIGHT_BROWSERS_PATH` to that directory when
reusing them. CI installs its own browsers and uploads `.artifacts/ui-audit`.


## Final local verification — September 11

- Full API run: 587 passed, 10 environment-dependent skips. After the final
  bookmark lookup extension, workspace/saved-view/boundary coverage passed
  8 tests with the PostgreSQL-only test skipped in that SQLite run.
- Isolated PostgreSQL: snapshot immutability and API/non-API grants passed;
  both seeded Supabase boundary tests passed. The container is stopped and its
  disposable fixture databases are retained. The old-schema upgrade/backfill and
  second migration pass also succeeded.
- Frontend: 74 unit tests, ESLint, production compilation and TypeScript passed.
- The broad 78-scenario browser run passed 75 and exposed a Firefox page-startup
  timeout plus two WebKit focus failures. Focus handling was corrected. All 21
  workspace journeys then passed serially across Chromium, Firefox and WebKit;
  the three existing conversation-dialog focus regressions also passed.
- A new global-command regression exposed late hydration of registered actions.
  The open menu now subscribes to registry changes. Keyboard tests wait for the
  shell's actual client request before sending global keys. The final command
  and performance run passed all 12 tests (three command journeys and nine
  dataset/browser benchmarks). Current-view command tests also passed in all
  three browsers. No known functional browser failure remains.

Final useful-cached-content p95, 30 activations per cell, 20 rendered rows:

| Browser | 100 sources | 1,000 sources | 10,000 sources |
| --- | ---: | ---: | ---: |
| chromium | 58.2 ms | 46.1 ms | 44.5 ms |
| firefox | 63.0 ms | 46.0 ms | 60.0 ms |
| webkit | 333.0 ms | 334.0 ms | 305.0 ms |

Host: Intel Core i7-13700HX, approximately 32 GiB RAM, Windows kernel 10.0.26200;
viewport 1440 × 1000. Exact browser versions, idle-frame calibration, all samples,
acknowledgment timing and animation completion timing are in the
[raw measurement record](docs/assurance/linear-workspace-performance-20260911.json).
The fixtures use long Korean/English titles. These are headless lab observations;
Windows WebKit is not a measurement of Safari on Apple hardware.

The first WebKit run recorded screenshots/DOM snapshots during timing and reached
582 ms p95 at 10,000 available records, failing the regression ceiling. Recording
was moved outside the measured section, with a representative trace captured
separately. All final cases pass the 500 ms lab regression ceiling. The proposed
100 ms target is met by these Chromium/Firefox samples and remains unmet by
Windows WebKit. Simplifying the document-level scroll selector did not establish
an improvement for WebKit. Do not claim universal sub-100 ms navigation or field
INP qualification. Profile a representative Apple/Safari device and deployment
network before releasing against that performance target.

Local evidence directories:

- `.artifacts/linear-workspace/workspace/`: passing workspace screenshots and run receipt.
- `.artifacts/linear-workspace/release-check/`: final samples, separate representative
  traces and passing run receipt.
- `.artifacts/linear-workspace/final/` and `verified/`: retained intermediate
  measurement runs, including the failed instrumented benchmark.
- `.artifacts/ui-audit/browser/`: broader route, motion and compatibility audit.

The source plan, design authority and current implementation handoff have been
updated. Deployment remains separate: migrate first, then API, then web.

## Hosted dataset preparation — September 11 follow-up

The current hosted dataset has now passed read-only preflight and a fresh
application backup/restore rehearsal. All 59 application tables and 770 referenced
raw evidence files were backed up; every original table's counts and content
survived two local migration passes. One legacy bookmark converted correctly and
three database guard/boundary tests passed. No data cleanup or re-embedding was
needed for this migration. See the
[preparation and recovery record](docs/assurance/workspace-dataset-preparation-20260911.md).
This follow-up used hosted reads; hosted schema/data and deployments remain unchanged.

## Release qualification follow-up

PR #14 initially passed 86 of 90 hosted browser cases. The failures exposed a
hidden streamed research form matching an unscoped locator, a same-origin sidebar
request interrupted by the route matrix, and an error page during rapid WebKit
performance samples. The checks now establish hydration from the actual sidebar
response, select the visible Korean form, and retain browser-error assertions.
Timing samples use 500 ms spacing outside the measured activation on every browser.
This avoids the [WebKit History API quota](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/History.cpp)
when Next synchronizes each native history update with another history write.
The 30-sample count and 500 ms latency regression ceiling are unchanged. This is
an isolated latency test, not sustained navigation-throughput qualification.

Production schema migration has subsequently committed with verified table counts,
bookmark backfill and runtime access boundaries. The fresh recovery copy is under
`.artifacts/linear-workspace/predeploy-20260911/`; the public verification receipt is
`docs/assurance/workspace-production-migration-20260911.json`. Application rollout
remains in progress pending final browser CI and live verification.
