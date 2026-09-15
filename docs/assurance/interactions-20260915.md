# Website interaction refinement — September 15, 2026

Published September 16 as application revision `8a2cd74`; see the
[deployment record](neumorphism-deployment-20260916.md). The local verification
history below describes the implementation before publication.

## Implemented locally

The user's follow-up asks for complete smooth transitions, press animations and
interactive behavior on the existing neumorphic website. The porcelain/cobalt
design, route structure, content, authorization and source provenance remain.

- Shared native input feedback makes quick taps and Enter/Space presses visible
  without delaying clicks, submission, navigation or other native behavior.
  Pointer cancellation, scrolling drags, leaving a control, focus loss, window
  blur and live motion-preference changes clear the feedback. No click synthesis,
  pointer capture, observers, new package or continuous layout measurements.
- Expanded tactile depth across small archive/workspace actions, research exports
  and governance filters. Continuous row tint, input focus, disabled/busy cursors
  and options-chevron feedback complement the existing route and selection motion.
- Mobile navigation retains its contents during the native exit, immediately
  releases focus and becomes inert. A new opening invalidates old exit cleanup.
  Its 44px close target has separate space and stacking from the brand link.
- Conversation Find opens/closes using interruptible presence, restores its
  trigger's focus, and accepts Escape from its input and match controls.
- Conversation actions support arrow keys, Home/End, Escape and normal Tab exit.
  Native disclosures animate only in browsers that can make their exiting
  pseudo-content inert; other engines retain native immediate closing.
- All shared presence panels react to reduced-motion changes while mounted.
  New scaling is gated by the motion preference and does not replace positional
  transforms, including Jump to latest. Cobalt primary press depth stays cobalt.

## Verification

Actual Chromium-based Microsoft Edge 153.0.4234.32 through local Playwright.
Production build served against the existing loopback-only fictional fixture;
no live Chat/Research submission or external service mutation.

- **42/42 browser checks passed**: 10 new interaction regressions plus the existing
  Chat product, clear workspace, continuity, motion and neumorphism suites.
  Includes English/Korean geometry at multiple widths, native keyboard and pointer
  activation, touch cancellation, inert exits, repeated reopening, live reduced
  motion, source identity, drafts, streaming and reading-position preservation.
- **95/95 unit tests passed** in 28 files.
- **4/4 startup scenarios passed**: all-menu preparation and single reveal,
  retry, partial availability and reduced-motion mobile navigation.
- Production build/TypeScript and full ESLint pass.
  Final changed-file ESLint also passes after the mobile hit-target correction.
- Prior design detector result remains the single intentional, bounded startup
  progress-width transition. No second detector pass was run.
- Independent finish review found five concrete issues: live reduced motion,
  closed disclosure focus, a positional transform override, primary shadow
  specificity and Find's limited Escape handler. All were corrected and checked.

The first new browser runs exposed a test expectation for CSS's neutral scale
serialization, a native disclosure rendering/focus timing issue, and production
CSS optimization folding `scale:none` into `transform` without cancelling an
independent scale. The final implementation gates scaling by media preference
and focuses newly opened menu items after native content becomes available.
The combined final run passes all 42 checks.

The recorded touch walkthrough caught the brand link intercepting the mobile
close button. Reserved brand spacing and a 44px close target corrected it; the
browser regression now uses actual pointer hit testing as well as exit snapshots.
Both recorded English desktop and Korean touch walkthroughs subsequently passed
with zero page script errors or horizontal overflow. One intermediate recording
retry hit a local test-artifact directory collision; recording and test outputs
now use separate directories.

Artifacts under `.artifacts/interactions/` include the before-render inventory,
test JSON, desktop/mobile screenshots and interaction recordings. In the before
snapshot mobile navigation had zero links during four active exit transitions;
the regression now verifies retained links and immediate inertness.

- [English desktop recording](../../.artifacts/interactions/en-interaction-preview.webm)
- [Korean mobile recording](../../.artifacts/interactions/ko-interaction-preview.webm)
- [Mobile navigation](../../.artifacts/interactions/ko-mobile-navigation.png)
- [Source inspector](../../.artifacts/interactions/en-source.png)

## Scope

The implementation pass was local and uncommitted. This pass ran Chromium, with
feature-gated native fallback behavior for other engines; it is not a fresh full
Firefox/WebKit qualification. Privileged operations remain role-restricted.
