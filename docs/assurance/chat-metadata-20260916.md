# Chatbot metadata and interaction testing

Date: September 16, 2026. Scope: Chat question routing, retained FDA metadata,
source inspection and the existing English/Korean interaction flow.

## Baseline findings

The live catalog has **767 letters**, with **zero missing issue dates** and
**zero missing posting dates**. These fields already persist through ingestion;
no guessed dates, data backfill or schema migration is needed. The issue date on
the [official Bausch & Lomb letter](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/bausch-lomb-inc-732398-09042026)
agrees with the retained `2026-09-04` value.

- “How many FDA warning letters were issued in 2025?” and the August 2026 posting
  count went to model-only conversation and incorrectly claimed data access was
  unavailable. Dates in mixed content questions were not turned into filters.
- “Give two specific quality-unit oversight findings…” also missed retrieval:
  the planner recognized singular “finding” but not “findings.”
- Metadata requests repeatedly returned 502 or an incomplete stream. Railway
  logs show the API restarting during these attempts. The old path materialized
  full versions and chunks for every record merely to count metadata. This is
  a credible memory-pressure cause; no out-of-memory diagnostic was available.
- The source panel showed an unlabeled issue date and omitted the posting date.
  Parsing date-only strings into local timestamps could shift the calendar day.

## Changes

The metadata path deterministically interprets common English/Korean calendar
queries, counts all matching accessible records, groups by year/month/country/
office, orders by the selected date, and cites a clearly limited sample. It keeps
issue and posting dates separate. Relative periods use the server's UTC date.
Typed dates intersect selected filters and apply to content retrieval too.
Country filters now travel through both JSON and streamed request/response paths.
Stored dates are supplied to grounded model generation alongside excerpts.

Authorization still checks current in-scope, available documents, current chunk
versions and chunk ACLs. Metadata authorization reads lightweight fields; complete
source text/version data is loaded only for displayed citations. This changes
neither the authorized corpus nor private conversation ownership. Repeated year
follow-ups retain the metadata operation instead of counting only a prior sample.

The UI labels issue and posting dates explicitly, preserves literal calendar days,
labels structured source metadata separately from quoted passages, and shows the
actual date/country filters on each answer. Keyboard focus, motion and neutral
input styling remain intact.

## Questions and limits

Supported examples include year and month counts, ISO date ranges, calendar
quarters, last month/year, the last N days, one recipient country, company dates,
latest/oldest lists, grouped counts and date-constrained content questions.

- Exact counts of letters **mentioning a topic** require complete content review.
  A small semantic retrieval sample cannot establish a total; Chat now says so.
- Fiscal years and ambiguous numeric dates such as `03/04/2025` require explicit
  start/end dates. Multiple disjoint periods or countries require separate queries
  or a grouped count. Unsupported week/relative-quarter syntax asks for dates.
- Counts describe accessible saved FDA **Drug** warning letters, not all FDA
  warning letters worldwide. Lists honor the source-display cap; counts do not.
- A shared period with both “issued” and “posted” needs a chosen date basis.
  Conflicting selected filters are surfaced rather than silently widened.

## Local verification

- Production build/TypeScript and frontend/backend lint pass; 99 web unit tests pass.
- 221 distinct backend cases pass across the recorded runs, covering metadata,
  ingestion/parsing, chat state, routing, source focus, streaming and provider
  validation. New metadata regression coverage includes authorization-compatible
  counting, exact totals beyond the citation cap, empty totals, date intersections,
  repeat/idempotent follow-ups and unsupported-query behavior.
- 51 existing Chat/motion/workspace browser cases pass across Chromium, Firefox
  and WebKit. Nine new English/Korean metadata and draft-handoff cases pass in the same engines at
  desktop and 390/320px widths. The first new-test run used a nonpersistent API
  mock; router refresh correctly reloaded the old fixture. The loopback fixture
  now persists its completed answer, and all six targeted repeats pass.
- The first hosted after-test exposed a separate first-answer navigation race:
  typing a follow-up while the saved conversation route loaded could lose the
  draft. The composer now adopts its server-created conversation ID immediately.
  A regression holds that navigation open, types the next draft, then verifies it
  survives. All three browsers pass. Sending still waits for the current operation
  to settle, and never silently submits an unfinished draft.
- Desktop and narrow-phone source-panel captures were personally inspected.

## Publication

Application `2b8a176` is pushed and deployed; Vercel and both Railway integrations
report success. All 16 initial hosted after-requests return 200, including metadata
requests that previously restarted the API. Independent catalog comparisons match:
315 issued in 2025, 11 posted in August 2026, 19 India recipients issued in 2025,
58 issued in Q1 2025, and 767 total records grouped by issue year. Content questions
now retrieve cited passages, including the 2025 date constraint. The semantic
content-total request correctly states its limitation.

The follow-up revision preserves drafts during the first conversation handoff,
shortens count answers while keeping source inspection, and clarifies additional
ambiguous date forms. Its publication and final hosted interface checks are pending.
Baseline failures remain preserved.

## Evidence

- `.artifacts/chat-metadata/before/` and `before-repeat/`: actual baseline prompts,
  responses and timings in fresh private test sessions.
- `.artifacts/chat-metadata/catalog/`: all 767 catalog rows and date coverage.
- `.artifacts/chat-metadata/ui-before/`: first live interface attempt and failure.
- `.artifacts/ui-audit/browser/`: metadata screenshots in three engines.
- `scripts/audit_chat_questions.py`, `scripts/inspect_chat_flow.py`: repeatable live
  capture tools. They do not publish private test conversations or regenerate examples.
