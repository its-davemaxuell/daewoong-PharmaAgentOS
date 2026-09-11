# RAG Chat and Research product refinement — 2026-09-12

The user identified RAG Chat and Research Agent as the main service, requested all
menus in the left sidebar, animated loading and smooth tab/selection feedback,
and asked for commercial chat usability, evidence workflows and reporting. The
user subsequently declined company identity setup.

## Delivered behavior

- `/` opens `/ask`; RAG Chat and Research Agent are the first sidebar destinations.
  Every authorized supporting page has a direct sidebar link. Existing server
  authorization remains authoritative. Role-restricted admin/reviewer links remain
  filtered. The sidebar scrolls and retains the mobile drawer and collapsed rail.
- Shared loading statuses use a blue spinner and a localized screen-reader label.
- Route and view changes animate the persistent main content for 200ms without
  remounting children. Shared selection indicators move between navigation and
  view controls; source rows tint on selection. Reduced motion removes movement.
- Chat has a full workspace canvas, readable transcript, persistent composer,
  explicit source selection, discoverable conversation exports, and in-chat find.
  Find scrolls the existing transcript and preserves keyboard focus and messages.
- Copy includes numbered citations and source/version references, with invalid
  FDA links marked unavailable. Existing evidence coverage and review labels stay.
- Research handoff retains only the selected question in the tab-local draft and
  navigates to Research Agent. Starting a server job remains a separate action.
- `/usage` displays verified-owner activity for the last 30 days and exports CSV.
  The backend aggregates recorded requests and research calls/tokens; it accepts
  no caller-selected owner or team. Chat token cost is not inferred.

## Scope boundaries

No identity, schema, dependency or permissions changes. Browser-session access
remains as requested. Sharing uses existing Markdown/JSON exports. Named shared
conversations, team memberships and team-wide reports are deferred with company
sign-in setup. This is a product improvement, not an enterprise qualification.

## Verification

- Frontend: 95 tests pass; TypeScript, ESLint and production build pass.
- API: 7 focused ownership, history, feedback, export, branch and usage tests pass.
  Usage tests cover a second owner, caller-supplied owner parameters, old activity,
  empty activity and exclusion of private transcript text.
- Ruff and contract validation pass. Design detector reports no findings for the
  changed core navigation, chat, loading and reporting surfaces.
- Initial Chromium run: 19/20 passed. The usage test incorrectly matched Next's
  route-announcer alert; it now waits for the actual workspace error and passes.
- Final cross-browser verification and deployment status are recorded below.

Local visual artifacts are in `.artifacts/chat-product/`: chat desktop, chat
mobile, conversation desktop/mobile and navigation mobile screenshots. Browser
reports and traces use the existing `.artifacts/ui-audit/` output directory.

Final focused browser run: **24/24 passed** across Chromium, Firefox and WebKit,
covering direct navigation, chat search, research draft handoff, accessible/reduced
loading, usage failure/retry/download, route/selection motion, English/Korean
geometry at 1440, 1280, 768 and 390px. The earlier full Chromium motion/navigation
run passed all its other 19 checks. A previous CI WebKit test matched a hidden
outgoing research tree; research-goal assertions now select the visible field.


## Deployment verification

Application revision `bf43bf9` is deployed at
https://pharmaagent-os-ochre.vercel.app/ask. Vercel and both Railway services report
successful deployment. Web health and API readiness return 200; database and
object-store checks pass.

Hosted English/Korean checks pass **6/6** across Chromium, Firefox and WebKit,
including the default Chat route, the two primary sidebar destinations, enabled
composer, mobile menu and Usage link. The real `/api/usage` returns the personal
report with `Cache-Control: private, no-store`; the hosted CSV download succeeds.
No chat messages or research jobs were created during hosted verification.

An additional mobile Research regression run passes **3/3** across the browsers
(27 focused final local checks in total). GitHub code-security passes. The quality
workflow's frontend, backend, containers, PostgreSQL, Temporal, contracts, secret
scan and deployment-render jobs pass; its full browser suite is still running:
https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34618758140.
