# Neumorphic website — September 15, 2026

## Implementation

Replaced the flat visual system with cool porcelain surfaces, paired light/dark
shadows, raised controls, recessed fields and cobalt actions. The shared stylesheet
is `apps/web/app/neumorphism.css`; CSS modules carry the material into Research,
drafts, cases, agents, governance, Settings, Help and startup. Source archives,
readers, saved sources, conversation evidence, dialogs and restricted-console
components use the same tokens. Existing typography, content and product behavior
remain intact. Mobile Chat uses an accessible 44px send control to retain one row
of composer controls.

Motion includes interpolated four-slot press shadows, selection travel, existing
route fades, native dialog entry/exit and supported native disclosure transitions.
Inspector close releases focus and makes the exiting surface inert immediately,
then waits for browser-owned transitions before unmounting. Direct source URLs
return focus to the workspace when no opening control exists. Source/brief/anchor
identities prevent an old closing panel from dismissing a newly selected record.
Reduced motion and forced colors retain usable controls. No new dependency,
backend/schema change, service configuration or deployment.

## Browser inspection

Used Playwright with installed Chromium-based Microsoft Edge 153.0.4234.32.
Python Playwright and the package's downloaded browser were unavailable; the
repository's Node Playwright and installed Chromium browser were used.

Personally inspected baseline Chat, Research, Overview, sources and Settings,
then inspected the replacement at desktop/mobile sizes. The automated screenshot
inventory covers **26 routes × 2 languages × 2 widths = 104 views**, with no
horizontal overflow and no page script errors. Captures wait for a visible page
heading after loading. Additional existing checks cover 320/768/1280px layouts.

All browser evidence uses the existing fictional loopback API. `/admin` and
`/review` return the existing access-controlled 404 to this viewer; these captures
verify the restricted state, not privileged console operation. Their component
styles were updated through the shared system without changing authorization.
No live research/chat generation, regulatory action or external write was made.

Previews:

- [Desktop Chat](../../.artifacts/neumorphism/final-en-1440-ask.png)
- [Mobile Chat](../../.artifacts/neumorphism/final-chat-mobile.png)
- [Korean Research](../../.artifacts/neumorphism/final-ko-390-research.png)
- [Overview](../../.artifacts/neumorphism/final-en-1440-dashboard.png)
- [Trends](../../.artifacts/neumorphism/final-trends.png)
- [Startup](../../.artifacts/neumorphism/final-startup.png)
- [104-view audit](../../.artifacts/neumorphism/visual-audit.json)

## Validation

- 95 unit tests pass.
- Production build and TypeScript pass; full lint and final changed-file lint pass.
- Final combined Chromium run: **32/32 pass**, including the 28 existing checks for Chat, responsive workspaces, source/assistant
  continuity, rapid selection, streaming, drafts, keyboard/focus and reduced motion.
- Four startup scenarios pass: all-menu readiness, retry, partial availability and
  reduced-motion mobile navigation.
- New browser regressions verify interpolated press feedback, inert inspector
  exits, direct-URL focus recovery, reduced motion/forced colors and source changes
  during exit. All four new tests pass in the final combined run.
- Independent Impeccable finishing review completed. Corrected remaining legacy
  white surfaces, governance filter cascade, primary press shadows and inspector
  unmount/focus behavior.
- Mechanical detector ran once: one warning for the native startup progress
  value's width transition. Retained intentionally: its track is fixed at 160px
  and 8px high, so progress cannot move surrounding layout. All other checks clear.
- `git diff --check` passes.
- Token contrast: body/canvas 11.10:1, secondary/canvas 5.19:1, blue/canvas 5.07:1,
  white/primary button 5.91:1. Progress transitions also respect reduced motion.

The first post-build broad run passed 28/28. Later local preview-process exits
caused connection-refused failures; these were infrastructure interruptions. A
managed rerun passed 30/31 and exposed a real direct-URL focus fallback issue in
the new inspector test. That issue was fixed; the focused nine-test rerun passed.
Windows server teardown needed explicit cleanup of the task's own fixture process.
The screenshot audit completed independently with 104/104 views. After adding
source-switch interruption coverage, the final combined run passes 32/32 in one
minute; the four startup scenarios also pass.

Deployment remains separate. The changes are local and uncommitted.
