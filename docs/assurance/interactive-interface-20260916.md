# Interactive interface refinement — 2026-09-16

## Scope

User request: use less explanatory text and more tangible interaction, continuing
the authorized neumorphism, browser verification, deployment, commit and push.

- Examples: category/origin/search filters, compact result selector and actual
  retained previews. Mobile selection scrolls within its own bounds.
- Result reader: section selection, previous/next, complete output, translation
  beside the exact FDA original, searchable evidence, input and run details.
- Help: editable bilingual question builder with matching retained examples;
  topic/language changes preserve local edits. Transfer prepares Research only.
  Inputs wait for client readiness to prevent edits during hydration.
- Specialists: selecting a definition shows actual reference output. Roles,
  inputs and tools move into a disclosure; unavailable execution remains explicit.
- Chat/Research: orientation symbols now open actual sources/results or focus
  the question. Overview exposes New/Later/Done inbox links and actual counts.

The 18 original pipeline snapshots and their hashes are unchanged. Public examples
remain separate from private history. Synthetic sources, simulated reviews and
unapproved output retain visible labels and full downloadable qualifications.

## Verification

Before changes, Chromium inspected the hosted Examples gallery, translation,
Specialists, Help, Research and Chat. Local renders were personally inspected
at desktop and phone widths, including Korean content and original comparison.

- Production Next.js build, TypeScript and lint pass at the implementation stage.
- Web unit suite: 99 passed across 29 files.
- Focused browser checks cover native keyboard controls, preserved Help drafts,
  exact source comparison, evidence searching, complete output, origin filtering,
  download honesty, empty results and widths 320/390/768/1440 in both languages.
- Existing press, cancellation, dialog and reduced-motion checks are included.
  Short press samples now begin in the browser input event, avoiding WebKit remote
  protocol latency consuming the transition before sampling. Conversation menu
  tests wait for enabled actions before using their arrow-key navigation.
- Final interaction run: **63 passed** across Chromium, Firefox and WebKit. The
  earlier Examples/Chat product run contributes **27 passed** unchanged cases:
  **90 browser cases pass** across the recorded runs. The initial Firefox selector
  matched hidden preloaded content; it now scopes the visible main workspace.
- All four Chromium startup scenarios pass, including Retry, partial availability
  and mobile reduced motion. No generation or review approval is performed by
  the UI checks.

## Evidence

Ignored local artifacts live under `.artifacts/interactive-refinement/`:
`before.cjs`, `before.json`, baseline screenshots, `final-browser/` and `hosted/`.
The initial browser run is under `.artifacts/ui-audit/browser/`.
`scripts/verify_public_examples.cjs` checks all 18 hosted snapshots, exact SHA-256
downloads, section boundaries, source references, translation alignment and Help
handoff in six fresh sessions (three engines, English desktop/Korean mobile).

Publication is pending the final checks in this record.
