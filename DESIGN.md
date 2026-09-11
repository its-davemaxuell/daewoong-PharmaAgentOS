# PharmaAgent OS — Clearer workspaces

The approved Clearer Workspaces refinement builds on the September 11 evidence
continuity specification and replaces earlier Layered Desk geometry. This is an Operate surface for a mixed employee audience, including QA,
regulatory-affairs and compliance specialists, using English and Korean in
ordinary office lighting.

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
24px desktop gutters and 16px mobile gutters. Overview leads with New research
and actual work in progress, followed by new FDA sources, personal Inbox updates,
topic counts and compact collection/work counts. With no active research, example
questions prepare a tab-local draft without starting a run. Unavailable counts use a dash.
Topic counts are not trend deltas; counts from paginated results carry a plus.

Primary navigation begins with RAG Chat and Research Agent. RAG Chat is the default
landing page. All supporting destinations have direct sidebar links grouped into
My work, Evidence library, Team review, Agent management and Utilities. Existing
role restrictions still apply. Recent conversations are expanded. Keep route
headings, commands, breadcrumbs and navigation labels consistent in both languages.
Personal Inbox triage remains separate from governed review and approval.

Use shared workspace headings and list surfaces. Main headings are 22/28 with one
short explanation and one dominant action. Toolbars sit directly above results;
pagination follows them. Research history stays at the left on desktop and is a
closed, accessible disclosure on mobile. The research question leads the new-task
screen; the process explanation is optional. Current activity and stop/resume remain
visible, while detailed execution events are collapsed. Source identity, version,
anchor and original passages stay visible; technical hashes sit in provenance
accordions. AI finding support labels and limitations also appear in saved briefs.

## Continuity and motion

The default shell never waits for all menus. Load each data region independently,
retain the owner-scoped query cache and prefetch route/data on navigation intent.
Legacy animated startup is opt-in with PORTAL_LEGACY_STARTUP_ENABLED=true.
Sidebar geometry changes over 200ms. Controls use 140ms color changes. Panels enter
with an 8px offset and opacity over 200ms. Reduced motion removes movement.
Route and URL-backed tab changes use a 200ms content-only opacity transition; the
shell, drafts and streaming state remain mounted. Selection indicators travel over
240ms; selected source rows change tint. Reduced motion disables animations.
Loading text becomes a small blue spinner with a screen-reader label.

The desktop inspector and its reserved content space share a 390px token.
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

## RAG Chat refinement — September 12

Use a full-width white workspace with a narrow, readable transcript and an anchored
composer. Primary header controls expose conversation history, find-in-chat and
new chat. Saved conversations expose Export beside their name. Keep model/scope
settings optional; source selection is explicitly labeled. Search navigates the
existing transcript without filtering or replaying it. Copy retains citations,
source provenance and the AI review label. Research handoff copies the question
into a draft and requires a separate Start research action.

The user declined company sign-in setup. Preserve the 30-day browser-session
model and owner authorization. Sharing uses existing exports; do not imply named
team collaboration. Usage reports display actual personal activity and research
usage with CSV export, never estimated chat costs or invented team statistics.
