# Linear: design, workflow and responsiveness research

**Research date:** September 10, 2026

**Purpose:** A reusable reference for applying Linear's interaction quality to PharmaAgentOS, not a pixel-perfect clone or a compliance assessment.

## Read this distinction first

This research reviews primary public documentation, dated design/engineering accounts and the current feature surface. It extracts documented behavior and implementation evidence. It does **not** contain an authenticated app DOM dump, private source code, a current canonical token export, or measured Linear latency/frame traces. All numerical layout/motion values in the adaptation are recommendations. The included browser script can capture runtime evidence on a page you are authorized to inspect; it was not run against Linear here.

The public Start Guide links a demo whose edits reset on refresh; settings and SLAs are excluded. That is a useful inspection entry point but not proof of the complete paid product. [S39]

**Central synthesis:** responsiveness is an interaction system, not an animation library. The useful combination is predictable geometry, quick acknowledgment, reusable commands, limited rendering work and truthful asynchronous states. The architecture evidence supports this interpretation; the specific implementation below is an original recommendation.

## 1. What is documented, and how current is it?

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| March 2026 design refresh | Quieter sidebar, compact tabs, fewer icons/separators, warmer low-chroma defaults. [S01] | Exact current CSS values for every theme/state. |
| March 2024 redesign account | Inverted-L shell; structured view families; LCH themes from base/accent/contrast; Inter Display headings and Inter UI text at that time. [S02] | That every September 2026 screen resolves the identical font or dimensions. |
| Current engineering role | React, MobX, styled-components; proprietary WebSocket sync; GraphQL; Node/Postgres/Temporal/Redis; virtualized-list profiling. [S03] | A requirement to migrate your project to that stack. |
| January 2024 engineering postmortem | Local client caching and mutation sync packets; caches can conceal inconsistent server state. [S04] | A guarantee of perfect reliability or a recommendation to cache sensitive data indiscriminately. |
| Current feature docs and dated releases | Product behavior and relevant plan caveats. | A live test of every documented feature in your account. |

### The website is not the application

Treat the public marketing site and daily work surface as separate design targets. A dramatic hero screenshot is not a useful specification for an evidence reader, keyboard-controlled table or document editor. A faithful transfer means reproducing useful interaction contracts, not importing decorative landing-page effects.

## 2. Interface anatomy: design a coordinated system

The layout decomposition below is an original implementation model informed by Linear's documented view families, issue interactions and navigation. [S02, S13–S17]

```text
Workspace shell
  Sidebar: global destinations and saved context
  Content region
    Location bar: where am I, who/what owns this, page-level actions
    View bar: search, filters, grouping, sort, display
    Work surface: list / board / timeline / document
    Optional inspector: selected object's metadata or evidence
  Overlay layer: command menu, property picker, dialog, toast
```

Do not give each page an unrelated header, search pattern or menu implementation. Reuse the same components with different data, labels and permission policies.

### Component contracts to implement

| Component | Visual and spatial role | Behavior contract for your implementation |
|---|---|---|
| Sidebar | A quiet, consistently aligned navigation column. | Preserve position and expansion. Show selected destination separately from hover. Badge meaning stays consistent. |
| Location bar | Stable title/breadcrumb and page actions. | Keep action positions predictable. Do not replace the whole bar during a child fetch. |
| View bar | Compact lens controls for the active dataset. | Filter/search changes do not recreate the shell. Encode shareable filters in a URL or saved view. |
| Navigation item | Icon, label and optional trailing badge on shared alignment tracks. | Entire target is usable, keyboard focus visible, tooltip only supplements—not replaces—accessible naming. |
| Issue/result row | Dense, aligned title and secondary metadata. | Hover, keyboard highlight and bulk selection remain distinguishable. Do not change row height merely on hover. |
| Property chip | Small status/owner/label selector. | Click opens an anchored searchable picker; keyboard selection and clear/none are available where valid. |
| Popover | Local choice without losing surrounding context. | Keep the anchor stable; handle viewport collisions; Escape closes and focus returns. |
| Command menu | Fast, context-aware actions and navigation. | Reuse the same authorized action handlers as buttons and menus. Group results; expose shortcuts. |
| Global search | Locate entities and content. | Distinguish it from current-view filtering and action execution; stale responses cannot replace newer queries. |
| Peek/inspector | Inspect detail while retaining the source list. | Close returns to the selected row and its scroll position. Back/forward behavior is deterministic. |
| Editor | Primary content, unobtrusive formatting. | Preserve selection and drafts; scope hotkeys; avoid rerendering the entire editor for unrelated metadata. |
| Bulk toolbar | Temporary actions for an explicit selection set. | State the selection count and scope. Destructive operations require a clear preview/confirmation. |
| Progress surface | Describe long-running work honestly. | Show meaningful stages, Stop/Retry where supported, and durable job state. Do not fake percentages. |
| Toast | Brief acknowledgment for non-critical events. | Do not use a vanishing toast as the only record of a failed save or a consequential decision. |
| Empty state | Explain a missing dataset or no-match condition. | Differentiate first use, no matches, permissions, offline, error and genuinely empty results. |

