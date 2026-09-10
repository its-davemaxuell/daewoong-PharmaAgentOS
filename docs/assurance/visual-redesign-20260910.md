# Approved A visual redesign — 10 September 2026

The user requested a major design change across all tabs and parts, prioritizing
bright, minimal, neat, useful density and three-dimensional compartments. They
explicitly chose composition A. This replaces the older navy/cobalt visual direction.

## Implementation

The shared theme now owns white floating navigation, a compact utility bar,
cool canvas, indigo controls, layered objective trays, inset tab strips and raised
reading panels. Feature modules extend these tokens through Home, Sources, all
three source views, Chat and its evidence reader, Research, personal drafts,
specialists, case review, approvals, evaluations, operations, settings and Help.
Shared loading, empty, restricted and error surfaces use the same language.

Home prepares a tab-local research objective and shows five actual source previews
from one bounded page request. It creates no research job until the user explicitly
starts Research. Hydration readiness prevents premature input from being lost.
Source-index links remain continuously visible on desktop; a native disclosure
makes source reading reachable sooner on mobile. Existing server authorization,
trust metadata, citations, saved-work ownership and backend contracts are preserved.
No new dependency, raster payload or font was introduced.

The selected direction was informed by [Linear's UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
and [Craft's document hierarchy](https://www.craft.do/). Those are pattern references,
not a claim of affiliation or a copied product interface.

## Verification

Local production builds use loopback-only fictional API fixtures in e2e/server.mjs.
The fixture provider never contacts production and is not imported into application
routes. Visual artifacts are under .artifacts/redesign-20260910/.

- Rendered 17 route pairs at 1440 and 390px, plus all eight case views at both widths.
- The release browser suite covers seven widths (320, 390, 768, 980, 981, 1024,
  1440), Chromium/Firefox/WebKit, source filtering/history/recovery, restored unknown
  evidence, reader focus return, governance locales and failures, mobile navigation,
  200% text, Home-to-Research handoff, supporting routes and all case/source tabs.
- A Firefox assertion was corrected to target the visible streamed tree. A WebKit
  timing case revealed premature Home input before hydration; the field now waits
  for its event handlers. No timeout increase or forced click hides that defect.
- An independent impeccable finish reviewer checked the committed direction and
  rendered surfaces. Its material findings were applied: denser Home, collapsed
  mobile source index, cool case metadata, matching chart/legend colors and
  source register before restricted intake.
- The design detector was run once. Six inherited heavy case borders were reduced
  and a padding animation was removed. There was no second detector run.

Final local checks: **71 frontend tests passed; lint, TypeScript checking and
production build passed; all 21 Playwright tests passed across Chromium, Firefox
and WebKit (3.7 minutes)**. The browser suite includes the corrected hydration
case and native mobile source disclosure.

The first hosted run passed 20 of 21 browser checks. Its trace showed the supporting
route matrix unloading a streamed case page before the sidebar effect had started;
WebKit reported an access-control failure from that departing document. The matrix
now awaits and checks the actual sidebar response before inspecting or leaving each
workspace. Error assertions remain intact; no failure is suppressed or retried.
The corrected test passed locally in all three browser engines; lint and types
passed again. The complete hosted suite runs against the correction commit.

These are frontend interaction checks, not a claim of comprehensive accessibility,
real-device keyboard qualification, security certification or an award.

## Publication evidence

Publication uses the existing Git integration on main. The deployment statuses
on the release commit bind Vercel and Railway outcomes to its exact source.
The production-only browser check records real Korean/English routes, desktop
and mobile geometry, expected visual tokens, page errors and screenshots in
.artifacts/redesign-20260910/production-report.json and production-*.png.
It observes the existing service without creating a model run, research job,
review record or approval.

The visual implementation was published as `6d08a73b8cd0db25b0e26e8e2bbf76e75572320f`.
Vercel and both Railway services reported success. The live check passed **26
route/locale/viewport combinations** in Korean and English at desktop and mobile
widths, with the expected new theme, no document overflow and no page errors.
The hosted browser synchronization correction changes tests and documentation only.
