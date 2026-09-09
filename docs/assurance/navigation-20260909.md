# Three-section navigation — 2026-09-09

The user requested three distinct areas for warning-letter chatbot work, agentic
work and system settings. This supersedes the previous everyday/specialist menu
grouping and retains the removal of the Home menu item.

| Section | Features |
| --- | --- |
| FDA Warning Letter Chatbot | Chatbot, warning letter library, saved sources, regulatory trends, authorized source review, chat history |
| FDA AI Agent | Research agent, local review drafts, specialist agents, team review records, approvals, agent evaluations |
| Settings | Preferences, Getting started, service operations, authorized administration |

The sidebar uses native disclosures, automatically opens the current section,
and recognizes saved conversation URLs as chatbot pages. Chat history remains
within the chatbot section, including search, new chat, archive and retry.
Existing role filtering and server authorization remain in place.

`/settings` provides the shared Korean/English preference, saved through the
existing browser preference mechanism, plus guide and service information.
The header retains its language shortcut and identifies the section and feature.
The guide now explains the same three areas.

Local verification passed:

- All 50 frontend tests, ESLint, TypeScript and the production build.
- 49 browser checks, covering seven destination routes and both languages at
  320, 390, 768, 1024 and 1440px widths.
- Correct active sections and links; no Home menu entry; authorized-only links
  hidden for a public viewer; chat history placement and new conversation access.
- Language preference persistence after reload, keyboard section expansion,
  mobile focus containment, Escape focus return and no horizontal overflow.
- No browser JavaScript errors and no UI detector findings. Desktop Settings
  and English/Korean mobile navigation screenshots were visually inspected.

Browser evidence is retained under `.artifacts/navigation-20260909/`, including
`browser-results.json` and screenshots. Checks used local preview data; real model
execution and production services were not retested for this navigation change.
The build emits the existing multiple-lockfile workspace warning.

Publication target: https://pharmaagent-os-ochre.vercel.app. The user authorized
deployment of all pending changes on 2026-09-09. The release uses GitHub `main`
in `its-davemaxuell/daewoong-PharmaAgentOS` and the connected Vercel project
`pharmaagent-os` in scope `davemaxuellkr-9654`.
Hosted verification evidence is recorded in `.artifacts/navigation-20260909/`.
