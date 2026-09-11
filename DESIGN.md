# PharmaAgent OS — Evidence continuity

The September 11 full UI/UX specification supersedes the previous Layered desk
visual direction. This is an Operate surface for QA, regulatory-affairs and
compliance professionals using English and Korean in ordinary office lighting.

## Direction contract

Evidence stays fixed; intelligence moves around it. Persistent navigation,
compact working geometry and side-by-side provenance create continuity. Use a
restrained neutral palette and a single blue accent. Preserve real source data,
version checks, browser-session ownership, existing authorization and drafts.
Never invent metrics, FDA findings, confidence, review decisions or similarity.

## System

Canvas #F7F8FA, surface #FFFFFF, inset #FBFBFC, text #202124, secondary #667085,
border #E6E8EC, blue #2563EB, blue tint #EFF6FF. Existing semantic status colors
remain. Local Pretendard supports both languages. Page titles 22/28, section
headings 15/22, body 14/21, table labels 13/20, metadata 12/18. Source prose retains
15px with generous line spacing. Do not use global scaling.

Spacing uses 4/8/12/16/20/24/32/40px. Controls 32–40px desktop, at least 40px on
mobile. Corners: 4px small labels, 6px controls, 8px panels, 10px major overlays.
Panels have borders with no shadow; floating overlays may have a modest shadow.
No gradients, decorative layers, bounce, glow, glass or marketing-size headings.

## Composition

Fixed 232px sidebar collapses to a 56px icon rail. A persistent 54px top bar
contains location, language, notifications and Ask AI. Main content is fluid with
32px desktop gutters. Overview leads with real collection/work counts, recent
FDA activity, work in progress and topic counts. Unavailable counts use a dash.
Topic counts are not trend deltas; counts from paginated results carry a plus.

Primary navigation: Overview; Intelligence (Cases, Evidence, Trends); Work
(Reviews, Saved). Recent conversations and Research remain accessible below.
Settings and Help sit at the bottom. Operations is visible only to admins.
Research, governed approvals, evaluations and agent details retain deep routes;
normal discovery does not require navigating architecture pages.

## Continuity and motion

The default shell never waits for all menus. Load each data region independently,
retain the owner-scoped query cache and prefetch route/data on navigation intent.
Legacy animated startup is opt-in with PORTAL_LEGACY_STARTUP_ENABLED=true.
Sidebar geometry changes over 200ms. Controls use 140ms color changes. Panels enter
with an 8px offset and opacity over 200ms. Reduced motion removes movement.
Do not animate all properties or introduce full-screen route fades.

Case tabs reflect their view in the URL. Citation selection keeps the finding
visible and opens the exact retained original section in a right inspector.
Ask AI uses an explicitly visible removable source context and does not replace
the case route when a conversation is saved. Closing the panel retains its chat.
Comparison stores up to four source IDs in the session tab and shows source
metadata and stored summaries. No computed similarity or approval is implied.
Command palette opens locally before any remote search; Ctrl/Cmd K opens it.
Ctrl/Cmd J opens the assistant. Dialogs restore opening focus. Mobile navigation
uses a native modal drawer. Tables can scroll within their own bounded region.

## Qualification

Retain the existing icon set, source language, original links, cited output and
review restrictions. Public triage is distinct from governed approval. UI-only
redesign cannot qualify unfinished personal execution, specialist pipelines,
PDF page coordinates, review assignments or regulatory confidence scoring.
Verify desktop/mobile, both languages, keyboard, reduced motion, cached/error
states and actual source passages. Screenshots use explicitly fictional fixtures.
