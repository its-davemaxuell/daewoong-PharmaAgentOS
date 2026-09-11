# Prepared startup — 11 September 2026

## Behavior and implementation

Every new document presents the user's FDA-folder animation while preparing all
accessible menu modules and initial query data. Internal navigation retains the
same startup gate and owner-scoped QueryClient. Default Sources, Home and Chat
share their bounded first source page; Sources also prepares its bookmark batch.
Research history is shared with Home. Secondary menu views use thin Next routes
and authenticated, explicitly allowlisted `/api/portal/menus/{menu}` reads.
Restricted responses prepare an access-state screen; failed or malformed reads
never count as successful preparation. Server-action route revisions invalidate
menu queries while retaining their current content. Bookmark writes also
invalidate the legacy saved-sources menu.

The original supplied PNG is unchanged. The deployed WebP is a lossless encoding
of the same 1536 × 1024 pixels: 875,750 bytes versus 1,401,023 bytes (37% smaller).
Its 6 × 4 grid is animated in row order at 12 frames/second using CSS. Pixel
equality was checked by decoding both images with Sharp. The initial reveal is
600 ms opacity; reduced motion uses a still frame and immediate reveal. The
animation pauses when the document is hidden. Unrevealed content is inert, and
inspectors/command dialogs cannot open over the loading screen. A no-script
message explains how to restore the workspace.

Four menu tasks run concurrently, reduced to two for save-data/2G connections.
The destination starts first, followed by independent operations, trends and
evaluation reads. This keeps menus sharing the source-page promise from delaying
those independent requests behind several occupied workers.
Each task has a 30-second completion bound; at 15 seconds, or immediately after a
failure, users can retry unfinished work or continue with available menus. Module
imports, query promises, sidebar state, fonts/artwork and the rendered destination
determine readiness. Full Link prefetching improves routing but is not a readiness
signal. Performance marks: `workspace-startup-start`, `workspace-startup-ready`,
and `workspace-startup-entered`. Explicit Continue records
`workspace-startup-continued` instead of claiming all preparation succeeded.

Inbox preview adds `preview=true` to the existing GET API without changing its
response schema. It neither locks nor commits a personal horizon. An actual Inbox
visit uses the existing read and presents preview content while reconciling that
response. Backend tests verify repeated previews do not create a preference and
that existing horizons remain unchanged. No schema migration is needed.

Trends calculations retain their existing semantics on the server and send only
the computed presentation summary to the browser. The legacy saved-sources view
also sends only its saved entries. Additional pages, filters and record details
remain on demand. Initial direct links retain their URL and wait for the requested
view; caches continue to refresh in the background after entry.

## Verification

- Production build (including TypeScript) and ESLint passed. All 88 frontend
  unit tests passed. Coverage includes bounded scheduling, cancellation, menu/role
  coverage, query identity/normalization, private access states and server failures.
- All 15 startup browser checks passed across Chromium, Firefox and WebKit: all-menu
  navigation, 24 distinct frames, Retry, delayed Continue, direct-link preservation,
  Korean mobile, reduced motion, refresh, no-script fallback, a real save action,
  and no replay during internal navigation. The HTTP-only fixture forwards a
  signed test session through Playwright's API transport for WebKit data/action
  requests; production Secure cookie behavior is unchanged.
- The pre-existing geometry test used network-idle as a proxy for render readiness.
  A trace showed a speculative RSC stream retained on Trends after the screen was
  ready. It now checks the actual heading and absence of initial loading markers.
  It also waits for the actual JSON warmup before unloading a document, avoiding
  WebKit's aborted-fetch access-control error in the test harness.
- Shared evaluation/operations form defaults moved out of `use server` modules:
  those modules may export only async actions. An actual source-save action after
  all-menu preparation guards against invalid server-action registration.
- The initial full local regression had 211/213 passing, with the two failures in
  that geometry synchronization check. Its corrected Chromium/WebKit rerun passed;
  Firefox also passed its focused rerun. Final CI passed all 213 regression and
  all 15 startup browser tests on `f40f82b`.
- All ten quality/security jobs and the separate code-security workflow passed,
  including both runtime container builds, schema/contract checks and secret scan.
  Backend CI passed 589 tests with 10 existing infrastructure-gated skips.

## API prerequisite deployment

Commit `cba4acc` adds the read-only Inbox preview and its regression test. All
589 backend tests passed locally; 10 existing infrastructure-gated tests skipped.
The API and worker Railway deployments both reported success before web release.
Two fresh production preview reads also retained moving provisional horizons,
confirming they did not establish a persisted personal start date.

## Production publication

The web implementation is `1d0c4b2`, followed by startup ordering improvement
`f40f82bcf42cf5df7b673baff1c126081880c478`. Vercel, Railway API and Railway worker
all report successful deployment for the final application revision.

- [Web deployment](https://vercel.com/davemaxuellkr-9654/pharmaagent-os/HksmkLz7E3BiwagUXEGQeAdT761H)
- API deployment: `8aa3a5fe-f89b-4025-9ff2-e9e0975a7adb`.
- Worker deployment: `101b8e21-3c30-44ed-9f51-f39a8a96d42c`.
- [Final application CI](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34551425567): success.
- [Code security](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34551425569): success.

Initial hosted startup measurements were 27–34 seconds. The ordering refinement
starts independent aggregations earlier while keeping four workers, the same
queries and the same readiness requirements. Six fresh contexts on the final
revision passed all-menu navigation, no repeated loader, one source-page read,
no page errors and no horizontal overflow. No check used Continue to enter.

| Browser / layout | Startup | Median menu visit | Menu visit range |
| --- | ---: | ---: | ---: |
| Chromium / English desktop | 22.6 s | 99 ms | 73–363 ms |
| Chromium / Korean mobile | 20.4 s | 340 ms | 103–537 ms |
| Firefox / English desktop | 17.2 s | 100 ms | 76–286 ms |
| Firefox / Korean mobile | 16.9 s | 274 ms | 100–397 ms |
| WebKit / English desktop | 17.6 s | 598 ms | 360–16,972 ms |
| WebKit / Korean mobile | 17.7 s | 643 ms | 386–1,030 ms |

Mean startup improved from 29.3 to 18.7 seconds (36%) in these six checks. Timings
include browser automation action/readiness waits on Windows; they are observations,
not latency guarantees. One WebKit Saved visit had a 16.97-second outlier. Three
additional fresh contexts, with network traces and browser event/heading timestamps,
did not reproduce it: six Saved visits rendered their heading 180–236 ms after the
click. The original outlier is retained in
[the measurements](prepared-startup-measurements-20260911.json).

Cold entry still waits for the source/service reads (Sources approximately 11 s;
operations approximately 14–15 s in these traces). Recovery appears at the specified
15-second deadline, and automatic reveal occurs when the remaining reads complete.
The initial preparation cost is intentionally paid before menu browsing.

## Release and rollback

1. Publish the API preview behavior and wait for its production deployment.
2. Publish the web changes, then verify the production alias
   `https://pharmaagent-os-ochre.vercel.app`.
3. Verify loader appearance, actual readiness, every accessible menu, English and
   Korean/mobile behavior, browser errors and warm navigation timings.
4. To bypass startup preparation, set `PORTAL_STARTUP_ENABLED=false` on the web
   service and redeploy. Existing cache-backed screens remain available. The
   additive Inbox preview API can stay deployed.

Startup moves work into first entry; it does not promise instant cold downloads,
offline routing, or preloading every source and research record.