Linear explicitly distinguishes highlighted versus selected issues, offers bulk operations and supports keyboard actions. Its search documentation separates global search from current-view search; its editor can scope the same shortcut to a different action. [S14–S16]

### Reuse one action registry

Recommended action shape:

```ts
type Action<Context> = {
  id: string;
  label: string;
  shortcut?: string;
  isVisible(context: Context): boolean;
  isEnabled(context: Context): boolean;
  execute(context: Context): Promise<void> | void;
};
```

Buttons, context menus and command results should call the same domain operation. Server authorization remains mandatory: hiding or disabling an action is not an access-control boundary. Exclude global single-letter shortcuts while typing in inputs, editors, or an active Korean IME composition. Keep operating-system/browser conventions where practical.

## 3. Proportions: recommended starting specification

**These values are not scraped Linear measurements.** They translate the interaction principles into your previously chosen bright, layered PharmaAgentOS workspace. Minimum sizes must grow when translated text wraps or zoom increases.

| Element | Proposed default | Why this value is useful |
|---|---:|---|
| Sidebar | 240 px; adjustable 220–256 px | A steady navigation anchor without dominating a laptop screen. |
| Location bar | 52 px | Space for hierarchy and major actions. |
| View bar | At least 44 px | Filters and display controls fit without looking like a second hero. |
| Navigation item | At least 36 px | Dense pointer usage without relying on a tiny icon target. |
| Result row | At least 40 px; comfortable mode 48 px | Compact lists with an accessibility/density alternative. |
| Standard control | At least 36 px; 44 px for touch-focused use | Avoids copying a small visual glyph as a small hit area. |
| Visual icon | Usually 16 px | Consistent optical scale; target can be substantially larger. |
| Main gutter | 24 px desktop; 16 px narrow | Keeps the work surface aligned to headers and panels. |
| Inspector | 352 px; adjustable 320–384 px | Fits metadata/evidence controls without replacing the task. |
| Reading column | Maximum 68 ch as a starting point | Separates long-form readability from table density. |
| Spacing | 4, 8, 12, 16, 24, 32 px | A small vocabulary rather than one-off margins. |
| Corners | 8 px control, 10 px tray, 16 px panel | Matches the existing layered-desk direction. |

At 1440 CSS px, a 240 px sidebar leaves 1200 px for the work region. A 352 px inspector leaves 848 px before gutters/dividers. That calculation is a layout proposal, not a measurement of Linear. At narrow widths, switch the inspector to an overlay or a separate detail view rather than compressing every column. Show fewer row fields before shrinking body text.

Use CSS grid with `minmax(0, 1fr)` for the content track and `min-width: 0` for flex/grid children. Give long identifiers a deliberate overflow policy. Use tabular figures only for numbers that benefit from stable alignment. Test Korean and English labels independently; the same pixel width can accommodate very different content.

### Typography adaptation

Use one coherent UI family, with 14–15 px controls/tables, 13 px metadata, 16 px body, 18–20 px panel headings, 28–32 px page titles, and 16–17 px source reading at around 1.7 line height. These are proposed sizes. The supplied CSS uses the system stack and includes no font files. A licensed Inter setup may be chosen separately; the documented 2024 type choices are historical evidence, not a measured September 2026 font manifest. [S02]

## 4. Palette and surface hierarchy

Linear's 2026 refresh reduces saturation and the prominence of navigation; this is a relationship between surfaces and attention, not an instruction to make every application dark. [S01] For PharmaAgentOS, retain the established light identity:

