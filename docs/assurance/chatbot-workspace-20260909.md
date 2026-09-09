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
environments. Docker's Linux engine was unavailable locally; PostgreSQL migration
execution has not been verified here. CI now applies the additive chat migration
twice in its PostgreSQL schema job. No CI result is claimed for unpushed changes.

The local browser run exercises the real API, ownership/signing boundary and
streaming path with deterministic source-only answers. A live model response was
not requested for this revision. The existing hosted model configuration is not
changed. Chat feedback does not approve a regulated record or train a model.

Deployment prerequisites: apply `infra/migrations/20260909_chat_workspace.sql`,
then release the API and web application. Hosted migration, hosted browser checks,
and a live-model request for this revision have not been performed.
