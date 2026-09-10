# Visual and motion upgrade — implementation ledger

Baseline: clean `main` at `13900606b83bd2b3c6fa4a31b60db4c571a13db3`, inspected 10 September 2026.
Authority: `DESIGN.md` Layered desk / composition A; workspace and intended-use boundaries in AGENTS.md and the implementation plan apply.

## Motion thesis and engineering budget

The authored interaction is a selected control moving within its recessed track:
navigation, language and source/view tabs share this relationship. Small local
panel transitions preserve context; button states acknowledge real actions.
Evidence, transcripts and long documents remain still. Research motion follows
new persisted events, never polling ticks or fabricated completion.

CSS owns ordinary controls and native disclosures. A small client motion boundary
owns selected indicators and selected presence interactions. Server pages,
forms, route identity, native selects and existing focus owners stay intact.
Target additional shared UI JavaScript: <=40 KiB gzip, including loaded feature
chunks. Baseline and after measurements use the same production server, fictional
API, viewport, browser and CPU/network settings. No performance claim precedes
measurement. Deployment is not needed to verify this pass locally.

## Route and component inventory

### Follow-up: visible transition continuity

User feedback on the deployed `a19d0c4` release identified imperceptible motion.
Browser inspection confirmed that the tab background traveled but its individual
stacking context could cover neighboring labels, while route changes had no local
arrival transition. The follow-up moves stacking ownership to the selection track,
uses a more readable 240ms selected-control trajectory, adds a 300ms/6px receiving
workspace transition without remounts, and increases panel opening to 260ms with
a quicker 200ms exit. Source tabs and specialist details retain full text opacity.
Initial load, streaming, polling and restored state remain still. Reduced motion
cancels active transitions immediately. No new dependency.

Verification: six new focused browser cases passed across Chromium, Firefox and
WebKit, including paused intermediate frames, rapid retargeting, persistent shell
identity, local text opacity and reduced-motion cancellation. The rebuilt full
suite passed all 54 cases across three browsers, including the mobile exit fix.
Normal-motion profiling results are recorded in the follow-up assurance record.

Status: **I** implemented; **V** reviewed route/interaction browser-verified; **R** reviewed and deliberately retained; **L** verification limitation. V refers to the documented fixtures, not every possible backend state or privileged branch.

