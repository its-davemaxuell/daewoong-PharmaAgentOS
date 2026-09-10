# Visual and motion upgrade verification

Date: 10 September 2026, Asia/Seoul. Baseline: `13900606b83bd2b3c6fa4a31b60db4c571a13db3`.
Working authority: `DESIGN.md`, Layered desk / composition A. Complete surface ledger: `VISUAL_MOTION_UPGRADE.md`.

## Delivered implementation

The existing bright workspace now has one semantic token source, three elevations,
consistent interaction timings, stable pending controls, tracking selected controls,
and small interruptible panel transitions. The server layout and provider identity
are preserved. No backend contract, infrastructure, authorization or font changes.

- Shell/Home: nav and language indicators, mobile inert/focus boundaries, objective
  focus and pending preparation, stable source skeletons, actual continuation links.
- Chat/Research: native conversation dialog, source/filter presence with inaccessible
  exits, once-only new turn/event entry, calm restored history, real stage/status
  treatment, persistent copy failures and research-shaped loading geometry. Composer draft readiness prevents early
  typing being overwritten during hydration.
- Sources/Drafts: native filter controls and chips, actual save/remove receipts,
  tracking detail tabs, immediate keyboard focus, bounded source-anchor cue,
  original reading typography and explicit local/session persistence retained.
- Cases/Operations: all eight case views reviewed, shared view strip with mobile
  active-item visibility, semantic form feedback, pending evaluation/runtime controls,
  clear empty states. Settings, Help, Trends, specialists and exception pages share
  the same control and panel language; long content/charts remain static.

## Component and cascade ownership

`app/tokens.css` extracts approved tokens from the active theme, retaining compatibility
aliases. `components/controls.*` provides Button, IconButton, SkeletonRows and
InlineFeedback; `ReviewButton` preserves its existing export. `components/motion/`
contains the Chat-local client provider, lazy features, presence and selected indicator.
`lib/ui-media.ts` centralizes cleaned-up media subscriptions. Domain files retain
networking, source/version rules, mutation semantics and ownership.

Only overlapping rules needed for this work were migrated in globals, theme,
chat CSS and feature CSS Modules. No wholesale legacy deletion or new override sheet. Existing reduced-motion
overrides were consolidated from near-zero timings to disabled CSS transitions and
animations, eliminating a WebKit inherited-color transition edge case.
Next 16.3.3's documented Turbopack `experimental.cssChunking: "graph"` avoids merging
unrelated feature styles into a shared root chunk. It is experimental and should be
rechecked on Next upgrades; security/output settings are unchanged.

## Dependencies and measured budget

Added exactly `motion@13.2.0` (MIT; React/React DOM peer range `^18 || ^19`) using
npm/package-lock. No direct framer-motion, Radix, Tailwind, virtualizer or optional
feedback library. LazyMotion uses `domAnimation`; selected indicators use one bounded
native Web Animations transform rather than Motion layout features. An earlier
domMax version exceeded the budget and was replaced before delivery.

| Route | JS before / after (gzip B) | JS delta (KiB) | CSS before / after (gzip B) | CLS before / after (max) |
|---|---:|---:|---:|---:|
| Home | 170,255 / 172,553 | +2.24 | 46,651 / 45,368 | 0.0068 / 0.0045 |
| Sources | 170,638 / 173,120 | +2.42 | 40,831 / 43,052 | 0.0056 / 0.0056 |
| Chat | 186,343 / 222,038 | +34.86 | 44,949 / 47,373 | 0.0001 / 0.0001 |
| Saved research | 173,709 / 176,274 | +2.50 | 46,651 / 46,421 | 0.1526 / 0.0144 |
| Large chat (60 turns) | 186,343 / 222,038 | +34.86 | 44,949 / 47,373 | 0.0001 / 0.0001 |
| Case overview | 168,728 / 166,841 | -1.84 | 48,449 / 50,743 | 0.0001 / 0.0001 |

Gzip estimates use actual requested static response bodies, including lazy features;
these are not source sizes, advertised library minima or field transfer claims.

## Reproduction

From the authorized repository root:

```powershell
npm --prefix apps/web ci
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run test
npm --prefix apps/web run build
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/playwright-browsers"
npm --prefix apps/web run test:browser
```

Install the three Playwright browser binaries first if absent. Existing
`e2e/server.mjs` binds a fictional backend to loopback 8100 and the production build
to 3100; browser config starts/stops it. Do not run a second server during that suite.
For measurements, start `node e2e/server.mjs` from `apps/web`, then from root:

```powershell
services/api/.venv/Scripts/python.exe apps/web/e2e/measure-motion.py after
node apps/web/e2e/inspect-motion.mjs
```

Python requires Playwright. The measurement tools default to installed Edge;
`CHROMIUM_EXECUTABLE` can point to another supported Chromium executable. Baseline
and after must use the same browser, fixtures and environment. The existing harness
uses next start against the production build; Next reports its existing standalone
warning and multiple-lockfile warning. Hosted standalone qualification is separate.

## Evidence artifacts

- `.artifacts/motion-upgrade/compare.html`: 56 matched before/after screen captures.
- `before/performance.json`, `after/performance.json`: two cold samples per route,
  1440x1000, 4x CPU, 40ms latency, 1,250,000 bytes/sec down, same fictional API.
- `after/interaction.zip`, `after/interaction-trace.json`, `after/video/`: recorded
  normal-motion source-panel cycles. Recording overhead affects frame timing.