| Semantic role | Proposed value |
|---|---|
| Main text | `#202332` |
| Secondary text | `#626779` |
| Accent / selected action | `#5856d6` |
| Strong accent / focus | `#4442b8` |
| Selection wash | `#eeedff` |
| Main panel | `#ffffff` |
| Canvas | `#eef0f6` |
| Inset surface | `#f5f6fa` |
| Decorative separator | `#e1e4ee` |
| Meaningful control boundary on white | `#858b9d` |
| Meaningful control boundary on canvas | `#767d90` |

A calculated contrast check gives `#858b9d` about 3.40:1 against white but only 2.98:1 against the canvas. The proposed `#767d90` canvas variant gives about 3.61:1. These are calculations for the adaptation, not extracted Linear colors.

Maintain only three elevation levels: canvas, work panels, overlays. Avoid giving every small control a card border and shadow. Reserve accent for meaningful actions and selected context; reserve semantic status colors for actual status. Use icon/label/shape alongside status color.

A pale decorative divider and a necessary control boundary have different accessibility obligations. WCAG 2.2 specifies 4.5:1 normal-text contrast, 3:1 for qualifying large text and relevant non-text UI contrast; minimum target size at AA is 24 by 24 CSS px or an applicable exception. The 44 px touch recommendation is a stronger design target, not the universal AA minimum. [S42]

Do not equate low visual noise with low legibility. Test selected, hover, disabled, focus and error states on every surface. Check translucent colors after compositing against their actual background.

## 5. Feature map: how the app works

### The data model comes before the screens

An issue belongs to a team and can independently be associated with a project and a cycle. Projects group work around outcomes; initiatives group projects around strategy. Milestones organize issues within a project. Cycles are repeating team planning periods. Views are perspectives on the same records. This is not one strict tree with cycles underneath projects. [S07, S12]

### Feature inventory

The inventory covers the principal feature families, not every minor setting or every third-party integration. The CSV expands this to 33 feature groups.

| Category | Feature | Operational role |
|---|---|---|
| Execution | Issues, metadata, workflows | Track individual work in team-defined statuses. [S07, S08] |
| Execution | Templates and recurrence | Reuse structure and create periodic work. [S08] |
| Execution | Parent/sub-issues and due dates | Break down tasks and track deadlines; an SLA replaces a manual due date. [S51, S52] |
| Execution | Relations/dependencies | Identify blockers, related work and canonical duplicates. [S09] |
| Planning | Projects/milestones | Coordinate a deliverable and meaningful stages. [S10] |
| Planning | Initiatives | Connect project delivery to strategy. [S11] |
| Planning | Cycles | Plan repeating near-term team work, not release versions. [S12] |
| Navigation | List/board/custom views | Change perspective without duplicating the underlying work. [S13, S17] |
| Navigation | Search/quick open/commands | Find work or execute context-sensitive actions. [S15] |
| Navigation | Bulk actions | Act on a deliberate multi-selection. [S14] |
| Collaboration | Editor/documents | Write plans and context using rich structured content. [S16] |
| Collaboration | Inbox/Priority Inbox | Separate urgent attention from other notifications. [S18, S19] |
| Collaboration | Pulse | Read project/initiative updates and digests. [S20] |
| Intake | Triage | Review new work before ordinary execution. [S21] |
| Intake | Customer requests | Link demand and customer context to issues/projects. [S22] |
| Intake | Asks | Route Slack/email/form requests into work and requester conversations. [S23] |
| Intake | Issue SLAs | Monitor time-sensitive issue targets. [S24] |
| Analytics | Insights | Analyze a filtered work set and drill into records. [S25] |
| Analytics | Dashboards | Combine multiple analytical blocks. [S26] |
| Development | GitHub integration | Relate PRs/commits to issues and automate development-state updates. [S27] |
| Development | Reviews | Inspect, discuss, review and merge connected PRs in-app. [S28] |
| Development | Releases | Track work against environments and deployment stages. [S29] |
| AI | Linear Agent | Ask questions and perform permitted workspace actions. [S30] |
| AI | Triage Intelligence | Suggest routing/properties/duplicates, optionally apply configured automation. [S31] |
| AI | Loops | Run scheduled or event-triggered agent workflows. [S33, S50] |
| AI | Coding sessions | Execute coding agents in managed environments and bring output into review. [S34] |
| Platform | MCP/agent API | Integrate external assistants and native agents. [S35, S36] |
| Administration | Identity/access controls | Private teams, guests, SAML, SCIM and application governance. [S37] |
| Personalization | Preferences | Change home view, font size, theme and other account behavior. [S38] |

