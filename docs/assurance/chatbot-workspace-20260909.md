# Chatbot workspace verification — 2026-09-09

Implementation: [research and feature record](../product/chatbot-commercial-upgrade-20260909.md).

Local evidence is retained in `.artifacts/chat-workspace/`.
Browser verification uses an isolated SQLite database, synthetic FDA fixtures,
a locally generated signing key, and a local API with model generation disabled.
It does not access or mutate hosted application data.

## Results

| Check | Result |
| --- | --- |
| Full backend regression suite | 578 passed, 9 skipped in 408.90 seconds. This run included the first four new workspace tests. |
| Final workspace API cases | 6 passed after adding two edge cases and preserving original message timestamps in branches. Includes pins, archive/restore, literal search, null rejection, feedback, ownership, branch integrity/continuation, incomplete-prefix rejection, and exports. |
| Frontend tests | 54 passed across 16 files. Includes safe table/code rendering and pin ordering during history hydration. |
| Static checks | Ruff, ESLint, TypeScript and `git diff --check` passed. |
| Production frontend build | Next.js production compilation, type checking, route generation and optimization passed. |
| Browser feature flow | Ten feature groups passed; see `browser-results.json`. |
| Keyboard and evidence checks | Shortcut, initial search focus, modal Tab containment, Escape/return focus, removable source chips, desktop pane geometry and persisted document focus passed; see `keyboard-results.json`. |
| Responsive/bilingual | English and Korean at 320, 390, 768, 1024 and 1440px; no horizontal page overflow. Separate source-reader and selected-source layout checks passed. |
| Browser errors | None in the end-to-end feature flow. |
| Design detector | No findings in the new workspace stylesheet and all changed/new chat components. |

The full browser flow exercises draft reload, selecting two FDA letters, sending
and restoring a streamed answer, source viewing, durable feedback, rename/pin,
export including source URLs, searching and archiving, read-only archived state,
restoration, copying conversation context into a branch, editing in a fresh branch,
and denying a second browser session access to the original thread.

During visual verification, a legacy flex layout initially displaced the desktop
evidence reader; the workspace now explicitly uses a two-column grid. Keyboard
verification also caught initial-focus and Tab-wrap issues in the conversation
dialog. Both were fixed and the targeted browser checks passed afterward.

Selected screenshots: `final-evidence-desktop.png`, `evidence-mobile.png`,
`conversation-library.png`, `landing-en-1440.png`, `landing-ko-390.png`.
API test data and the exported sample are synthetic verification artifacts.

## Limits

The nine skipped full-suite tests depend on PostgreSQL, Supabase or Temporal test
environments. Docker's Linux engine was unavailable locally. The subsequent
hosted CI run below verifies PostgreSQL migration execution and runs the gated
PostgreSQL/Supabase checks and Temporal recovery in separate jobs.

The local browser run exercises the real API, ownership/signing boundary and
streaming path with deterministic source-only answers. The subsequent production
check below verifies real model generation. The existing hosted model configuration
is unchanged. Chat feedback does not approve a regulated record or train a model.

The additive migration is a deployment prerequisite. Production application and
verification of that migration are recorded below.

## Release preparation and hosted CI

The user authorized deployment on 2026-09-09. The upgrade was first published to
`release/chatbot-workspace-20260909`; production remained at `915cee9` until the
production migration was verified.

[CI run 34366163895](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34366163895)
passed all nine jobs on `063574157517c927a35939717913afca3ec6b718`:

- Native backend: **580 passed, 9 skipped**, Ruff passed.
- Packaged API: **580 passed, 9 skipped**, runtime smoke and vulnerability scan passed.
- Frontend tests, lint, typecheck and production build passed.
- Web container smoke and vulnerability scan passed.
- PostgreSQL 16/pgvector: remove the two new columns in the disposable CI database,
  apply the chatbot migration, apply it again, run nine gated database tests, and
  demonstrate backup restoration. The job passed.
- Temporal recovery, contracts, deployment rendering and secret scan passed.

The initial manual CI run scanned full Git history and flagged a public Railway
service UUID in `RAILWAY_SETUP.md`. The exact historical fingerprint is now
excluded in `.gitleaksignore`; broader secret detection remains enabled.

Read-only production verification at 14:50 UTC found **34 threads and 86
messages**, unchanged RLS on both chat tables, and neither new column nor the new
index in Supabase project `iqevzrztpdiysnojzpur`. Runtime database roles cannot
apply DDL, and the saved Supabase CLI session belongs to the previous account.
At that point, deployment was pending execution in the correct project's SQL
Editor. Vercel access was restored and the existing production endpoints were
healthy. The release branch also received a successful frontend preview.

Ignored artifacts include `release-ci.json`, `release-status.json`,
`production-schema-check.json`, the bounded migration runner, and the prepared
hosted browser check.

## Production release — 2026-09-10 KST

The user applied the migration in Supabase project `iqevzrztpdiysnojzpur`.
Verification at 16:38 UTC on September 9 confirmed both new columns, the expected
index definition with `indisvalid=true` and `indisready=true`, and RLS still enabled
on both tables. The original **34 conversations and 86 messages** were preserved.

The initial release `08c09df108d73951571474ab016d0b109b1d32be` deployed successfully
to both Railway and Vercel, with HTTP 200 web/API readiness and successful
[quality CI](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34378078338)
and [code security](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34378078374).

Hosted checks confirmed a real `gpt-5-mini` answer with **six source citations**.
The server-owned JSON export records `status=completed`, `generation_used=true`
and the effective model ID. Chrome discarded the streamed network buffer during
navigation in the first automation attempt, so subsequent verification uses the
persisted export. No provider configuration changed.

The browser flow caught a workspace remount after feedback and rename. Updating
feedback changes the answer timestamp; the previous page key treated that as a
new transcript and could close an open library during delayed revalidation.
Revision `123353fdfadf1b2cb97b4cf23f37966cf7e2f96b` derives that key from message IDs,
roles, statuses, content and citations instead. Three regression tests cover
metadata-only updates, changed answer content, and stream/turn transitions.
All **57 frontend tests**, lint, TypeScript and production build pass locally.

The correction deployed successfully to Vercel (`dpl_DDjdGGVhSZNsgbaVk2jpBbx4iBKU`)
and Railway (GitHub deployment `6354922182`). All **13 hosted verification groups**
pass, with no browser JavaScript errors:

- Draft recovery, real model generation, persisted answer and JSON export.
- Evidence reader at 320, 390, 768, 1024 and 1440px.
- Feedback persistence/removal, rename/pin and Markdown source export.
- Feedback/rename revalidation preserves the open library and search query.
- Search, archive/read-only/restore, branching and edit-question preservation.
- Separate browser sessions cannot read another session's conversation.
- The main flow's three verification conversations were archived.
- English/Korean landing layouts at all five widths, with no horizontal overflow.

The run resumed with its existing browser session after the refresh correction,
without another model request. Results, the source-bearing model export, screenshots
and the browser script are retained in `.artifacts/chat-workspace/production/` and
the parent artifact directory. The live application is
https://pharmaagent-os-ochre.vercel.app/ask.
