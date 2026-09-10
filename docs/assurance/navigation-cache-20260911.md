# Navigation caching upgrade — 11 September 2026

## Problem and baseline

The Sources server page awaited both the bounded source search and the legacy
saved-view listing before rendering. Its initial page did not use the persistent
browser query cache. Menu links disabled route prefetching, and Home fetched the
same first source page through a separate request.

Read-only Chromium measurements against the current production alias,
`https://pharmaagent-os-ochre.vercel.app`, on 10 September at 17:21 UTC:

| Destination | First visit | Second visit | Third visit |
| --- | ---: | ---: | ---: |
| Sources, first rows visible | 11,223 ms | 11,158 ms | 9,667 ms |
| Saved work, heading visible | 672 ms | 401 ms | 525 ms |
| Research, history panel visible | 714 ms | 895 ms | 514 ms |

These are three observed menu visits in one browser session, not population
percentiles. `apps/web/e2e/navigation-timing.mjs` repeats the sequence after Home
settles. Source timing requires actual rows; the other timings measure their
workspace shell, not completion of all background data reads.
The historical `pharmaagent-os.vercel.app` alias is not this current production
surface and must not be used for release verification.

## Implementation

- Sources renders a client workspace immediately and reads the same session-scoped
  query as Home and menu preloading. Source pages stay fresh for 60 seconds;
  inactive query entries remain in memory for up to 15 minutes. Other workspace
  queries retain their 30-second freshness interval and active research polling.
- A bounded first source page warms after idle. Sources, Research, Saved work and
  Inbox route payloads preload through Next's public full-Link-prefetch API.
  Other sidebar menus preload on pointer, keyboard focus or touch intent.
  Reduced-data and 2G connections skip speculative work.
- Research history and saved briefs share query definitions with intent
  preloading. Inbox data is not speculatively read because its first read
  establishes the personal triage horizon.
- Bookmarks load in a separate bounded batch. Unknown saved status disables the
  individual toggle until known; bookmark failure leaves source results usable
  and offers a dedicated retry. Removing a source invalidates the batch cache.
- Cached Sources, Research, Saved work and Inbox lists remain visible when
  background refresh fails. Source filter requests share in-flight work, preserve
  previous results on failure and cannot overwrite a newer query's results.
- Existing signed-session isolation, server authorization, private/no-store HTTP
  responses, saved-work revisions and source provenance are preserved. The cache
  is memory-only and clears with its session provider; no service worker, browser
  disk persistence, shared server cache or database migration is introduced.

## Verification record

Production build, TypeScript, ESLint and 77 frontend unit tests passed during
implementation. Cache tests cover request deduplication, filter/owner isolation,
invalidation, failed refresh recovery and malformed-response rejection.

The first browser pass exposed the duplicate Home source request. Home now uses
the same query as Sources. A later refinement changed route preloading from the
router's partial default to full Link preloading to reduce route-server waits.

All 24 focused cache/navigation checks passed across Chromium, Firefox and
WebKit after test corrections. They cover preloading, independent bookmark
loading, single-request cache reuse, cold-error recovery, stale refresh failures,
filtered Back navigation, bookmark removal, saved-list retention and accessible
navigation groups. The broader preceding regression pass passed 86/87 checks;
its remaining request-count assertion included the intentional idle first-page
preload. The trace showed exactly one page-2 read and one page-1 preload. The
corrected assertion counts only the page being restored and passes in all engines.

A speculative Next RSC stream can remain open until activation in Chromium.
The preloading test therefore observes the successful route response and working
navigation rather than waiting for end-of-stream or claiming offline navigation.

Final local production-build timings at 17:43 UTC:

| Destination | First visit | Second visit | Third visit |
| --- | ---: | ---: | ---: |
| Sources, first rows visible | 1,270 ms | 75 ms | 69 ms |
| Saved work, heading visible | 82 ms | 58 ms | 58 ms |
| Research, history panel visible | 85 ms | 104 ms | 62 ms |

No page errors were observed. This local fixture measurement does not substitute
for the hosted comparison; first visits can still wait for data or route code.

## Publication

Pending final verification and publication through the existing GitHub-to-Vercel
production integration. Railway services consume the same repository; this
change contains no API or worker behavior changes.