Priority Inbox's dated launch is September 3, 2026, and Loops launched July 20, 2026. An older tour that shows only issues, projects and cycles is incomplete for this research date. [S19, S50]

Plan caveats matter: Insights, issue SLAs, Releases and Triage Intelligence are documented for Business/Enterprise; Dashboards for Enterprise. Asks channels have distinct gates, with web forms part of Enterprise Advanced Asks. Coding sessions are documented for Basic/Business/Enterprise and have AI usage limits. Verify entitlement before promising a feature to a team. [S23–S26, S29, S31, S34]

### One end-to-end example

An incoming customer request becomes an issue through an intake channel. Triage decides whether to accept, clarify or deduplicate it. The team associates accepted work with an outcome/project and, when appropriate, a planning cycle. Development links a PR to the issue; review evaluates the change; release tracking records where it actually shipped. Notifications, customer context and analytics keep the same work visible from different perspectives. This example is a synthesis of the documented workflows, not a recording of an executed session. [S21–S23, S27–S29]

**Transferable design principle:** share an entity model across screens so that an update in one place is not contradicted elsewhere.

## 6. Where the smoothness comes from

### 6.1 Documented engineering evidence

Linear publicly identifies a proprietary WebSocket sync framework with offline support and a React/MobX frontend; it also specifically describes virtualized-list performance work. [S03] Its engineering postmortem confirms that client caches hold much workspace data and that mutation sync packets update replicas. [S04] Older changelog entries discuss warm-start loading and lazy loading; these are historical practices, not proof of today's bundler. [S48]

This supports the inference that common interactions can often work with already-available state instead of waiting for a fresh page-wide network request. It does **not** establish an independently measured universal latency, a particular animation library, or that every action works offline.

### 6.2 Adapt the architecture, not the vendor stack

Keep the existing Next.js/FastAPI architecture unless profiling identifies a specific limit. Next.js supports shared layouts, prefetching, streaming and client-side transitions; TanStack Query supports pending/optimistic UI and rollback. Those are sufficient ingredients for a first implementation without recreating Linear's entire synchronization system. [S44, S45]

Recommended sequence:

1. **Persistent shell:** sidebar, header and active workspace context survive route changes. Page-specific loading boundaries do not blank everything.
2. **One client representation of server records:** use the project's established data cache or introduce one deliberately. Avoid divergent copies in table state, editor state and chat state.
3. **Cheap immediate acknowledgment:** selection, pressed state and “Saving…” do not wait for the server.
4. **Selective optimistic mutation:** apply a reversible pending value for low-risk edits. Track operation IDs, server entity versions and explicit acknowledgment.
5. **Truthful reconciliation:** accepted server state wins; show conflicts; rollback only the failed mutation rather than overwriting later edits with an obsolete whole-list snapshot.
6. **Scoped refresh:** update affected records and counters, not every view in the workspace. Batch event bursts.
7. **Intent-based prefetch:** fetch likely detail views with a bounded budget. Do not prefetch every linked document in a huge table.
8. **Streaming jobs:** show retrieval/progress/output as separate phases. Persist long-running job IDs so a page refresh does not pretend the task disappeared.

A useful state machine is:

```text
idle -> editing -> queued/pending -> acknowledged
                         |             |
                         v             v
                       failed       synchronized
                         |
                    retry / revert
```

For consequential evidence or approval workflows, use `pending` until authoritative validation completes. Never show “verified,” “approved,” or “saved on server” simply because the interface updated optimistically. This is a product safety recommendation for your evidence-first application, not a claim about a particular regulatory requirement.

### 6.3 Rendering discipline

Keep row components narrow and updates localized. MobX's official guidance supports small reactive component boundaries, but the general strategy can be applied without adopting MobX. [S47] Virtualize long lists only after understanding keyboard, screen-reader, dynamic-height and browser-find implications. Preserve stable keys and selected-record identity.

Lazy-load expensive readers, charts and editors when appropriate. Do not repeatedly measure the DOM and then change layout within the same animation loop. Reserve known panel space and avoid font swaps or skeletons that alter geometry unnecessarily. Avoid unbounded syntax highlighting or rendering an entire large source document when only one section is needed.

