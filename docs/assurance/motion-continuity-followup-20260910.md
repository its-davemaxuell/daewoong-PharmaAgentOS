# Motion continuity follow-up

Baseline: deployed `a19d0c4001463307110b3abcb7a917348c56352b`.
User feedback: smooth transitions were not perceptible enough.

## Changes and direct visual evidence

- The selected tab now travels below all labels. Previously each button isolated
  its own stacking context, letting the moving background obscure adjacent text.
  The recessed track now owns that context. Travel lasts 240ms with a gentler
  initial deceleration; the selected hover fill no longer masks the indicator.
- A changed route receives a 300ms, 6px settling transition on the existing main
  element. Initial loads, query refreshes, streaming and polling do not trigger it.
  Letter tabs and specialist selections use full-opacity local movement.
- Source panels enter in 260ms and exit in 200ms. Mobile navigation retains visible
  exit movement and fades its persistent backdrop. Closed controls become inert
  immediately and focus returns immediately; animation never gates an action.
- Reduced motion cancels active Web Animations and disables CSS movement. The
  approved palette, typography, reading content and real task states are unchanged.

Intermediate frames at 65ms, using the same fictional letter and 1440×1000 viewport:
[before](visual-motion/tab-motion-before.png) and
[after](visual-motion/tab-motion-after.png). The before image shows the selected
background obscuring part of the Findings label. These paused frames establish
layering and intermediate position; normal-motion traces provide separate evidence.

## Verification

Production build, lint and TypeScript passed. Unit suite: 71 passed in 21 files.
New focused browser cases: 6 passed across Chromium, Firefox and WebKit. They
inspect an actual intermediate indicator position, preserve full reading opacity,
interrupt a selection, verify persistent main-element identity, and cancel motion.

Full regression: `npm run test:browser -- --workers=3` — **54 passed (3.9m)**,
covering Chromium, Firefox and WebKit. An earlier full
run was deliberately stopped after 24 passing cases to include the mobile exit
fix in a rebuilt application; it was not a completed run or a product failure.

All twelve cold resource samples completed: compared with `a19d0c4`, requested
JavaScript increased by 251 bytes gzip on Home, Sources, Research and Cases, and
257 bytes on Chat (including its lazy features). CSS increased by 123 bytes gzip.
Measured CLS remained unchanged (Home 0.0045, Sources 0.0056, Chat 0.0001,
Research 0.0144, Cases 0.0001). No new dependency was needed.
One large-chat sample did not request the lazy feature chunk, so comparisons use
the larger complete 222,295-byte request total, not that lower partial figure.

The subsequent optional screenshot sweep stopped at `/evaluations` when the local
fixture process exited without a diagnostic. Resource results were already saved;
this is an incomplete capture, not a claim that `/evaluations` failed in the 54-case
browser suite. The fixture was restarted for the focused motion capture.

Two normal-motion inspections retained both results (`inspection-first.json` and
`inspection.json`). At normal CPU speed, repeated panel cycles had p95 frame
intervals of 4.3ms and 4.6ms, with no sampled interval above 32ms. At 4× CPU
throttling, p95 varied from 61.5ms to 33.2ms; route sampling also showed a 1-second
gap in the second run. These headless samples do **not** establish universal
60fps or smoothness on slower devices. Both runs retained 848 DOM nodes and stable
listener counts across 12 open/close cycles. Sixteen Korean route/width checks had
no horizontal overflow; forced-color screenshots were also captured.

The separately recorded four-cycle 4× source-panel trace showed event dispatch
up to 77.5ms, layout up to 16.5ms and paint up to 24ms. The prior release's same
capture showed event dispatch up to 110.7ms, layout 18.2ms and paint 19.3ms. This
supports retaining the known event-handler/performance limitation, rather than
attributing every stall to the added transition or claiming it is eliminated.
The follow-up trace, Playwright trace ZIP and normal-motion video are saved under
`.artifacts/motion-upgrade/followup/`. Device/field qualification remains open.

## Reproduction

From `apps/web`, build first, then run `npm run test:browser`. The fixture server
binds only loopback and supplies fictional source/research records. For profiling,
run `node e2e/server.mjs` from that workspace, then from the repository root:

```powershell
$env:MOTION_FOLLOWUP='1'
node apps/web/e2e/inspect-motion.mjs
services/api/.venv/Scripts/python.exe apps/web/e2e/measure-motion.py followup
```

This preserves the original before/after artifacts. The follow-up outputs live
under `.artifacts/motion-upgrade/followup*`. No new dependency or font was added.
Existing Next workspace-root/standalone test-server warnings remain; this work
does not alter deployment infrastructure, authentication or security headers.
