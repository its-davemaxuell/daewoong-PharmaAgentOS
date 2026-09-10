# Streamline Light implementation evidence

Baseline: `1bf2cf188d6b5cafc24607781b5e914a1847aed7`, main, 10 September 2026.

## Delivered

Replaced every former Lucide import across 30 frontend consumers. Navigation,
Home, research, chat/history/evidence, library/detail, saved work, cases, reviews,
operations, settings, Help and error states now use one fine-outline family.
94 application roles use 66 original SVGs from the official
[Ultimate Light free collection](https://www.streamlinehq.com/icons/ultimate-light-free),
the free subset of the requested Streamline Light family. Source metadata identified
each selection as free within that collection. Assets are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); bilingual Help includes
the author/license credit and modification notice.

`apps/web/components/icons/manifest.json` records role, original name, hash, URL and
adaptation; `sources/` retains original artwork. The standard-library Python generator
validates SVG elements/attributes and emits static React modules, preserving server
compatibility. No remote requests, icon font, HTML injection or new dependency.
Removed `lucide-react` through npm and updated the existing lockfile.

Normalized stroke weight and inherited semantic color keep small icons readable.
Selected chat, archive, search, check, plus/minus and directional symbols were
simplified after inspection at 14/20/28px. Rotations and cropped enclosing shapes
are recorded. Labels, native controls, focus behavior, business logic and existing
motion remain unchanged. Daewoong/FDA branding and the product monogram remain.

## Production resource comparison

Actual requested Next static JS/CSS responses, deduplicated by URL, gzip level 9
over response bodies. Same local production build environment, fictional fixture
routes, Edge 152, 1440×1000. Chat opens the source reader to include lazy Motion.
These are compressed resource totals, not source-file sizes or claims about latency.
The preceding baseline used the same fixtures and gzip level. This icon pass did
not repeat CPU-throttled animation profiling; previous motion limitations remain.

| Route | Previous JS bytes | Current JS bytes | Difference | Current CSS bytes |
| --- | ---: | ---: | ---: | ---: |
| Home | 172804 | 173132 | +328 | 45441 |
| Sources | 173371 | 173027 | -344 | 43137 |
| Chat, reader loaded | 222295 | 222147 | -148 | 47449 |
| Research, saved run | 176525 | 177043 | +518 | 46488 |
| Case overview | 167092 | 167306 | +214 | 50818 |

The initial monolithic icon module added approximately 10–12KB gzip to each route.
Individual generated modules and direct imports eliminated that unnecessary cost.
Do not return application consumers to a single eager artwork module. Current Chat
is 35804 bytes above the original pre-motion baseline of 186343 bytes, below the
initial approximately 40KiB engineering budget for the combined UI/motion upgrade.
No library's advertised minimum size is used in these calculations.

## Visual and browser evidence

- [Home before](streamline-icons/home-before.png) and
  [Home after](streamline-icons/home-after.png), same fixture/desktop geometry.
- [Korean mobile chat](streamline-icons/chat-mobile-after.png).
- [Reviewed icon contact sheet](streamline-icons/icon-contact-sheet.png).
- [Resource and geometry results](streamline-icons/resources.json).

Twelve settled captures cover Home, Sources, Chat, Research, Case and Help at
1440px English / 390px Korean: zero document overflow and zero page errors.
Screenshots use reduced motion for determinism. Existing normal-motion Playwright
tests exercise real transition progress, interruption, focus and streaming; these
are the motion evidence for this icon-only change, not the screenshots alone.

Checks completed:

- `npm --prefix apps/web run lint`: passed. Final test-only edits also passed
  targeted ESLint from apps/web. An initial root-directory targeted invocation
  could not locate the frontend config; rerun from the correct workspace passed.
- `npm --prefix apps/web run typecheck`: passed.
- `npm --prefix apps/web run test`: 71 passed across 21 files.
- `npm --prefix apps/web run build`: passed. Existing multiple-lockfile and
  standalone test-server notices remain; no infrastructure change was made.
- Full browser run: 54 existing tests passed; the three new icon tests initially
  selected the intentionally hidden mobile toggle. Corrected the visible-icon
  selector. A subsequent WebKit run exposed premature document replacement during
  the shell's sidebar request; the test now waits for that request to settle.
  Final new test rerun: 3/3 passed across Chromium, Firefox and WebKit. Existing
  error assertions were retained. Together, all 57 scenarios have passing results;
  this is not a claim of one uninterrupted 57/57 execution.
- `git diff --check`: passed.

Publication uses the existing GitHub-to-Vercel integration. The deployed commit's
GitHub status is the authoritative release record; no Vercel/infrastructure
configuration was changed.

## Reproduction and limits

From this repository, use `npm --prefix apps/web run build`, then
`npm --prefix apps/web run test:browser -- --workers=3`. Browser fixtures use
`e2e/server.mjs` with local API/Next ports 8100/3100. Install Playwright's matching
browsers first; this workspace uses `.artifacts/playwright-browsers` through
`PLAYWRIGHT_BROWSERS_PATH`. Run the icon generator from apps/web after changing
manifest/source assets. Do not regenerate assets from a different Streamline family.

No real approval, operational setting or customer data was mutated for verification.
This is an icon/state regression check, not new regulatory, security or universal
frame-rate qualification. Existing four-times-CPU motion limitations are documented
in `motion-continuity-followup-20260910.md` and remain outside this icon-only change.
