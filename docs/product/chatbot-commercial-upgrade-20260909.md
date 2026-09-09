# Chatbot product research and implementation

Date: 2026-09-09. Scope: the FDA Warning Letter Chatbot in PharmaAgent OS.
The source implementation plan and implementation handoff remain authoritative.

## Product research

The comparison below uses official product documentation retrieved on the date
above. These are interaction patterns adapted for regulatory evidence review,
not a claim of feature parity with the products.

| Product | Relevant interface and capability | Application in PharmaAgent OS |
| --- | --- | --- |
| Gemini | Searchable chat history, pinned conversations, rename controls, and branching from a response. [Official guide](https://support.google.com/gemini/answer/13666746?hl=en) | A searchable, paginated conversation library; pins; inline rename; a conversation menu; branch and edit-question actions. Archive/restore keeps earlier work recoverable. |
| Perplexity | Sessions combine follow-up questions, answers, and the sources used to answer them. [Official guide](https://www.perplexity.ai/help-center/en/articles/10354769-what-is-a-thread) | Numbered citations open retained source passages, with version and hash metadata. Follow-up suggestions fill the composer for review before sending. Existing saved conversation context continues to drive retrieval. |
| Claude | Substantial standalone content can occupy a dedicated window beside the conversation, with copying and downloading. [Official guide](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) | An optional evidence reader keeps the retained FDA passage available beside the answer. Conversation exports include answer text and source provenance. |
| Claude projects | Projects group conversations with reference knowledge and project instructions. [Official guide](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects) | The composer can select up to ten authorized, current FDA letters as a focused comparison set. Existing case/research workflows remain the destination for longer investigations. |

## Delivered interface

- A restrained conversation workspace within the established navy/cobalt identity,
  with a fixed composer, readable answer measure, and compact source references.
- A desktop evidence pane and a full-width mobile reading view. Each exposes the
  exact retained passage, location, document version, available hash, and FDA link.
- A conversation library with server-side title/message search, pagination, pins,
  archive/restore, loading, retry, and empty states. Ctrl/Cmd+K opens the library.
- Rename, Markdown/JSON export, and archive/restore in the conversation menu.
- Branch from an answer; edit a question in a new branch while preserving the
  original. Edits prefill the new composer for deliberate resubmission.
- Helpful/unhelpful feedback that persists and can be changed or cleared.
- A searchable FDA-letter picker backed by server-side source authorization.
- Autosizing question input, character count, browser-tab draft recovery,
  copy failure feedback, suggested follow-ups, and jump to the latest answer.
- Semantic comparison tables, fenced code, existing inline citations, headings,
  lists, and quotes. Model/source HTML is rendered as text, never executed.
- Korean and English labels and keyboard/touch interactions.

## Backend contracts

All routes are under `/api/v1/chat/threads`. The API derives the owner from the
verified principal; foreign thread and message IDs return 404. Next.js server
actions authorize viewers and call the API using the existing signed assertion.

| Endpoint | Behavior |
| --- | --- |
| `GET /?q=...&page=...&archived_only=true` | Bounded server-side search over title and message text; archive-only view; pins precede recent activity. SQL wildcard characters in search are literal. |
| `PATCH /{id}` | Rename, pin/unpin, archive/restore, and existing model/source preferences. Null mutation fields are rejected. Archived conversations permit only restoration. |
| `POST /{id}/branch` | Copy a completed conversation prefix into a new owner-scoped thread. Include an assistant response, or exclude a user question for editing. New message IDs and remapped reply references preserve original text/citations without reusing request idempotency keys or feedback. Pending/failed prefixes are rejected. |
| `PUT /{id}/messages/{message_id}/feedback` | Set `helpful`, `unhelpful`, or null on a completed assistant response owned by the caller. Archived conversations are read-only. |
| `GET /{id}/export?format=markdown\|json` | Return a downloadable representation of persisted conversation content and citations; omit the private ownership field. |

The existing streaming protocol, stop/cancel handling, saved-message recovery,
model routing, evidence validation, source scope, and retrieval authorization stay
in use. A branch excludes later messages and clears the current document focus,
which may have been chosen after the branch point; source selection remains
available in the new conversation. Feedback is a user preference signal, not a
regulatory approval or model-training action.

## Deployment

Apply `infra/migrations/20260909_chat_workspace.sql` before deploying the API.
It adds nullable `chat_threads.pinned_at` and `chat_messages.feedback_rating`
columns and an owner/pin/activity index. It preserves existing records and RLS
policies. SQLite development databases receive equivalent columns through the
existing local schema-upgrade mechanism. CI applies the PostgreSQL migration
twice to check repeatability.

Deploy the API before the frontend. Roll back application code without dropping
the additive columns. This implementation does not itself publish a deployment
or mutate the hosted database.

## Deliberate boundaries

Conversation access continues to use the existing anonymous browser session.
This is not cross-device account synchronization. Draft recovery uses the current
tab's session storage; saved conversations use the backend database.

The letter picker selects retained FDA evidence. Arbitrary uploads, shared public
chat links, project-level custom instructions, voice, and generated executable
artifacts are outside this change. Internal controlled-document ingestion and
formal approvals remain in the platform's existing governed workflows. These
features require their own product and qualification work before exposure here.

Verification and limitations are recorded in the implementation handoff and
`docs/assurance/chatbot-workspace-20260909.md`.
