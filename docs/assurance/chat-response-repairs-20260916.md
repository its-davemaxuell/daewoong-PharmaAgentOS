# Chatbot weak-response repairs — September 16, 2026

## Reproduced problems and repairs

- Every content-count question was rejected, even explicit word/phrase mentions.
  Literal mention counts now search all accessible current source chunks, count
  each letter once, and select actual matching citation passages.
  The answer states the searched phrase; it does not label mentions as proven violations.
- Company-count questions returned letter totals. They now count distinct stored
  company names, ignoring case and repeated whitespace; they do not infer corporate
  ownership or merge differently named subsidiaries.
- Country pairs and disjoint date periods were refused. They now select unions
  and return separate counts, including zero groups. Intervening years are excluded.
- Fiscal years, fiscal quarters, past N months, last week and last quarter were
  refused despite stored dates. They now resolve to displayed calendar boundaries.
  FDA fiscal years use October 1 through September 30, labelled by the ending year,
  as documented in [FDA's FY2025 financial report](https://www.fda.gov/media/190773/download).
  Weeks start Monday; past N months is a rolling range through the current UTC day.
- Short replies to date-basis, date-format, count-unit and literal-phrase
  clarifications lost the prior operation. They now retain its date, country and
  count context. Quoted search phrases cannot silently become date/country filters
  or select only the company whose name appears inside the phrase.
- Plain English mention phrases no longer need a fixed topic dictionary. A partly
  recognized compound topic is clarified instead of silently counting just one
  recognized word. A generic semantic topic cannot fall through to an unfiltered count.

The existing current-version, source-availability, FDA Drugs scope, category and
chunk ACL checks remain in force. Counts are over the accessible saved library.
PostgreSQL performs literal regex matching before transferring lightweight rows;
the SQLite development fallback streams source bodies in bounded batches. Full
versions are loaded only for selected citation chunks. No schema migration or
public example changes.

## Verification

| Question | Verified saved-library result |
| --- | --- |
| How many letters mention contamination? | 280, with matching source excerpts |
| How many issued in 2025 mention data integrity? | 21 |
| How many companies received letters in 2025? | 311 distinct recorded names; the letter total is 315 |
| India and China, 2025? | 43 total: India 19, China 24 |
| Compare 2024 and 2026 counts. | 172 and 220; 2025 is excluded |
| Fiscal year 2025? | 277, using 2024-10-01 through 2025-09-30 |
| Q1 FY2025? | 41, using October–December 2024 |
| Past three months? | 58 on the September 16 audit date |
| Last quarter? | 118 |
| Last week? | Zero; an empty result is valid |

These totals describe the audited snapshot, not fixed future values.

- 15 real baseline requests retained under `.artifacts/chat-repairs/before/`.
- 158 focused backend tests pass across metadata, existing RAG, conversation
  persistence, source focus and streaming. App/test Ruff checks pass.
- Controlled tests cover repeated matches, line breaks, whole-word boundaries,
  restricted text, citation caps, empty results, selected dates, multiple countries,
  disjoint periods, clarification chains and company-versus-letter totals.
- `scripts/check_chat_repair_counts.py` uses a read-only production transaction and
  independent SQL aggregation. It never prints/saves credentials or source bodies.
  Its 767-record snapshot finds 280 letters mentioning contamination, 104 of those
  issued in 2025, 21 issued in 2025 mentioning data integrity, and zero for the
  deliberately nonexistent phrase.
- `scripts/audit_chat_repairs.py` captures real answers; `scripts/verify_chat_repairs.py`
  compares them to the independent snapshot and checks matching citation excerpts.

## Publication

Application `1c73a74` is deployed; all three deployment integrations succeed. All
15 real question reruns return 200, and all 18 independent count/clarification/
citation checks pass. Chromium English completes a four-turn flow: ambiguous date
clarification, correction returning 269 letters, contamination count 280, then
2025 follow-up count 104. All four turns survive reload, matching source excerpts
open correctly, and 768/390/320px layouts have no horizontal overflow.

The first hosted mention count took 25.58 seconds while transferring small batches
of text over the database network. The follow-up moves PostgreSQL
matching into the database and increases batches for lightweight rows. Six
read-only PostgreSQL pattern checks cover case, line breaks, word boundaries and
literal regex punctuation. The optimized path is included in the final deployment below.

Application `7762aa3` also deploys successfully. Its 15-question repeat passes all
24 independent checks, including each country/period subgroup. The contamination
request drops from 25.58 to 7.94 seconds; the nonexistent phrase drops from 22.91 to
6.00 seconds. Firefox Korean passes the same four-turn browser flow with zero page
errors. Final plain-phrase guards are deployed in `41d3e7b`; Vercel and both Railway
services report success. Its expanded 19-question matrix returns 200 for every
request and passes all 28 independent checks. The final contamination request takes
7.61 seconds, with the same 280 total. A 2025 text mention of India returns 23,
distinct from the 19 letters addressed to India. Web/API health return 200.

WebKit Korean completes all four answer, follow-up, reload, source-focus and
768/390/320px overflow assertions. Its existing hard-reload menu-prefetch console
issue recurs (15 messages, all in the reload phase); the audit exits nonzero and
retains those diagnostics. No HTTP errors, failed questions or lost answers occur.
This is not claimed as a clean WebKit console pass. Chromium English and Firefox
Korean have zero page errors. Final phone and desktop source/answer screenshots
were personally inspected.

Code security and nine quality CI jobs pass at the `41d3e7b` checkpoint, including
the full backend suite, frontend build/tests, both containers, schema and contracts.
The full CI browser job is still running at this checkpoint.

Evidence: `.artifacts/chat-repairs/after-final/`, `after-final-verification.json`,
`independent-counts.json`, and `ui/` / `ui-final/`. Earlier baseline and slower
after-runs remain preserved. Repeat captures use private isolated sessions.

## Intentional remaining boundaries

Ambiguous numeric dates require the user to identify the date. An exact count of
confirmed topic violations or individual observations needs a defined classification
and complete review; a word occurrence cannot establish that. The chatbot now asks
a specific clarification and can complete the corresponding literal/letter count
after the reply. Explicitly negated mention searches still ask for clarification.
