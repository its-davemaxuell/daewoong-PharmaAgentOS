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
Use the approved bright white/indigo desk from DESIGN.md: a floating conversation
compartment, raised persistent composer, inset source passage, and a separate reader. The reading pane is the
central interaction: open a numbered citation without losing the conversation.
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
