# Clearer Workspaces — September 11, 2026

Local implementation of the approved visual and organization refinement. No
backend API, schema, infrastructure or dependency changes. Not deployed.

## Result

- My work: Research, Inbox, Saved work. Evidence: FDA sources, Trends. Team review:
  Cases and role-appropriate Source review/Approvals. Utilities retain role checks.
  Recent conversations collapse; command navigation uses the shared route labels.
- Overview leads with New research and ongoing work. Empty examples prepare a
  session draft without posting a research request. Source activity and personal
  triage follow; Saved sources counts bookmarks and opens the matching saved tab.
- Existing tokens and components now provide compact headings and working surfaces
  across sources, saved work, cases, reviews, trends, settings and Help. Research's
  decorative legacy layers are removed. Desktop gutters are 24px, mobile 16px.
- Research history collapses on mobile; the goal remains in the first viewport.
  Current run status and controls remain visible. Execution details are collapsed.
  Source passage/version/anchor stay visible; hashes expand under provenance.
  Saved brief findings include their support labels and limitations.
- Desktop sidebar collapse no longer hides the mobile drawer's labels on resize.
- Research and Saved work reserve the same shared 390px width used by the desktop
  inspector, preventing the panel from covering the right edge of their content.

## Validation

Verification uses the repository's loopback-only fictional API and browser cache
at `.cache/playwright`. Screenshots contain fictional companies and findings.
No production research or governed mutation was performed.

Commands (from `apps/web`, with `PLAYWRIGHT_BROWSERS_PATH` set to the absolute
workspace `.cache/playwright` directory):

```text
npm run test
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/clear-workspaces.spec.ts e2e/continuity.spec.ts e2e/navigation.spec.ts e2e/research-context.spec.ts e2e/workspace.spec.ts --output=../../.artifacts/clear-workspaces/browser
```

The focused journeys cover English/Korean at 1440, 1280, 768 and 390px; direct
navigation and viewer restrictions; draft-only preparation; partial source failure
with independent ongoing work; mobile history; source selection and query history;
assistant/context retention; comparison; keyboard and reduced motion; saved-view
revision conflicts; personal triage; immutable brief export; long Korean text and
research evidence inspection. The primary screen matrix checks Overview, Research,
FDA sources, Inbox, Saved work, Cases, Trends, Settings, Help and Approvals.

The Impeccable mechanical detector reported no findings for the selected changed
UI targets. Its output is `.artifacts/clear-workspaces-detector.json`. Manual
browser review used the existing Node Playwright harness (Python Playwright is
not installed); it checked rendered screenshots, disclosure behavior, source
passages, and the desktop-collapse/mobile-drawer transition.

Validation results:

- 94 frontend unit tests pass; lint, TypeScript and production build pass.
- The initial cross-browser suite passed 61/63 cases. The two failures were a new
  test measuring a detached loading heading in WebKit; a retrying visible-heading
  assertion fixes that race.
- The subsequent final navigation/layout run passes all 24 cases across Chromium,
  Firefox and WebKit, including the new desktop-collapse/mobile-drawer regression.
- All 9 final inspector checks pass across Chromium, Firefox and WebKit after
  the shared-width fix, including a direct assertion that the brief does not
  overlap its source panel.

Screenshots (local, explicitly fictional data):

- [Overview, desktop](../../.artifacts/clear-workspaces/final-browser/clear-workspaces-working-s-be10b-adable-at-four-widths-in-en-chromium/dashboard-en-1440.png)
- [Research, mobile](../../.artifacts/clear-workspaces/final-browser/clear-workspaces-working-s-be10b-adable-at-four-widths-in-en-chromium/research-en-390.png)
- [Mobile navigation](../../.artifacts/clear-workspaces/mobile-navigation.png)
- [Research with source evidence](../../.artifacts/clear-workspaces/inspector-check/workspace-research-selecti-d3cb6-without-scrolling-the-brief-chromium/research-evidence.png)

Final targeted command:

```text
npx playwright test e2e/workspace.spec.ts e2e/continuity.spec.ts --grep "research selection|source inspector retains|evidence and assistant share" --output=../../.artifacts/clear-workspaces/inspector-check
```

## Boundaries

The work refines the current product. It does not qualify unfinished personal
specialist execution, introduce review authority, or change source ownership.
Existing specialist screen prose and retained source content are preserved.
The existing Next.js multiple-lockfile/standalone-start warnings remain in the
local browser harness; they did not prevent compilation or browser execution.
