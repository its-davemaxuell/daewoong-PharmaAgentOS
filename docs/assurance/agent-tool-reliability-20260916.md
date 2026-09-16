# Agent workflow and tool reliability

## Scope and reproduced failures

This audit covers the five native Research Agent tools and 16 private MCP tools.
Chat's deterministic metadata routing remains covered by its existing tests. The
specialist case platform remains a reference implementation with the production
qualification limits recorded in the implementation handoff.

Four new baseline probes failed before the fix: three malformed provider-output
shapes escaped as `AttributeError`, and a fresh read of an unavailable passage
returned the old retained text as success. The existing baseline suite passed,
showing why explicit failure injection was necessary.

Inspection also found unchecked saved-result replay in the knowledge/workflow
gateways, missing aggregate result limits and declared deadlines not applied to
those dispatchers. These paths now reject corrupt results, stale permissions,
oversized results and invalid draft output.

## Runtime changes

- Research checkpoints the exact pending tool action before executing it. Slice
  interruption/resume retains its native call ID and avoids another planning call.
  Tool observations, checkpoint state and terminal outcomes commit together.
- Identified malformed arguments receive corrective observations. Malformed provider
  envelopes and reused call IDs stop safely without exposing raw error bodies.
- Temporary model/network failures get at most two attempts, each charged before
  dispatch and fenced by the current run lease. Authentication, invalid requests and
  quota/billing errors are not automatically retried. Retry-After delays over five
  seconds leave a resumable failure instead of retrying earlier than requested.
  This follows the provider's [error guidance](https://developers.openai.com/api/docs/guides/error-codes).
- Each model call has a 60-second deadline. Source operations have 10 seconds and
  at most two attempts for search/read. Stop is rechecked before the next attempt.
  Unexpected tool failures receive sanitized, persisted observations.
- Actual reported usage above the reservation is recorded before stopping an
  over-budget run. Three identical failed actions stop early; existing 12-call,
  90,000-token, four-search, 12-source and two-check budgets remain.
- Missing passages are explicitly reported and removed from retained evidence.
  Citation IDs are never reassigned to another source after a removal.
- Knowledge/workflow results are schema-validated and capped at 40,000/12,000
  characters. Dispatch has a 10-second deadline. A saved result must match its
  tool, version, actor and recorded hash; knowledge replay rechecks source ACLs and
  version hashes, and metadata replay rechecks access.
- Draft creation and result validation share a transaction. Invalid output rolls
  back the draft. Same-action replay returns one retained draft; no delivery is
  introduced. Private draft dispatch is not automatically retried.
- The Research interface uses short English/Korean reconnect/retry labels. Detailed
  tool-completion records remain available in the trace without duplicating every
  row of the visible activity list.

