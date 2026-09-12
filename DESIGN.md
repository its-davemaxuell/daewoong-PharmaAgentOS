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
remain. Local Pretendard supports both languages. The September 12 visual UX
refinement increases supporting page titles to 28–36px, section headings to 18px,
body to 16px, list labels to 15px and metadata to 13px. Chat answers use 18px;
chat and research original passages use 17px with generous line spacing.
Do not use global scaling.

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

Use shared workspace headings and list surfaces. Main headings are 28–36px with one
short explanation and one dominant action. Toolbars sit directly above results;
pagination follows them. Research history stays at the left on desktop and is a
closed, accessible disclosure on mobile. The research question leads the new-task
screen; the process explanation is optional. Current activity and stop/resume remain
visible, while detailed execution events are collapsed. Source identity, version,
anchor and original passages stay visible; technical hashes sit in provenance
accordions. AI finding support labels and limitations also appear in saved briefs.

## Continuity and motion

The animated all-menu preparation screen precedes the initial site reveal, as
explicitly requested by the user. Preload every authorized menu module and its
bounded entry data, history, fonts and opening page into the owner-scoped cache.
Keep progress honest, Retry and Continue available for failed/slow resources,
and reveal once without replaying startup during menu navigation. Enabled by
default; PORTAL_STARTUP_ENABLED=false is an explicit testing/emergency opt-out.
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

## Visual UX refinement — September 12

The user requested less text, more visuals, larger typography and smooth
transitions. Keep the neutral/blue identity and primary Chat/Research navigation.
Chat opens with a compact source → cited answer → human review diagram,
a 32–48px heading, one short sentence, and three visual task choices. On mobile,
choices become rows and the composer remains anchored. Suggestions fill an editable
question; sending remains a separate action. Settings use a concise Options trigger;
accessible labels retain their precise names. Answer and source content is intact.

Research uses a 30px page heading (27px mobile), a 24–32px question label and
17–18px input. Topic choices prepare drafts. Evidence setup is a disclosure;
scope and selected passages stay visible when it closes. A short three-step
diagram replaces process prose. Actual current activity leads its status panel.
Completed runs put the review brief before finished activity in DOM order.

Navigation text is 15px, with 16px primary destinations and larger existing icons.
All authorized routes stay direct. Recent chats appear only when records exist.
Supporting pages inherit the larger readable scale. Keep the original all-menu
startup. Diagram entrance lasts 560ms; hover and settings feedback 180–260ms;
sidebar motion 280ms. Keep choices immediately visible and respect reduced motion.
