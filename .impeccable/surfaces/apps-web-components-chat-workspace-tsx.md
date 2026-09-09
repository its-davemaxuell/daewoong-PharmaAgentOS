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
Extend the established navy/cobalt identity with a bounded conversation column,
persistent composer and a separate evidence reader. The reading pane is the
central interaction: open a numbered citation without losing the conversation.
The narrow-screen reader temporarily occupies the workspace and restores focus
when closed. Model options remain secondary to the question and source selection.

## Constraints
Preserve anonymous browser-session ownership and signed API access. Select
authorized retained FDA letters rather than exposing arbitrary uploads. Keep
source-only fallback, streamed drafts, stopped requests and saved answers honest.
Feedback is a product signal, not a formal regulatory approval. No scope changes
to the research agent, internal controlled records, or specialist execution.

## Outstanding
Hosted migration and deployment verification follow local implementation tests.