The browser commonly handles transform/opacity animations more cheaply than changes that trigger layout/paint; compositing is not free or guaranteed. Profile actual layers and main-thread work rather than adding `will-change` to everything. [S40]

### 6.4 Motion specification — original proposed values

| Interaction | Suggested duration | Suggested motion |
|---|---:|---|
| Hover/pressed feedback | 80–120 ms | Color/opacity only; state acknowledged immediately. |
| Property picker | 120–160 ms | Fade plus roughly 4 px translation. |
| Dialog | 160–200 ms | Fade plus roughly 6 px translation, no bounce. |
| Inspector/peek | 180–220 ms | Small directional continuity; reserve geometry first. |
| Closing feedback | 100–140 ms | Usually shorter than opening. |
| Row selection | Immediate | Do not animate every row into place. |
| Long-form reading | None by default | Stable text and stable scroll. |

Proposed easing: `cubic-bezier(0.2, 0, 0, 1)` for entry and `cubic-bezier(0.4, 0, 1, 1)` for exit. These are not recovered Linear curves. Repeated commands should interrupt or replace an animation, never queue ornamental delays. Use transform/opacity for small enter/exit transitions; avoid animating the full grid width on every inspector toggle.

Honor `prefers-reduced-motion`; remove spatial transitions but retain focus, success/failure feedback and instant state changes. Do not use smooth scrolling as a mandatory navigation dependency. [S43]

### 6.5 Tool choices and their limits

| Need | Suitable starting choice | Constraint |
|---|---|---|
| Route continuity | Existing Next.js layouts and links | Dynamic routes still need loading/error boundaries. [S44] |
| Server state | Existing cache, or TanStack Query | Concurrent mutations need reconciliation beyond naive rollback. [S45] |
| Dialog/picker behavior | Existing accessible primitives, or Radix | Style the components; do not remove focus management. [S46] |
| Micro-motion | CSS transitions/keyframes | No animation framework is required for simple enter/exit. [S49] |
| Large datasets | Measured virtualization approach | Test accessibility, reading order and dynamic content. |
| Complex movement | Add a focused motion library only when justified | Do not introduce one merely to restyle buttons. |

Linear has documented a Radix-based Select historically; that is not proof that every current widget uses Radix or that its smoothness comes from a single package. [S06]

## 7. Measurement protocol: prove smoothness rather than describe it

### Proposed budgets, not measured Linear results

| Metric | Initial goal | Measurement scope |
|---|---:|---|
| Local feedback | p95 below 100 ms | Click/keypress to visible acknowledgment. |
| Warm cached view navigation | p95 below 100 ms | Activation to useful cached content, with dataset/device defined. |
| INP | At most 200 ms at p75 for good field responsiveness | Segment real users by device type; not equivalent to a single trace. [S41] |
| 60 Hz rendering frame | Roughly 16.7 ms total | Frame-time arithmetic, not an app-only JS budget. |
| 120 Hz rendering frame | Roughly 8.3 ms total | Leave headroom for browser work. |
| Save durability | Report separately | Do not conceal server delay behind “instant” UI. |

Run production builds on a realistic laptop, not only a development build on a powerful desktop. Include 100, 1,000 and 10,000 result fixtures; text-heavy rows; long Korean/English titles; multiple tabs; slow and failed network calls; permission changes; reconnect; fresh login; warm revisits; and simultaneous edits. Preserve the raw traces and name the device, viewport, browser and dataset.

Measure at least four different events: interaction acknowledgment, useful content, durable server acknowledgment, and final animation completion. A 140 ms CSS transition is not a 140 ms network interaction benchmark. Report percentiles and failure rates, not just the fastest anecdote.

## 8. Public extraction and runtime audit procedure

### What this package actually contains

`source-catalog.json` and `feature-map.csv` are structured syntheses of public sources. `design-reference.json` and `linear-inspired-light.css` are original proposed design values. `browser-design-audit.js` is a measurement helper, not a file of previously measured Linear values. An original offline `reference-preview.html` demonstrates filtering, selection, detail inspection, a command dialog and reduced-motion styling. It contains fictional data and is not a Linear recording. No third-party font files, private code, full copied articles, session data or authenticated screenshots are included.