Research retains one native function call at a time, strict schemas and matching
call/result IDs, consistent with [function calling](https://developers.openai.com/api/docs/guides/function-calling).
Its evidence review remains a separate model check, plus deterministic citation,
authorization, version and hash checks. This cannot guarantee factual perfection.

## Tool assessment

| Tool | Purpose and boundary | Verification |
| --- | --- | --- |
| `plan_research` | Save 2–5 bounded steps | Language/argument errors, interruption recovery |
| `search_sources` | Read current public Drug passages | ACL filtering, timeout, repeat limit, alternative searches |
| `read_sources` | Retain searched/selected passages | Selection boundary, missing source, hash/current-version checks |
| `submit_brief` | Check a cited review draft | Invalid citations, revision loop, verifier outage, atomic completion |
| `report_no_evidence` | Explain an unsuccessful search | Requires two searches; real empty-search terminal path |
| `regulatory.get_version` | Exact pinned metadata | Existing gateway integrity/authorization suite |
| `regulatory.get_section` | Bounded pinned section | Exact section path and source pins |
| `regulatory.get_anchor` | Retained source anchor | Anchors, stable idempotency and injection quarantine |
| `regulatory.compare_versions` | Compare authorized versions | Existing typed-result and scope tests |
| `regulatory.search_regulatory_references` | Bounded retained reference lookup | Existing allowlist/budget suite |
| `knowledge.search_assets` | ACL-filtered internal search | Real approved invocation and saved-result replay |
| `knowledge.get_asset` | Impact-agent asset read | Real repository dispatcher; denied to knowledge specialist |
| `knowledge.get_document_version` | Versioned document read | Real approved invocation/replay |
| `knowledge.get_anchor` | Internal evidence passage | Real approved invocation/replay |
| `knowledge.get_revision_history` | Revision metadata | Real approved invocation/replay |
| `knowledge.get_related_assets` | Authorized related assets | Real approved invocation/replay |
| `workflow.create_internal_notification_draft` | Internal draft only | Actual approved invocation/replay, no duplicate draft |
| `workflow.create_email_draft` | Email draft only | Actual invocation/replay and invalid-result rollback |
| `workflow.create_collaboration_draft` | Teams/Slack draft only | Actual approved invocation/replay |
| `workflow.create_task_draft` | Task draft only | Actual approved invocation/replay |
| `workflow.read_document_metadata` | ACL-filtered metadata only | Actual approved invocation/replay |

All 21 input contracts reject extra runtime identity/command fields. Private
authorization, approvals and source pins remain host-controlled. Full private
workflows are tested against fictional local fixtures; this does not claim a live
corporate system qualification or external message delivery.

## Verification and publication

- Expanded backend regression: 157 passed, one Temporal-server-dependent skip.
- Final research regression including usage-overrun protection and objective relevance:
  56 passed.
- Follow-up private-tool bounds and replay regression: 35 passed. Knowledge warning
  and anchor bounds now match the published contract.
- Web production build, TypeScript, lint and 99 unit tests pass.
- 15 Chromium/Firefox/WebKit checks pass for research context, source inspection,
  chat metadata and first-answer draft preservation, including phone layouts.
- The isolated CI PostgreSQL concurrency/schema and Temporal recovery jobs pass on
  application `bbe3000`, as do full backend, contracts, frontend and container jobs.
  The full CI browser job was superseded by the follow-up push. Docker is unavailable
  locally; SQLite was not used as proof of locking.
- Evidence: `.artifacts/agent-workflow/`, including JUnit reports and failure probes.

### Hosted review and relevance correction

Application `bbe3000` deployed successfully to Vercel, Railway API and Railway worker.
Two actual Chromium runs completed in English and Korean with two cited findings each.
The Korean run stopped and resumed successfully and corrected invalid citations from a
persisted tool observation. Source inspection, saved-run reload and 390px overflow checks
passed without page errors. Execution took approximately 127 seconds in English and
181 seconds in Korean (including its stop/resume interval).

Manual review rejected the Korean output despite those mechanics passing: it cited
generic CGMP/import-refusal passages for a data-integrity comparison. Search over-weighted
corpus boilerplate, and the evidence reviewer had never received the original objective.
The fix filters boilerplate, boosts adjacent topic phrases, shows snippets around matches,
and supplies concise local-search guidance. Completion now requires an explicit
`answers_objective` result from the independent evidence review. The review uses medium
reasoning with a bounded 3,000-output-token reservation. A low-reasoning prompt-only
attempt still approved the bad answer and was rejected during qualification.

The corrected reviewer was tested against both real outputs: it accepted the relevant
English brief and rejected the unrelated Korean brief. Regression tests cover topic
ranking, exact snippet offsets and refusal to complete a factually supported but unrelated
draft. Fresh hosted runs of the corrected pipeline are recorded below.
Artifacts: `live/`, `relevance-live-review.json` and `relevance-final.xml` under the evidence
directory above. The initial Korean output is failure evidence, not a successful example.

The first corrected hosted run (`88575ce`) retrieved concrete fabrication/missing-record
passages from Brassica and Shoolin and completed the requested comparison in six model
calls. It also rejected an unknown source ID and recovered using returned search IDs.
Desktop/mobile, source-panel close and saved-run reload checks passed without page errors.
Manual review then caught a smaller factual error in a limitation: a sample-collection
date was called a manufacturing date. The expanded model review alone still missed it.
The tool contract now requires evidence-gap caveats without digits; numerical/date claims
belong in cited findings, where date meanings must be preserved. Both finding-level and
brief-level validation enforce this, with English/Korean regression coverage. Review
instructions also cover factual assumptions inside questions and limitations. This is an
explicit limit of model-only review, not evidence that AI factual checking is infallible.

### Final publication and live qualification

Application `f39b090` is pushed/deployed. Vercel, Railway API and Railway worker report
success; web/API health checks return 200. Two final Korean tasks completed with relevant
data-integrity comparisons after the caveat correction:

- Unipack/Shiva: five model calls, three findings and two cited passages. A read-only
  check of this exact task confirmed completion after the browser harness lost its
  polling connection to an `ECONNRESET`. This is completion/recovery evidence, not a
  completed browser qualification. The interface already retries transient poll errors.
- Fareva/Yangzhou: six model calls, two findings and two cited passages. Execution took
  168 seconds; the full browser check took 206 seconds including navigation/reload.
  The model corrected invalid citation IDs through the runtime feedback. Personally
  checked both claims against their retained passages: non-contemporaneous microbiology
  records and missing/rewritten original data. Desktop/390px checks, source inspection
  and closing, saved-run reload and the caveat contract pass with no page errors.

The harness now saves its own session locally and retries connection resets, so restarting
the probe can inspect the same task without submitting a duplicate. Evidence is under
`live-confirmed/`, `interrupted-browser-run.json`, `whole-draft-final.xml` (56 tests),
and `private-complete.xml` (35 tests). Session-state files are private ignored artifacts.

Full backend, PostgreSQL/schema, Temporal recovery, contracts, frontend build/unit/lint,
container scans and secret scan jobs pass on `f39b090`. The full
[browser CI run](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/35068276408)
reports **373 passed and 11 failed**, so the aggregate quality workflow fails. Remaining
checks: the outdated Icon credits heading (three browsers), Firefox example selection,
WebKit menu fade, two WebKit press-interpolation checks, three WebKit cached-inspector
latency checks, and WebKit workspace-search request timing. These are recorded as
unresolved frontend work; the 15 focused research/chat checks are not a substitute for
a full UI pass. Raw failure evidence: `ci-browser-failure.log`.
