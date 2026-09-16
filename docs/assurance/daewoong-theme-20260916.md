# Daewoong theme, startup motion and view transitions

Date: September 16, 2026. Scope: the existing bilingual neumorphic website.

## Delivered behavior

- Daewoong orange `#F18A00` and charcoal `#53575A`, verified from the
  [official logo](https://www.daewoong.co.kr/images/daewoong-logo-basic.svg),
  anchor the warm neutral theme. Bright orange actions have dark labels; darker
  orange links and neutral field borders maintain readable contrast.
- The startup folder sprite is replaced by native CSS slide, pulse, drop and
  bounce circles in a compact 2×2 composition. This adapts
  [Rifayet's supplied loading reference](https://dribbble.com/shots/27695417-Loading-Animation-Concept),
  inspected in Chromium and sampled from its video. No external media dependency
  is introduced. Credit is available in Help's design disclosure.
- Menu links, query tabs and local result/source selectors fade the old contents
  out over 90ms, then show the new contents over 160ms. The shell and live DOM
  remain mounted; no screenshot clones, remount keys or delayed backend actions
  are introduced. Native modified links and downloads retain their behavior.
- The last selection cancels an unfinished departure. Selecting the current view
  cancels a pending switch. Reduced motion and hidden documents settle pending
  navigation immediately; slow/failed route changes restore visibility.
- Chat, Research, search and other text entry keep neutral boundaries and a caret
  without colored compartment outlines. Native text selection is usable. Action
  controls retain keyboard focus rings; forced colors restores system field outlines.
- The all-menu startup still uses actual readiness, Retry and Continue. Dots stop
  on attention, hidden documents and reduced motion. The initial reveal takes 250ms.

## Verification

Production build/type checking, ESLint and 99 unit tests pass.

The final focused browser run passes **108/108** cases in Chromium, Firefox and
WebKit: theme/contrast, both fade stages, interrupted switches, live motion
preferences, keyboard controls, pressed depth, preserved streams/drafts, IME,
source focus, result readers, English/Korean Help and responsive layouts at
1440, 768, 390 and 320px. The earlier broader run also passes all **33** navigation
cache and neumorphism cases. These are 141 distinct focused cases across runs,
not a claim about the repository's entire CI browser suite.

The first pass exposed a reduced-motion cancellation race and citation focus
before the destination DOM commit in Firefox/WebKit. Both are corrected and
covered by the passing rerun. Test selectors were updated for native searchbox
roles and the intentional orange press palette.

Chromium inspected 20 routes at English desktop and Korean phone widths: no
horizontal overflow or script errors in those 40 captures. A computed-color
audit identified the remaining blue labels/borders, which now use shared tokens.
Manual paused-frame captures show outgoing Chat, incoming Agents and the focused
composer; screenshots were personally inspected. Browser assertions verify
4.5:1 text/placeholder/action contrast and 3:1 input-boundary contrast.

All **12/12 startup scenarios** pass across the same three engines: actual menu
readiness, animated dots, no sprite download, visibility-change pause, live reduced
motion, phone layout, Retry, Continue and no startup replay on navigation. Desktop
and phone startup screenshots were personally inspected. Publication follows the
authorized push and is recorded below after hosted verification.

## Evidence

- `.artifacts/daewoong-theme/`: official/reference captures, sampled video frames,
  route renders, computed-color audit, manual motion frames and the initial report.
- `.artifacts/ui-audit/report/`: final 108-case report and frame/contrast attachments.
- `.artifacts/ui-audit/startup-report/`: all-menu preparation/recovery checks.
- `apps/web/e2e/daewoong-theme.spec.ts`: motion and theme regression checks.

Fixtures are fictional and local. No live generation or approval is performed by
these checks. The 18 public pipeline snapshots, download hashes, API contracts,
session ownership and specialist execution boundaries are unchanged.
