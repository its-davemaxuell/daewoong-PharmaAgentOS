# Attio upgrade deployment ? 2026-09-11

This release publishes the implemented Research/context and saved-run inspection
scope. It does not complete or qualify the full six-gate personal-agent upgrade.

## Release sequence

- Previous application baseline: `00a6978`.
- Backend/API and worker first: `7059df9`.
- Frontend after hosted API readiness/context verification: `c043010`.
- Provider schema correction: `ce5d3c2`.
- Long-source-anchor layout correction: `8d0c9a2` (final application revision).
- Website: https://pharmaagent-os-ochre.vercel.app/research
- API readiness: https://daewoong-pharmaagentos-pharmaagentos.up.railway.app/health/ready
- GitHub integrations report success for Railway API, Railway worker and Vercel
  on the final application revision. No database migrations or feature enabling
  were needed; existing Research JSON checkpoints store the new context.

## Verification

- Frontend: 94 unit tests, lint, TypeScript and production build passed.
- Backend: final CI passed 600 tests with 10 gated skips (76% coverage). Initial
  boundary suite: 22 passed. Provider correction suite: 23 passed; Ruff passed.
- Contracts: 13 Agent OS schemas, six positive case fixtures and 16 MCP tools pass.
- PostgreSQL: eight read-only ACL cases passed on the current Supabase database;
  live public-source query returned eight accessible passages.
- Hosted API: readiness/context 200, unknown run inspection 404, personal case
  creation 503 (disabled).
- Live Research after the provider correction: run
  `c9033ce1-e205-48f8-8520-2f2b929dac2e` completed in seven model calls with one
  schema-v2 finding. All citable sources belong to the selected passage. Context
  hash persisted unchanged; a repeated create returned the same run/context;
  a separate browser session received 404 for the run.
- Browser regression: Chromium, Firefox and WebKit passed the selected-context
  journey at 1440/1280/1024/768/390px, including long source anchors, reduced motion
  and preservation after a failed submission.
- Hosted browser: six English/Korean desktop/mobile checks passed across Chromium,
  Firefox and WebKit with live evidence search/add/remove, retained objective, no
  page errors and no horizontal overflow. The final WebKit mobile check ran after
  the anchor fix; the other five checks passed before that CSS-only correction.
- Final CI: [quality and security](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34574971087)
  passed all ten jobs, including the full browser/startup suites, backend,
  PostgreSQL, contracts, secret scanning and both runtime-image scans.
  [Code security](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34574971034)
  also passed. These results are for final application revision `8d0c9a2`.

Local evidence and probe scripts: `.artifacts/attio-deploy/` (ignored), including
`backend.json`, `research-smoke.json`, `research-smoke-before-fix.json`,
`browser-smoke.json` and browser screenshots. No credentials are in this report.

## Findings resolved during rollout

1. The first live model request failed with `invalid_function_parameters`: the
   existing strict-schema converter did not visit `$defs`, leaving the new
   defaulted finding fields outside `required`. Converted referenced definitions,
   added a provider-request regression assertion, verified a real model planning
   call, redeployed, and completed the hosted Research task. The failed smoke run
   remains preserved as history; it was not represented as a successful result.
   [OpenAI strict-schema requirements](https://developers.openai.com/api/docs/guides/structured-outputs)
2. A long FDA source anchor overflowed on mobile WebKit. Added wrapping to source
   result articles. A long-anchor fixture reproduced the failure in Firefox and
   WebKit against the prior build; all three browsers passed after rebuilding.
3. The first browser script filled text before startup completed. Waiting for the
   entered startup state matched the usable interface and retained the objective;
   this needed a probe correction, not an application change.

## Remaining boundary and rollback

`PERSONAL_CASE_ENABLED` remains false; the personal workflow is DRAFT with
execution disabled. Specialist worker adapters, complete personal artifact review
and UI, synthetic internal corpus qualification, independent production evaluations
and public operations summaries remain incomplete. One live Research smoke is not
release-grade qualification of those features.

The change is schema-compatible. For an application rollback, use the previous
baseline for API/worker and frontend, preserve Research history and existing schema,
and repeat readiness/ownership checks. Do not delete saved contexts or enable the
personal workflow to work around a failure. The source plan and authoritative
handoff remain the current guide for the unfinished upgrade.