### A reproducible audit

Open the official demo through the Start Guide or use an account/workspace you are authorized to inspect. Record a page/state label and manually note theme, zoom, viewport, browser and data context. Wait for fonts/content to stabilize. Capture a default list, a selected row, a focused control, a property picker, a command menu, a detail inspector, an editor and an error/loading state. Public demo restrictions still apply. [S39]

Review the local script before executing it in DevTools. It does not read cookies, storage, text content, input values or HTML; it makes no network requests. It samples visible DOM geometry and selected computed styles. On-page metadata can still be sensitive, so inspect the exported file before sharing. The script's transient download link and its own `window.__designAudit` object are the only deliberate page mutations.

```js
// After reviewing and running browser-design-audit.js in DevTools:
__designAudit.capture({ label: "light-list-default" });
// Open a picker manually, then:
__designAudit.capture({ label: "light-property-picker" });
// Scope a subsequent sample if helpful:
__designAudit.capture({ label: "dialog-open", selector: '[role="dialog"]' });
__designAudit.download();
```

The output includes CSS-pixel rectangles, typography declarations, padding/gaps, radii, colors, borders, shadows, transitions, keyframe declarations and current active-animation timing metadata. It also builds frequency summaries for recurring values.

Limitations: ordinary DOM only, no cross-origin frames or closed shadow roots, no pseudo-element measurements, no offscreen/virtualized records, no guarantee the computed font-family string identifies the actual glyph font, no sampling of every possible interaction state, and no measured interaction latency. DOM sibling paths are temporary locators, not stable test IDs. An animation can complete before a snapshot sees it. Use a browser Performance trace for runtime timing and a font inspector for resolved font faces.

A screenshot's image dimensions can differ from CSS pixels because of device scale, zoom, export scaling and editorial annotation. Never present pixel estimates from a marketing illustration as exact application measurements.

## 9. Application to PharmaAgentOS

Retain the bright layered-desk layout and established indigo/navy identity. Borrow interaction predictability rather than importing Linear's complete issue-tracker information architecture.

| Linear-inspired pattern | PharmaAgentOS adaptation |
|---|---|
| Stable work list and inspector | Research runs on the left; selected brief/evidence detail without losing list context. |
| Reusable issue property chips | Source type, jurisdiction, review state and document-version filters. |
| Command action registry | Find source, open saved research, copy citation, switch scope—using the same authorized actions as visible controls. |
| Inbox and triage separation | Separate new regulatory material from material already reviewed by a person. |
| Explicit AI suggestion surface | Label retrieval suggestions and analytical drafts separately from verified source facts. |
| Connected entity views | Reuse the same source identifier, version and retrieval timestamp across chat, brief and reader. |
| Progress without blocking shell | Research can run while navigation and existing evidence remain usable. |

Suggested left navigation: Research, Sources, Saved briefs and Review queue, with administrative controls separated. Whether all four are needed should follow real task frequency, not a desire to fill a sidebar.

The AI-intake design account describes suggestions as a distinct, inspectable surface rather than silently making them look like confirmed metadata. That is particularly useful for your app: separate source content, retrieval relevance, model inference and a person's decision. [S32]

Prioritize: (1) correct state and provenance, (2) shared shell/action behavior, (3) typography/spacing/surfaces, (4) restrained motion, (5) measured performance regression tests. Preserve evidence reading and stop/resume behavior before polishing incidental animations.

## 10. Implementation acceptance checklist

- A user can open detail and return to the same filtered list, scroll position and focused record.
- Pointer, keyboard and command-menu paths perform the same authorized operation.
- Pending, synchronized, conflicted and failed writes are visually different; rejected edits do not erase later valid edits.
- Low-risk reversible edits may be optimistic; consequential approvals and claims wait for authoritative checks.
- The shell remains usable during detail fetches; failures do not masquerade as empty results.
- Sidebar widths, control heights, spacing and semantic colors come from shared tokens.
- Reduced motion, keyboard focus, 200% text sizing, touch targets and Korean IME input work.
- Long lists and long documents are profiled with production fixtures.
- No new font files or unlicensed brand assets are copied from Linear.
- Performance claims name their measurement method and do not confuse CSS duration with response latency.

**Bottom line:** borrow the interaction contracts and latency discipline. Preserve your own information architecture, visual identity and evidence-integrity requirements.

