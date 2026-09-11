# Evidence-continuity UI upgrade — 2026-09-11

The release replaces the page collection presentation with a persistent compact workspace. The overview uses real retained collection and personal-work data; evidence inspection, AI questions and source comparison preserve the underlying route.

## Behavior and implementation

- `continuity.css` and central tokens define the compact neutral/blue system. The shell remains mounted during internal navigation, preserves collapse preference and uses native modal navigation on mobile.
- Overview panels use independent React Query queries. Source failure does not block navigation or other work; cached activity stays visible. Unavailable values are not represented as zero.
- AI is lazy-loaded on first opening. Case/general conversations remain mounted while navigating or closing the panel. Distinct draft keys and component IDs prevent collisions with standalone chat. Source pills and retrieval filters show the effective conversation context.
- Citation inspection keeps the current finding view visible and exposes the matching stored source section, version and original URL. Missing sections are explicit. This is HTML/section evidence navigation; no PDF page coordinate is fabricated.
- Comparison preserves up to four source selections in session storage and displays stored metadata side by side. No inferred similarity score, company outcome or compliance conclusion is introduced.
- Review triage and formal approvals retain separate semantics. Formal review links remain available inside Reviews; no viewer receives approval authority.
- The historical full-screen preparation gate is opt-in through `PORTAL_LEGACY_STARTUP_ENABLED=true`.

## Validation record

Production build, TypeScript, lint and 94 unit tests passed. The broad browser run exercised 234 scenarios: 230 passed immediately and four WebKit scenarios required fixes. The final targeted run passed 26 of 27 checks; the remaining conversation-dialog case was traced to the HTTP fixture rotating its Secure-cookie identity on Server Actions. With the shared stable-session fixture, that case passes in Chromium, Firefox and WebKit (3/3). No errors are suppressed: cold geometry samples now use separate pages, and the transient inert check reads one DOM snapshot. Startup and deployment evidence is recorded below when complete.

Local cached-inspector p95 useful-content timing: Chromium 55.7–56.4 ms; Firefox 68–74 ms; Windows WebKit 218–370 ms. All tests retained 20 DOM rows with collections of 100, 1,000 and 10,000. These pass the existing 500 ms regression ceiling; WebKit does not meet the aspirational 100 ms lab target. This is not field INP measurement. Before deployment, a fresh live Chromium session took 17.9 s to pass the old startup gate (`hosted-before.json`).

Visual evidence: `.artifacts/continuity-redesign/` and `.artifacts/ui-audit/browser/`. Browser records use a clearly fictional loopback API, never production mutations. Reviewed desktop and mobile overview; refined assistant geometry following independent finish review. Measurements here are local interaction checks, not field Core Web Vitals certification.

## Scope limits

The complete 90-section specification remains a product target. This release does not activate personal specialist execution, organizational identities, formal approval for anonymous users, PDF page virtualization, saved comparison artifacts, push notifications, or generated monthly reports. Those require corresponding data/authorization workflows; UI labels must not imply they exist.


Final local startup checks: **9/9 passed** across Chromium, Firefox and WebKit, including usable shell/commands while source data is held, local error recovery, and reduced-motion mobile navigation. The final dialog rerun passes **3/3** with stable fixture identity. The production build includes the final compact embedded-chat styling, opener focus preservation, truthful comparison excerpts, error-vs-empty separation and matched nine-row loading geometry. Final TypeScript/build and zero-warning lint pass.

## Hosted deployment

Application revision `939ca22` is deployed at https://pharmaagent-os-ochre.vercel.app/dashboard. It includes `b91cc77` (core UI), `13629c1` (review-draft label), `e3bff68` (scrollable long-source previews), and the final source-heading wrap/compact typography adjustment. Vercel, Railway API and Railway worker commit statuses all report success. API readiness reports database and object store healthy.

The production smoke uses read/navigation and local draft actions only. Final matrix: five of six journeys passed initially; Korean WebKit encountered the existing server-side library error while opening the full reader. Its isolated repeat passed. An earlier Firefox run also encountered that local error and passed on repetition. These failures are retained, not suppressed or treated as a clean first-pass run. Intermittent hosted source retrieval remains an operational limitation to investigate separately; no backend latency improvement is claimed.

Successful hosted journeys cover the operational overview, a real FDA source preview, the full source reader, case-scoped assistant context, draft preservation on close/reopen, return to the evidence list, reduced-motion mobile navigation, focus restoration and absence of horizontal page overflow. All three browser engines pass in English and Korean across the final matrix and repeat. Successful final shell-visible samples range from 1.03 to 1.91 seconds. The old startup-gate baseline was 17.9 seconds; these are small lab samples with different startup conditions, not a controlled field Core Web Vitals result.

Artifacts: `.artifacts/continuity-redesign/hosted-final/results.json`, `hosted-recovery/results.json`, and associated desktop/mobile screenshots. The original failed smoke exposed the long-source scrolling defect, which was corrected and verified using the real production record. No CSS is injected by the final/recovery smoke.

CI for the final application revision: https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34593868941. Code security: https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34593868921.

Final CI result for `939ca22`: **success**. The complete browser suite passes **234/234** (13.8 minutes), startup suite **9/9**, frontend unit suite **94/94**, and backend suite **600 passed / 10 existing gated skips**. Lint, type checks, production build, contracts, PostgreSQL boundaries/restore, Temporal recovery, container checks and code security all pass. This final full run supersedes the local intermediate failure/rerun history above. Hosted intermittent retrieval failures remain separately disclosed.