- `interaction-review/inspection.json`: unrecorded 1x/4x CPU repeated-cycle metrics,
  actual selection trajectories and settled geometry, Korean 390/1920 captures.
- `interaction-review/forced-colors-*.png`: keyboard focus and selected boundaries.
- `.artifacts/ui-audit/report/index.html`: browser report with failure attachments
  when applicable. Existing `audit.spec.ts` assertions remain intact. The locale fixture now waits for the initial preference write before replacing cookie/storage, avoiding a hydration race.
- `long-chat.cpuprofile`, `long-chat-trace.json`: diagnostic large-history startup
  profile; large transcript layout remains an explicit profiling target.
- `design-scan.json`: single detector scan of changed UI sources, no reported hits.

Artifacts are local ignored outputs; no confidential prompts or production data were
copied into them. Screenshots alone do not establish motion or accessibility quality.

## Verification limits

Public-viewer fixtures preserve authorization. AdminConsole and ReviewConsole
privileged mutation screens were source-reviewed; their public restricted routes
were browser-tested. Case view routes cover a draft record, empty and unavailable
subresources, not every populated staff-only state. Shared root/portal error controls were source-reviewed; service failures and not-found were exercised in browsers. Production approvals, releases,
operational settings and customer records were not mutated for demonstration.

Synthetic IME events are regression coverage, not a physical Korean mobile-keyboard
test. Real-device browser chrome, screen-reader certification, field Web Vitals and
all enterprise minimum browser versions remain unqualified. Existing privileged
English technical copy is retained where not changed; every new label is bilingual.
A two-sample lab comparison cannot support a general speedup or universal 60fps claim.

## Performance interpretation

The shared-route increment is about 2.2-2.5 KiB gzip; Chat adds 34.86 KiB including
its lazily loaded feature bundle. Case overview requests 1.84 KiB less JavaScript.
The initial domMax/root-provider design was narrowed first to native indicators,
then to a Chat-local provider. This is below the 40 KiB engineering budget without
excluding the lazy feature cost. The local font remains unchanged.

Saved research CLS fell from 0.1526 to 0.0144 in the same fixture after its loading
geometry was corrected. Most route long-task totals decreased in this run, but
large-chat median startup long-task time rose from 1341 to 1675ms at 4x CPU. These
are two cold lab samples, not field Web Vitals or a general speedup claim.

For the remaining large-history cost, run the measurement command against the
60-turn route `/chat/33333333-3333-4333-8333-333333333333`. The diagnostic trace
identifies full transcript layout (roughly 6,840 layout objects, with individual
layouts around 400-540ms at 4x CPU). Native DOM/find/copy and stable scrolling were
retained; no unproven virtualization was added. Further large-history startup
optimization remains a measured follow-up, not a claimed completed speedup.

## Captured visuals and normal-motion inspection

Representative committed captures (fictional fixtures, same dimensions):

| Surface | Before | After |
|---|---|---|
| Home desktop | [Before](visual-motion/home-desktop-before.png) | [After](visual-motion/home-desktop-after.png) |
| Home mobile | [Before](visual-motion/home-mobile-before.png) | [After](visual-motion/home-mobile-after.png) |
| Chat desktop | [Before](visual-motion/chat-desktop-before.png) | [After](visual-motion/chat-desktop-after.png) |

All 56 English route/viewport captures and 16 Korean 390/1920 captures had zero
reported document overflow. Forced-color captures show the actual hydrated shell,
focus outlines and selected-control boundaries. All eight case view captures were
inspected; unavailable subresources remain visibly unavailable.

The unrecorded repeated-cycle inspection warmed up three source-panel cycles, then
sampled 12 open/close cycles with normal motion at 1x and 4x CPU. At 1x: 1,659 RAF
samples, p95 5.3ms, maximum 20.6ms, none over 32ms. At 4x: 1,473 samples, p95 8.4ms,
maximum 47.7ms, four over 32ms. This headless browser's cadence is around 4.2ms;
it is not a universal 60Hz or real-device frame-rate certification. Recorded trace
and video runs have additional instrumentation overhead and are kept separately.

After forced collection, DOM nodes stayed 847 to 847 and event listeners 396 to
396 in both runs, with no remaining source panel. This bounded exercise found no
accumulation; it does not prove absence of all memory leaks. Selected-tab trajectory
samples visibly progress to the target; the final measured rectangle is x=544,
width=194.625 at both CPU settings. Mid-transition retargeting and reduced motion
are covered by the browser assertions.

## Check outcomes

| Command / gate | Actual local outcome |
|---|---|
| npm ci | Passed before implementation; lockfile updated deliberately for Motion |
| npm run lint | Passed; final edited files also passed targeted ESLint |
| npm run typecheck | Passed; final production build also completed TypeScript |
| npm run test | 71 passed, 21 files |
| npm run build | Passed; existing workspace-root/standalone notices and documented graph experiment |
| npm run test:browser | Last full run: 46/48. Both WebKit failures corrected; focused rerun of both across all engines: 6/6 |
| Additional repeated selection/stream checks | 12/12 passed across all engines |
| git diff --check | Passed |

All 27 new motion/state cases passed in the full run. The remaining local failures
were a locale-fixture hydration race and a real unused Ask prefetch from Research;
readiness synchronization and prefetch=false fixed them with assertions intact.
No full local rerun followed those final two corrections; the complete 48-test
matrix also runs in GitHub CI for the release commit. Consult that exact commit's
check for the hosted result. Build artifacts remained fixed during the final
measurement and targeted checks.
