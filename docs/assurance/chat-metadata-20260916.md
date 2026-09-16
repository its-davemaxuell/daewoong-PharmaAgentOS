# Chatbot metadata and interaction testing

Date: September 16, 2026. Scope: Chat question routing, retained FDA metadata,
source inspection and the existing English/Korean interaction flow.

**Follow-up:** Several limitations below were subsequently repaired. See
[the response repair record](chat-response-repairs-20260916.md) for literal mention
counts, fiscal calendars, multiple countries/periods and clarification follow-ups.
This document preserves the original testing checkpoint.

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

| Tested question | Result after repair |
| --- | --- |
| How many FDA warning letters were issued in 2025? | 315 accessible saved letters |
| How many were posted in August 2026? | 11, using posting dates rather than issue dates |
| How many were sent to companies in India in 2025? | 19 |
| 2025년 1월부터 3월까지 발행된 FDA 경고서한은 몇 건인가요? | 58 |
| Show the five most recently issued FDA warning letters with their issue dates. | Five records in descending issue-date order |
| Which is the oldest FDA warning letter in the saved library? | 2023-09-11 |
| Count the saved FDA warning letters by issue year. | 60 / 172 / 315 / 220 for 2023–2026 |
| Find FDA data integrity findings in letters issued in 2025, with citations. | Content retrieval with all returned citations constrained to 2025 |
| How many FDA warning letters were issued in 2099? | Zero; no invented records |

These are a September 16 catalog snapshot, not fixed future totals.

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
  survives. Adding a focus assertion exposed focus loss after remount; restoration
  now waits until the composer is enabled. All nine final targeted cases pass in
  Chromium, Firefox and WebKit. Sending still waits for the current operation
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
ambiguous date forms. Revision `eabd341` is deployed. Its final 21-request API run
returns HTTP 200 for every case, and all 20 independent response/catalog checks
pass. Extra cases cover fiscal years, ambiguous/invalid dates, multiple countries
and an unknown company. Metadata requests have a median duration of 6.39 seconds
in this run; first conversation creation adds time. Revision `c5a0bb5` additionally
restores draft keyboard focus. Vercel and both Railway services report successful
deployment of this revision. Web health and API readiness return 200; the API
reports database and object-store checks healthy. Baseline failures remain preserved.

## Hosted interface results and remaining observations

Six fresh browser sessions exercise English/Korean in Chromium, Firefox and
WebKit. All six complete the initial metadata answer, a 2025 count of 315, a
2024 follow-up count of 172, and a reload retaining all three turns. Source-panel
focus/Escape, draft preservation, Enter/Shift+Enter, empty-submit protection and
768/390/320px overflow checks pass. All captured HTTP responses are below 400.
Desktop and phone answer/source captures were personally inspected. An additional
WebKit Korean repeat waits for source-panel entry/exit animations to settle before
capture; its same functional checks also pass.

Chromium and Firefox runs have no page errors. **WebKit is not a clean console
pass:** both language runs emit access-control messages for background Next.js
menu-prefetch requests during hard reload. Instrumentation puts all 17 messages
in the English repeat in the reload phase, alongside cancelled requests; the
chat still completes and reloads its history. Waiting for network idle before
reload does not eliminate these messages. A minimal same-origin fetch/reload
control reports cancelled requests without page errors, so ordinary cancellation
alone is not a proven explanation. This remains an isolated browser/prefetch
follow-up, not an observed failing chatbot question. Errors are retained in the
evidence; the audit deliberately exits nonzero on them rather than suppressing them.

First-answer transport including new conversation creation takes 18.8–21.4 seconds
in these hosted runs. Standalone metadata requests have the 6.39-second median
above. The interaction and draft recovery are improved; server response latency
still has room to improve.

Code security and nine quality jobs pass at the publication checkpoint, including
backend, frontend, containers, schema, contracts and deployment rendering. The full
CI browser job is still running; only the completed focused browser runs are
claimed as passing here.

## Evidence

- `.artifacts/chat-metadata/before/` and `before-repeat/`: actual baseline prompts,
  responses and timings in fresh private test sessions.
- `.artifacts/chat-metadata/catalog/`: all 767 catalog rows and date coverage.
- `.artifacts/chat-metadata/ui-before/`: first live interface attempt and failure.
- `.artifacts/chat-metadata/after-final/` and `after-final-verification.json`:
  21 real requests and 20 independent result checks.
- `.artifacts/chat-metadata/ui-verified/`: six hosted sessions, screenshots and
  WebKit reload diagnostics; `ui-settled-reload/`: additional WebKit control.
- `.artifacts/chat-metadata/webkit-reload-control.json`: minimal same-origin
  fetch/reload control result.
- `.artifacts/ui-audit/browser/`: metadata screenshots in three engines.
- `scripts/audit_chat_questions.py`, `scripts/inspect_chat_flow.py`: repeatable live
  capture tools. They do not publish private test conversations or regenerate examples.
