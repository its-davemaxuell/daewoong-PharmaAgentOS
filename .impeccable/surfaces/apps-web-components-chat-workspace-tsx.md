---
version: 1
slug: "apps-web-components-chat-workspace-tsx"
primary_target: "apps/web/components/chat-workspace.tsx"
related_targets: ["apps/web/app/chat-workspace.css","apps/web/components/chat-evidence-panel.tsx","apps/web/components/chat-library.tsx"]
---

## Scope and mode
Operate. FDA Warning Letter Chatbot at /ask and /chat/[id], for Korean and
English-speaking employees reviewing retained FDA evidence.

## Task and proof
Ask a question, inspect a grounded answer, and read its retained source passage.
Save, find, pin, rename, archive, restore and export conversations. Branch from
an answer or edit a question without overwriting the earlier transcript.

## Direction
Use the September 15 neumorphic working surfaces from DESIGN.md: a raised porcelain
conversation frame, recessed anchored composer, tactile task choices, retained
source passage and separate reader. Mobile send uses a 44px icon with its accessible
name intact. Press depth interpolates continuously; dialog entry/exit and focus
return retain the draft and source context.
The follow-up interaction pass adds quick tap/keyboard press feedback, animated
Find with Escape from every control, keyboard action-menu navigation, inert
disclosure exits and live reduced-motion changes. Positioned controls retain
their alignment while pressed. Mobile drawer contents survive the visual exit.
The September 12 visual refinement adds a source-to-review diagram, 32–48px
opening heading, short task choices and 18px conversation text. Keep examples
immediately visible, with 180–280ms interaction feedback and reduced-motion support.
The September 16 screenshot follow-up centers the welcome diagram, heading and
subtitle on the composer's axis. Reserve scrollbar space symmetrically in the
empty conversation view so its center does not drift on desktop.
The later September 16 request uses Daewoong orange/charcoal on warm porcelain,
with neutral text-entry focus and no compartment highlight. Menus and source
selectors fade out in 90ms and in over 160ms while retaining live state.
The reading pane is central: open a numbered citation without losing the conversation.
The narrow-screen reader temporarily occupies the workspace and restores focus
when closed. Model options remain secondary to the question and source selection.

## Constraints
Preserve anonymous browser-session ownership and signed API access. Select
authorized retained FDA letters rather than exposing arbitrary uploads. Keep
source-only fallback, streamed drafts, stopped requests and saved answers honest.
Feedback is a product signal, not a formal regulatory approval. No scope changes
to the research agent, internal controlled records, or specialist execution.

## Verification boundary
Browser fixtures cover restored trust labels, evidence focus return, locale,
mobile navigation and route geometry. Provider-side agent behavior is separate
from this frontend design; retain all existing authorization and provenance checks.
