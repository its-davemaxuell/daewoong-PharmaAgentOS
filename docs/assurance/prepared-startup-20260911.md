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
  Firefox also passed its focused rerun. Final hosted/CI measurements follow release.

## API prerequisite deployment

Commit `cba4acc` adds the read-only Inbox preview and its regression test. All
589 backend tests passed locally; 10 existing infrastructure-gated tests skipped.
The API and worker Railway deployments both reported success before web release.

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