## Source register

Source IDs below also appear in `source-catalog.json`. Live documentation was reviewed on September 10, 2026; historical dates indicate the time of the described implementation, not a guarantee of unchanged internals.

- **S01** — [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh) — 2026-03-12
- **S02** — [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) — 2024-03-28
- **S03** — [Senior / Staff Fullstack Engineer — Linear Careers](https://linear.app/careers/cd5ae036-0223-427a-b038-ba16ef9dcb32)
- **S04** — [Post mortem on Linear incident from Jan 24th, 2024](https://linear.app/now/linear-incident-on-jan-24th-2024) — 2024-01-30
- **S05** — [How we built multi-region support for Linear](https://linear.app/now/how-we-built-multi-region-support-for-linear) — 2024-05-23
- **S06** — [Linear changelog — historical Select implementation](https://linear.app/changelog/page/13)
- **S07** — [Concepts](https://linear.app/docs/conceptual-model)
- **S08** — [Create issues](https://linear.app/docs/creating-issues)
- **S09** — [Issue relations](https://linear.app/docs/issue-relations)
- **S10** — [Projects](https://linear.app/docs/projects)
- **S11** — [Initiatives](https://linear.app/docs/initiatives)
- **S12** — [Cycles](https://linear.app/docs/use-cycles)
- **S13** — [Board layout](https://linear.app/docs/board-layout)
- **S14** — [Select issues](https://linear.app/docs/select-issues)
- **S15** — [Search](https://linear.app/docs/search)
- **S16** — [Editor](https://linear.app/docs/editor)
- **S17** — [Custom views](https://linear.app/docs/custom-views)
- **S18** — [Inbox](https://linear.app/docs/inbox)
- **S19** — [Priority inbox — Changelog](https://linear.app/changelog/2026-09-03-priority-inbox) — 2026-09-03
- **S20** — [Pulse](https://linear.app/docs/pulse)
- **S21** — [Triage](https://linear.app/docs/triage)
- **S22** — [Customer requests](https://linear.app/docs/customer-requests)
- **S23** — [Linear Asks](https://linear.app/docs/linear-asks)
- **S24** — [SLAs](https://linear.app/docs/sla)
- **S25** — [Insights](https://linear.app/docs/insights)
- **S26** — [Dashboards](https://linear.app/docs/dashboards)
- **S27** — [GitHub integration](https://linear.app/docs/github-integration)
- **S28** — [Reviews](https://linear.app/docs/diffs)
- **S29** — [Releases](https://linear.app/docs/releases)
- **S30** — [Linear Agent](https://linear.app/docs/linear-agent)
- **S31** — [Triage intelligence](https://linear.app/docs/triage-intelligence)
- **S32** — [How we built Triage Intelligence](https://linear.app/now/how-we-built-triage-intelligence) — 2025-09-03
- **S33** — [Loops](https://linear.app/docs/loops)
- **S34** — [Coding sessions](https://linear.app/docs/coding-sessions)
- **S35** — [MCP](https://linear.app/docs/mcp)
- **S36** — [Agents — Developers](https://linear.app/developers/agents)
- **S37** — [Security](https://linear.app/security)
- **S38** — [Account preferences](https://linear.app/docs/account-preferences)
- **S39** — [Start Guide](https://linear.app/docs/start-guide)
- **S40** — [Animations overview — web.dev](https://web.dev/articles/animations-overview)
- **S41** — [Optimize Interaction to Next Paint — web.dev](https://web.dev/articles/optimize-inp)
- **S42** — [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- **S43** — [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
- **S44** — [Linking and Navigating — Next.js](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- **S45** — [Optimistic Updates — TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- **S46** — [Dialog — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/dialog)
- **S47** — [Optimizing React component rendering — MobX](https://mobx.js.org/react-optimizations.html)
- **S48** — [Linear historical performance changelog](https://linear.app/changelog/page/17)
- **S49** — [Animation — Radix Primitives](https://www.radix-ui.com/primitives/docs/guides/animation)
- **S50** — [Introducing Loops — Changelog](https://linear.app/changelog/2026-07-20-introducing-loops) — 2026-07-20

- **S51** — [Parent and sub-issues](https://linear.app/docs/parent-and-sub-issues)
- **S52** — [Due dates](https://linear.app/docs/due-dates)