| Surface / route | Actual components | Baseline issue / implemented visual and interaction work | States and invariants | Status |
|---|---|---|---|---|
| Root and portal layouts | I18nProvider, ChatHistoryProvider, PortalShell | Shared tokens, small motion boundary; preserve server root and provider identity | SSR, hydration, locale, skip link, session authority | I, V |
| Navigation / utility bar | PortalShell, LanguageToggle, PageGuide | Tracking selection, aligned controls, calm disclosure/drawer continuity | persisted groups, 980px boundary, collapse, Escape, focus return, lock, notification, no speculative prefetch | I, V |
| `/`, `/sign-in` | redirects to dashboard | Verify existing no-login redirects; do not invent authentication UI | public viewer boundary | I, V |
| `/dashboard` | BeginnerHome, ContinueWork, ResearchJourney, ServiceScope | Refine objective focus and tray hierarchy, row skeletons, actionable links | bounded preview, saved/empty/error, draft handoff without POST, storage failure | I, V |
| `/ask`, `/chat/[id]` | ChatWorkspace, ChatLibrary, ChatThreadTools, ChatEvidencePanel, ChatHistoryProvider | Composer, source/filter panels, menus, feedback, once-only new message entry | IME, streaming scroll, jump, cancel/retry, branching, draft, history, focus, unknown provenance | I, V |
| `/drug-letters` | LettersExplorer, SelectFilter, LetterBookmarkButton, SourceLink | Toolbar, chips, native filters, stable loading/results, bookmark feedback | one/zero/stale options, dates, URL/history, stale search, errors, 20-row bound | I, V |
| `/drug-letters/[id]` | LetterDetail, LetterBookmarkButton, SourceLink | Tracking tab selection, source text/index, bounded anchor highlight, generation controls | Original/Findings/Internal comparison; bilingual pending/errors, saved artifacts, versions | I, V |
| `/research` | ResearchWorkspace, ActivityRow, ResearchJourney, ServiceScope, SessionNotice | Real-stage indicator, new-event entry, source disclosure, saved runs and brief controls | queued/running/completed/stopped/failed/limit/insufficient, revisions, reconnect, exports | I, V |
| `/saved-views` | SavedLettersWorkspace (export in saved-views-workspace) | Saved list, removal, persistent feedback and empty state | server-associated bookmarks; truthful mutation outcomes | I, V |
| `/requests` | AgentHome (not dashboard), draft editor, SessionNotice | Draft tabs, forms, save receipts, edit/delete affordances | local storage, restoration, unsaved input, errors, export | I, V |
| `/cases` | CaseIndex, CaseAccessState, CaseForms | Register/filter hierarchy and consistent controls | empty/restricted/unavailable, roles, create pending and validation | I, V |
| `/cases/[caseId]?view=overview` | CaseWorkspace overview | Calm scope, source identity, next action | authority and immutable source bindings | I, V |
| `?view=plan` | CaseWorkspace, CaseForms | Plan and step disclosures/forms | exact plan version, draft/approved, unsaved/pending/error | I, V |
| `?view=execution` | CaseWorkspace, RunLiveRefresh | Real run rows and state hierarchy | live, stopped, failed; existing refresh semantics | I, V |
| `?view=impact` | CaseWorkspace | Readable hypotheses and evidence | unsupported/verified distinctions | I, V |
| `?view=review` | CaseWorkspace, CaseForms | Quiet decision panels and controls | confirmation, permissions, human decision bindings | I, V |
| `?view=integrations` | CaseWorkspace | Clear handoff drafts and disabled actions | no invented working integrations | I, V |
| `?view=evidence` | CaseWorkspace | Evidence tables and source reading | version/hash/links, empty/unavailable | I, V |
| `?view=history` | CaseWorkspace | Compact audit rows and metadata disclosures | stable event identity, no replay animations | I, V |
| `/review` | ReviewConsole | Review queue, forms, state hierarchy | restricted public viewer; authorized decisions remain server-enforced | R, V, L |
| `/approvals` | ApprovalsWorkspace, ReviewButton, ServiceState | Consistent filter/queue/feedback and status language | bilingual empty/restricted/malformed/failure; open review vs approve | I, V |
| `/agents` | AgentTeam | Catalog alignment and action states | no implied availability/live execution | I, V |
| `/evaluations` | EvaluationCenterPage, SuiteForm, RunForm, ReleaseForm | Dense form/table hierarchy, pending feedback | permissions, empty/error, server actions | I, V |
| `/control-tower` | ControlTowerPage, RuntimeControlForm | Operational tables and control clarity | real values, restricted changes, confirmations | I, V |
| `/admin` | AdminConsole | Dense controls and service state | restricted public viewer, operational security | R, V, L |
| `/trends` | server TrendsPage, PaperPanel | Chart labels, table/toolbar cohesion | real counts, honest scales and data alternatives | I, V |
| `/settings` | SystemSettings, LanguageToggle, SessionNotice | Setting rows, selected controls, receipts | local vs service state, locale, clearing/export | I, V |
| `/help` | EmployeeGuide, ResearchJourney, ServiceScope | Readable guidance and disclosure states | bilingual guidance, native links | I, V |
| Loading/error/not-found | PageLoading; root/portal/library boundaries; ServiceState | Route-shaped skeletons and compact recovery | reduced motion, retry pending, no fake success, focus and persistent errors | I, V, L |
| Shared primitives | ui.tsx, ReviewButton, SourceLink, SessionNotice | semantic tokens, consistent focus/press/pending, feedback, panel/tab primitives | server-compatible static pieces; forced colors; no hidden interactive exits | I, V |
| Unused source | AskWorkspace | No route imports; older workspace deliberately retained | No new animation engine or speculative rewrite for unused code | R |

## Evidence and implementation record

- Initial working tree was clean. Existing npm lockfile installation completed before code changes.
- Source graph confirms BeginnerHome owns dashboard; AgentHome owns requests; sign-in is a redirect.
- Existing 21-case cross-browser harness and loopback fixture server remain authoritative; 27 motion/state scenarios extend them.
- Adopted `motion@13.2.0`, MIT, React/React DOM peers `^18 || ^19`. No other direct UI dependency added.
- Consulted Motion animation, reduced-size/accessibility docs, Radix animation integration, and Motion-Primitives selection/panel examples. Registry/Tailwind installation is not part of this work.

