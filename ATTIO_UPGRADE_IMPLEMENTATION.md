# Research-first production upgrade

Approved implementation scope, September 11, 2026. The source plan remains
`PHARMA_AGENT_OS_IMPLEMENTATION_PLAN.md`; current delivery evidence belongs in
`PHARMA_AGENT_OS_IMPLEMENTATION_HANDOFF.md`.

## Product decisions

- Account-free access to all personal workflow features; browser-session ownership
  applies to cases, conversations, drafts, execution, reviews, and exports.
- Personal acknowledgments are not independent QA approvals. Preserve the existing
  governed workflow and introduce a separately versioned personal workflow.
- Live FDA evidence and explicitly qualified synthetic internal evidence only.
- Draft-only integrations; global suspension and release promotion remain privileged.
- Preserve the attached Layered desk, Pretendard, indigo, existing icons, startup,
  responsive geometry, and scoped query cache.

## Delivery gates

1. Personal workflow policy, ownership checks, additive migration and isolation tests.
2. Explicit Research context, exact evidence bindings, retained view/save state.
3. Versioned typed results, safe components, reconnect and historical compatibility.
4. Worker specialist adapters, exact output validators, leases, budgets and recovery.
5. Immutable historical run inspection, personal review and labeled exports.
6. Observed independent evaluation, hosted qualification and service release gate.

Use existing Next/React/Pydantic/SQLAlchemy components, queue and provider integration.
Do not add a workflow canvas, replace orchestration, or enable external delivery.
All selected context is authorized and hydrated by the server; model output cannot
choose actor, ownership, permissions or persisted evidence versions.

## Verification and rollout

Exercise two-session isolation, stale review/context, denied evidence, contradictory
sources, malformed output, instruction injection, duplicate work, worker replacement,
cancellation races, provider failure and budget limits. Execute at least three
independent evaluation trials per case; fixture outcomes cannot qualify production.
Run frontend/backend/contracts/PostgreSQL checks and Korean/English browser coverage
at 1440/1280/1024/768/390px with reduced motion, keyboard, contrast and text scaling.
Retain performance baselines and regression gates. Deploy additive database changes,
compatible API/worker, then frontend and separately gated personal execution.
Rollback disables new execution while retaining readable history. Never report
production qualification from local tests or synthetic fixture outcomes.

## Status

Partial upgrade deployed on 2026-09-11. This is not full agent-production qualification.
Release evidence: `docs/assurance/attio-upgrade-deployment-20260911.md`.

Implemented: Research passage picker and immutable server-hydrated context in existing
checkpoints; idempotency/context binding; SQL ACL filtering before ranking; evidence
revalidation before model dispatch and tool calls; typed finding support and limitations;
frontend result validation; owner-authorized historical run inspection; separate draft
personal-workflow contract and scoped ownership/plan/step acknowledgment policy.
Research input waits for hydration so WebKit cannot lose pre-hydration typing.

The personal workflow remains DRAFT with execution disabled, and
`PERSONAL_CASE_ENABLED` defaults to false. Do not enable it from this checkpoint.
The existing independent-QA workflow remains unchanged in the contract inventory.

Remaining delivery work: complete personal case UI and artifact acknowledgment/export
semantics; qualify a public synthetic internal corpus; wire actual specialists into
the worker with durable usage/fencing; add exact output validators for remaining steps;
execute independent release-grade evaluations; sanitize public operations summaries;
finish all-surface interaction coverage and full personal-workflow hosted qualification.
The current changes do not complete the approved six-gate upgrade.

Verification: production web build, lint, TypeScript and all 94 frontend unit tests
passed. The new browser journey passed Chromium/Firefox/WebKit at all five reference
widths, including retained selections after a failed save. A WebKit hydration failure
was reproduced and fixed before the successful run. The broad backend run passed
598 tests with 10 existing gated skips before final focused additions; final focused
verification is recorded in the authoritative handoff. Contract validation passes
including the new separate personal-workflow schema. PostgreSQL ACL-expression execution passed eight read-only cases against the current
production database. Hosted rollout and provider smoke results are recorded separately
in the release evidence; these do not qualify the full personal-agent workflow.
