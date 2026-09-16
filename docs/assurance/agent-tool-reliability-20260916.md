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
- Final research regression including usage-overrun protection: 52 passed.
- Web production build, TypeScript, lint and 99 unit tests pass.
- 15 Chromium/Firefox/WebKit checks pass for research context, source inspection,
  chat metadata and first-answer draft preservation, including phone layouts.
- Docker is unavailable locally; fresh PostgreSQL/Temporal recovery qualification
  is delegated to the existing isolated CI jobs. SQLite is not proof of locking.
- Evidence: `.artifacts/agent-workflow/`, including JUnit reports and failure probes.

Deployment and actual hosted research-run results will be recorded after publication.