## Verification results

Baseline production build and same-fixture measurements captured in `.artifacts/motion-upgrade/before/`.
71 Vitest tests, TypeScript and lint pass during implementation. Production build passes.
The expanded 48-case matrix was executed. The last full local run passed 46/48; its two WebKit failures (locale fixture timing and an unused Ask prefetch) were corrected and both scenarios then passed across all three engines (6/6). All 27 added motion/state scenarios passed in the full run; an additional 12 repeated selection/stream checks passed. The complete 48-case suite is also a hosted commit gate. Final production measurements and screenshots are captured.
Initial rapid-interaction checks found queued keyboard focus and focus lost when reversing a source exit; both implementations were corrected. An incorrect transcript selector in the new test was also corrected without changing assertions.


## Implemented responsibilities and deliberate retention

- `app/tokens.css` owns approved colors, compatibility aliases, three elevations,
  control geometry and five motion timings. Root imports it between legacy globals
  and the active theme; the root layout stays server-rendered. Shared `Button` reserves pending-label geometry;
  `SkeletonRows` has no artificial shimmer or loading delay. `ReviewButton` retains
  its compatible export. Root/portal/library error recovery uses the same primitive.
- `components/motion/selection.tsx` owns one bounded visual measurement on selection.
  Web Animations transforms a decorative indicator from the previous control to
  the selected control, cancelling and retargeting interrupted motion. It does not
  change keyboard semantics. Overflowing case tab strips expose the selected view.
- `MotionProvider` is local to ChatWorkspace; other routes do not load its engine.
  `LazyMotion` loads `domAnimation`; `m` and presence are limited to chat's source,
  picker and filter panels. Exiting panels immediately become inert/aria-hidden.
  Native chat-library dialog owns its own modal lifecycle and discrete CSS exit.
- A first `domMax` implementation measured about 51KB additional requested gzip JS
  on Home (including its lazy feature chunk), above budget. It was replaced by the
  bounded native selection implementation and `domAnimation`; no drag/layout bundle
  is needed. Production measurements include every loaded lazy chunk.
- Home: removed decorative entrance, improved objective focus, stable preparation
  button and source skeletons. ContinueWork remains genuine bounded saved data;
  source reading/preview, ResearchJourney and ServiceScope remain calm.
- Library: readable 12px metadata/15px source titles, active filter chips, Escape
  back to filters, focus row styling, truthful bookmark completion and persistent
  errors. Existing bounded query, stale option, URL history and result protection
  retained. Native date/select controls retained.
- Chat: source/filter presence, once-only newly submitted turn entry, stable reading
  position, native conversation dialog and tracking source/library controls.
  Thread tools, feedback, parser, history merging, branching and cancellation retain
  their existing business logic. Native menu controls and visible labels retained.
- Research: real stage indicator, static stage icons, semantic status colors, entry
  only for new persisted events; restored history stays still. Saved-task lists,
  source disclosures, review notes and exports retain their domain behavior.
- Letter detail: tracking native tabs, immediate keyboard focus, source-anchor
  highlight with timer cleanup, reliable clipboard failure. Original/Findings/
  Internal comparison keep existing artifacts, source versions and per-language
  generation state. Long source content does not animate between tabs.
- Drafts and saved sources: native radio selection shares the indicator, actual
  saved receipts/unsaved protections retained. Source removal is confirmed before
  removal; focus moves to a remaining source or heading, with persistent receipt.
  Saved-source session notice explains its actual storage context.
- Cases: all eight view compositions inspected. Shared tab strip, metadata colors,
  control states and action feedback updated; source/evidence/history remain static.
  Existing version bindings, confirmations, role checks and no-prefetch links retained.
- Governance/operations: approval filters track selection; evaluation and runtime
  forms use stable pending buttons and semantic inline outcomes. Evaluation empty
  histories explain the next step; primary evaluation/operations copy is bilingual.
  Existing source hashes, honest metric values and authorization retained.
- Specialists: tracking selected definition, preserved catalog-vs-execution boundary,
  corrected preparation link to actual draft route. Settings and Help retain native
  controls/disclosures with consistent hover/selected colors. Trends retain static
  honest charts and numeric alternatives; period links share selection treatment.
- SessionNotice remains a native, readable disclosure with unchanged 30-day policy.
  No recovery capability, authentication form or live activity was fabricated.
  Root and sign-in redirects remain unchanged. Generic not-found copy now fits any
  missing route; its compact panel and recovery control match the approved system.

## Verification boundaries

The browser fixture runs with the existing public viewer identity. `/review` and
`/admin` intentionally return the existing authorization boundary (not-found);
ReviewConsole/AdminConsole authorized mutation screens were source-reviewed, not
executed with production credentials. Case fixtures exercise all eight view routes
and permitted read-only state; real plan approvals, releases and operational changes
are not performed. Existing English technical labels in privileged legacy forms
are retained unless directly changed; new copy is bilingual. Real mobile keyboard,
screen-reader certification, production field Web Vitals and authenticated staff
workflows remain separate qualification work. No authentication bypass or production
customer mutation was introduced for screenshots.

## Measured refinements and defect corrections

- Replaced the initially heavier shared-layout feature bundle after measuring its
  actual route cost; the selected indicator uses native transforms and domAnimation
  remains scoped to presence. No virtualizer or extra overlay system was installed.
- Next default CSS merging combined unrelated feature modules. After reading the
  installed Next 16.3.3 CSS chunking guide, switched the frontend bundler to documented
  graph mode and measured the resulting requested CSS. This experimental setting
  should be revisited with framework upgrades.
- Rapid arrow keys exposed queued focus; focus now moves immediately. Reopening a
  source during exit now focuses the heading again. Safari conversation triggers
  explicitly take focus before native showModal so close returns to the right control.
- Animation creation checks current matchMedia as well as the subscribed React
  snapshot. Detailed WebKit diagnostics found the remaining animation was an
  inherited color transition from legacy 0.01ms rules. Consolidated those existing
  overrides to disable CSS animation/transition and removed two redundant blocks.
- The new rapid-key test establishes real tab activation after cold hydration before
  dispatching a burst of raw keyboard events. No timing sleep or weaker focus/state
  assertion was introduced. Existing audit.spec.ts assertions are preserved; its locale fixture waits for the initial preference write before replacing cookie/storage.
- Saved-run loading now resembles the task header, stages and two work panels;
  the saved list no longer appears high in the page only to be displaced by the run.
- Long restored chat was profiled with 60 turns/120 messages. It retains native DOM,
  find/copy and scrolling; no speculative virtualization was introduced. The profile
  and final lab samples are preserved even where they do not demonstrate a speedup.

- MotionProvider is now local to ChatWorkspace. Home, Sources, Research and operations
  keep native selected indicators without requesting Motion's presence engine.
- Cold WebKit streaming runs exposed input accepted before draft hydration and then
  overwritten. Chat now uses its existing draftLoaded state to disable the composer
  until restoration completes, with a bilingual restoration placeholder. No artificial
  wait was added. The streaming test waits for the turn-arrive animation specifically.

- The WebKit route trace identified an unused Ask RSC prefetch from Research's quick
  chat link. Disabled that prefetch, preserving activation and the existing strict
  console-error assertions. The locale fixture now waits for data-locale persistence
  before replacing its cookie/storage; the locale behavior assertions are unchanged.

## Final local check record

- npm ci: passed; motion installed deliberately through the existing lockfile.
- npm run lint: passed; final edited TS/TSX/test files also passed targeted ESLint.
- npm run typecheck: passed; subsequent production builds also completed TypeScript.
- npm run test: 71 passed in 21 files.
- npm run build: passed with existing standalone/multiple-lockfile notices and the
  documented experimental graph CSS setting.
- npm run test:browser: 46/48 on the last full local execution; both failing scenarios
  corrected and rerun across Chromium/Firefox/WebKit, 6/6 passing. New motion tests
  passed 27/27, with 12 additional repeated selection/stream scenarios passing.
- Hosted CI is configured to run the complete 48-test suite against the pushed commit.
  Its exact check result is the release's hosted verification record.
- Same-fixture production measurements, 56 paired captures, 16 Korean captures,
  forced-color screenshots, recordings and unrecorded motion trajectories saved.
- git diff --check: passed. Single design-detector scan: no findings.

See docs/assurance/visual-motion-upgrade-20260910.md for the requested resource
budget, exact artifacts, performance limitation and reproduction commands.
