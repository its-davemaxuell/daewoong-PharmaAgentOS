# Attio-inspired design and agent implementation reference

Prepared for Dave · 10 September 2026

## How to use this document

This is an **original implementation specification**, informed by the accompanying Attio research. It is not Attio source code, an export of its private design system, or a claim that Attio implements every safeguard below. All exact dimensions, colors, timings, thresholds, schemas, and application architecture proposed here are independent starting points.

The accompanying `sources.json` identifies the public engineering articles, SDK documentation, help pages, and release references used in the research. Consult those sources to distinguish an Attio capability from a recommendation for your own product. No authenticated workspace, private repository, computed CSS, network trace, or frame-timing capture was inspected. Public screenshots cannot establish the exact font, responsive behavior, or interaction timing of the application.

For PharmaAgentOS, preserve the previously approved **Layered desk / composition A** direction: bright, precise, content-rich white compartments on a cool neutral canvas. Borrow interaction discipline and agent execution principles, not Attio branding or CRM-specific information architecture. Keep evidence reading calm and separate from agent activity.

## 1. Visual foundation

### 1.1 Surface hierarchy

Use one persistent application shell, one principal work surface, and one contextual surface. Avoid surrounding every paragraph with a separate card. A container should communicate a meaningful boundary: navigation, dataset, document, task, approval, or execution.

Use a pale canvas behind white work surfaces. Separate adjacent dense regions with a border, not a large drop shadow. Reserve an elevated shadow for transient overlays such as menus, dialogs, and command search. Navigation should be visually quieter than the material being researched.

Use color to communicate a selected item, an actionable link, or a status. Do not distribute saturated colors across ordinary dashboard widgets merely to make the interface feel modern. Pair status color with explicit text and, where appropriate, an icon.

### 1.2 Independent desktop dimensions

| Token | Proposed starting value | Interpretation |
|---|---:|---|
| Navigation | 240 px; adjustable 224–256 px | Persistent destinations; not record metadata |
| Main header | 52 px; range 48–56 px | Location, object title, principal action |
| Context toolbar | 44 px; range 40–48 px | Views, filters, sort, selection actions |
| Dense data row | 38 px; range 36–40 px | Desktop data entry; not long prose |
| Standard compact button | 32 px | Fine-pointer desktop controls |
| Touch interaction target | At least 44 px in this specification | Expand the target, not necessarily its glyph |
| Contextual inspector | 400 px; range 360–420 px | Source preview, record detail, or agent context |
| Essential icon artwork | 16 px; range 14–16 px | Use a larger clickable target around it |
| Spacing scale | 4, 8, 12, 16, 24, 32 px | Reuse values instead of accumulating arbitrary gaps |
| Control radius | 6–8 px | Inputs, small buttons, menus |
| Surface radius | 10–12 px | Major panels or dialogs |
| Compact table text | 13–14 px | Keep names and numerical values easily scannable |
| Secondary metadata | 12–13 px | Timestamps and supplementary labels |
| Long-form evidence | 16–18 px | Do not force a dense CRM type scale onto documents |
| Page title | 20–24 px | Product title, not marketing hero typography |

A 1440 px desktop example can allocate 240 px to navigation, 800 px to the main region, and 400 px to an optional context region. These are outer column widths; padding belongs inside them. Without the context region, the main region expands. Use `min-width: 0` on flexible regions so tables and text do not unexpectedly widen the shell.

Within a record-style workspace, a roughly 30/70 metadata/content split is a useful prototype starting point, not a universal rule. It should be resizable and constrained by the minimum readable width of each region. A source-document viewer may need substantially more space than a CRM activity feed.

### 1.3 Proposed palette

These values are **not extracted Attio tokens**.

| Role | Value |
|---|---|
| Canvas | `#F7F8FA` |
| Main surface | `#FFFFFF` |
| Hover fill | `#F1F3F5` |
| Selected fill | `#EEF4FF` |
| Decorative separator | `#E5E7EB` |
| Strong decorative separator | `#D1D5DB` |
| Essential control boundary | `#7B8493` |
| Primary text | `#202124` |
| Secondary text | `#626D80` |
| Accent / focus | `#2563EB` |
| Success text | `#15803D` |
| Warning text | `#B45309` |
| Error text | `#B42318` |

Use the stronger control boundary where a boundary is necessary to identify an input. A very pale separator is not an adequate substitute for an identifiable control. Do not assume that every combination of two palette colors is readable; validate the actual foreground/background pairs.

Use an available system sans-serif stack initially. The reference CSS does not include or distribute font files and does not assert the font Attio uses internally. Verify Korean and English together: long organization names, full dates, document codes, mixed-script punctuation, and wrapping behavior.

### 1.4 Density and responsiveness

Offer a comfortable density mode for users who cannot work reliably with compact controls. On narrow screens, choose one primary task surface rather than squeezing navigation, table, inspector, and chat into four tiny columns. Close or replace the inspector intentionally; do not simply push it off-screen while leaving keyboard focus inside it.

The supplied CSS uses 1200 px and 800 px as example layout boundaries. These are not measured Attio breakpoints. At narrow widths, the example inspector becomes an in-flow section. A real modal drawer requires focus management, labeling, dismissal behavior, and inert-background handling in application code.

## 2. Component contracts

### 2.1 Data table

Give every row a stable entity ID. Keep selected rows, active cell, filters, sorting, and scroll position stable when a contextual panel opens. Edit a field in place where the edit is reversible and unambiguous. Offer keyboard alternatives to drag-and-drop actions.

Model mutation status separately from cell content:

```text
idle → editing → pending save → confirmed
                           ↘ failed → retry or discard
                           ↘ conflict → compare and resolve
```

An optimistic value can appear immediately, but an acknowledged save must remain a separate state. When a save fails, retain the user's edit and explain what was not persisted. Do not refresh the entire table to hide a failed mutation.

Only virtualize when profiling shows a need. Choose the implementation after examining the existing stack. Test variable-height rows, keyboard focus across unmounted rows, sticky headers, column resizing, copy/paste, row selection, and screen-reader behavior. Do not infer that Attio's open-source mobile list work identifies its complete web table stack.

### 2.2 Record or document detail

Use a stable header identifying the entity and its version. Keep basic metadata in a compact region. Put long content, chronological history, and relationships in the principal work region. Tabs should change the subject matter inside that region without changing the user's mental location.

A citation or record reference should open a relevant detail surface. Closing it should restore focus to the originating control and retain the underlying view's selection and scroll position. Use links when navigation is intended and buttons when an action is intended.

### 2.3 Command menu

Treat command search as a shortcut to existing navigation and actions, not a second disconnected app. Results should distinguish records, documents, commands, and recent work. A command must use the same authorization and mutation endpoint as its visible button equivalent.

Display keyboard hints where helpful, but do not intercept shortcuts while the user is editing an unrelated text field. Keep a reliable pointer-accessible way to open the menu.

### 2.4 Agent panel

Keep the active subject visible: selected document, record, question, or workflow. Offer explicit controls to include or remove context. Do not silently assume that every tab the user once opened should remain part of the next prompt.

Show source references, tool progress, proposed changes, approvals, and errors as typed components. Distinguish an observed fact from a model-generated hypothesis. Do not turn a prose confidence statement into a numeric confidence score without a calibration method.

### 2.5 Workflow editor and run inspector

Separate the editable workflow definition from the immutable definition associated with a historical run. A selected step should expose its inputs, configured identity, tool permissions, outputs, duration, and errors. The inspection panel should explain what actually executed rather than merely coloring a diagram.

Provide explicit visual states for a step that was skipped, canceled, awaiting approval, retrying, or not reached. They are not equivalent to a successfully completed step. Retain completed outputs when a later step fails.

### 2.6 Approval component

Present the proposed change as a structured diff, not only as an agent-written explanation. Show the target record, old and new values, evidence, affected external systems, and the identity under which the change will run. Bind the approval to the exact proposal and base data version.

Use an unambiguous button such as “Approve 3 field changes,” not “Continue,” when continuation causes a consequential effect. A typed confirmation or second-person review should be considered according to the product's actual risk assessment, not added decoratively.

## 3. Motion and perceived performance

### 3.1 Proposed timing scale

| Interaction | Starting duration |
|---|---:|
| Hover / pressed feedback | 100–140 ms |
| Small menu / popover | 140–180 ms |
| Context panel enter / exit | 180–240 ms |
| Major route or workspace transition | No more than 280 ms unless there is a specific reason |
| Reading surface | No ornamental entrance sequence |

Start with opacity and small translations. Avoid scaling text, repeatedly animating panel height, or applying `transition: all` to complex surfaces. Animate an entrance once; do not rerun it whenever data refreshes.

Do not fake completion to create a feeling of speed. A short visual acknowledgment may precede a network response, but the UI must still show pending persistence. Never make an approval or financial/regulatory side effect look committed before the server confirms it.

### 3.2 Streaming contract

Separate transport chunks from renderable content. Buffer incomplete syntax. Render only safe component shells until required properties validate. Keep stable component IDs during streaming, so a growing answer does not repeatedly unmount citations or controls.

Do not execute model-provided HTML or JavaScript. Maintain a registry of permitted output component types with versioned schemas. Escape text and validate links. A partially parsed proposed-action component must never make its commit button active.

Decouple visual pacing from retrieval, tool completion, persistence, and cancellation state. A smooth text reveal is not evidence that a tool succeeded. When the user requests reduced motion, provide immediate stable content without decorative translation or shimmer.

### 3.3 State continuity

Measure whether a user's position survives interactions, not only whether an animation has a pleasing easing curve. Preserve view state across record inspection, preserve a draft after a retryable failure, and preserve an agent run after a page refresh.

Use skeletons that match the eventual layout. A spinner alone is insufficient when work contains multiple independent steps. Report genuine stages such as “Finding relevant documents” and “Checking cited passages” only when those stages actually run.

## 4. Recommended agent architecture

The following is a proposal for an evidence-first application. It is **not a reconstruction of Attio's private deployment topology**.

```text
Product UI / API / event trigger
              │
              ▼
Authenticated request + explicit active context
              │
              ▼
Versioned workflow definition + bounded execution budget
              │
              ▼
Server-side context hydration and permission filtering
              │
              ▼
Read-only retrieval and bounded agent reasoning
              │
              ▼
Typed result + cited evidence + explicit unknowns
              │
              ▼
Schema, authorization, business-rule, and evidence checks
              │
              ├── read-only answer → stable result components
              │
              └── proposed change → approval policy
                                         │
                                         ▼
                              Recheck current permissions
                              and underlying data versions
                                         │
                                         ▼
                              Idempotent effect executor
                                         │
                                         ▼
                              Verify outcome + audit event
```

### 4.1 Choose the correct execution mode

An interactive assistant should help a user inspect information and propose changes. A published background workflow should have an explicit identity, trigger, version, budget, and effect policy. An AI-assisted attribute should have a clearly defined target field, recomputation rule, and provenance. These surfaces may share infrastructure without sharing the same approval or persistence behavior.

Do not give a research agent broad write tools simply because another product surface can perform writes. Keep tool access and side-effect access separate. A read-only tool result can still contain misleading instructions or sensitive material; read-only access is not a complete security boundary.

### 4.2 Context envelope

Hydrate context on the server. Client-supplied IDs are hints about user intent, not proof of authorization. Resolve them to accessible canonical entities and document versions. Keep included sources inspectable by the user.

An original contract might contain:

```ts
type ContextEnvelope = {
  schemaVersion: 1;
  workspaceId: string;
  actorId: string;
  runId: string;
  activeEntityIds: string[];
  selectedEvidenceIds: string[];
  permissionSnapshotId: string;
  hydratedAt: string;
  dataSnapshotId: string | null;
  contextHash: string;
};
```

A stored permission snapshot supports traceability, but it must not replace reauthorization before an external effect. A snapshot ID is not a claim of serializable or externally consistent reads unless the actual storage implementation supplies that guarantee.

### 4.3 Evidence contract

Keep retrieved evidence attached to the version actually searched and read. Do not silently replace a citation with a newer document because its title matches.

```ts
type EvidenceRef = {
  documentId: string;
  documentVersionId: string;
  chunkId: string;
  contentHash: string;
  sourceUri: string;
  page: number | null;
  section: string | null;
  startOffset: number | null;
  endOffset: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  documentStatus: "draft" | "effective" | "superseded" | "withdrawn";
  retrievedAt: string;
};
```

Choose offsets against a named, immutable text representation. Retain an extraction map when layout conversion changes character positions. Store retrieval filters and ranking diagnostics separately from evidence text; a retrieval score is not proof that a claim is supported.

### 4.4 Typed outputs and validators

Require a schema appropriate to the task, including explicit uncertainty. Do not force every field to contain a value when the evidence is missing.

```ts
type Finding = {
  statement: string;
  support: "supported" | "contradicted" | "insufficient";
  evidence: EvidenceRef[];
  limitations: string[];
};

type AgentResult = {
  schemaVersion: 1;
  runId: string;
  findings: Finding[];
  proposedChanges: Array<{
    targetId: string;
    expectedVersion: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    evidence: EvidenceRef[];
  }>;
  unansweredQuestions: string[];
};
```

These interfaces describe a contract, not a working runtime validator. Implement runtime validation in the existing backend's schema library. Follow schema validation with entity existence checks, access checks, temporal-validity checks, evidence-support checks, and business rules. A schema-valid answer can still be false.

### 4.5 Approval and commit

Compute a proposal hash from the exact target versions, field diffs, and evidence references. Approval should record the proposal hash, actor, timestamp, scope, and expiration policy. Recheck target versions before committing. If a material difference appears, revalidate the proposal and seek renewed approval rather than applying stale intent.

Use a logical idempotency key for each intended effect, for example a digest over workspace ID, run ID, step ID, action ordinal, and target ID. Persist the key before making a retryable effect. Do not include the retry attempt number in a key whose purpose is to prevent duplicate effects. Reconcile ambiguous timeouts with the downstream system before trying again.

When an external system cannot provide an idempotency mechanism or reliable reconciliation, do not claim exactly-once behavior. Record the limitation and add an appropriate review or recovery path.

### 4.6 Durability and cancellation

Store execution state outside the browser. Separate a workflow definition version from a run and separate a logical step execution from its attempts. Retain inputs, outputs, statuses, and effect receipts under the relevant access policy.

A proposed run state model:

```text
queued → running → waiting_for_approval → committing → succeeded
            │               │                │
            ├── retrying ───┘                └── reconciliation_required
            ├── failed
            └── cancellation_requested → canceled
```

This diagram is conceptual: a canceled run may still require reconciliation if an irreversible external request had already been issued. Cancellation should prevent new effects and signal active work to stop; it must not pretend that already committed actions have been undone.

Parallelize independent reads within a bounded budget. Serialize or version-check conflicting writes to the same target. Put limits on tool calls, elapsed time, token use, spend, and retries. Use retry classifications so an invalid identifier or denied permission is not treated like a temporary network failure.

### 4.7 Tool design

Design tools around a small number of intelligible operations. Prefer a scoped query that returns the relevant evidence and relationships over a tool that requires the agent to fetch a whole corpus and join it in its prompt.

Define the authorization scope, supported filters, output schema, maximum result size, failure modes, and whether a tool can have side effects. Return actionable errors without leaking secrets. Test tool naming with a model that has not read the implementation discussion.

Keep untrusted retrieved text in a data channel. Do not accept source content as an instruction to add permissions, reveal unrelated records, call an external endpoint, or alter the workflow definition. Apply network egress restrictions and revalidate URLs after redirects where applicable.

### 4.8 Observability and evaluation

Record run ID, workflow version, actor, effective capability set, tool name, validated arguments, input/output versions, start/end timestamps, model variant, usage, cost, retries, and error class. Redact secrets and minimize sensitive payload storage; an observability system should not become an uncontrolled copy of private documents.

Evaluate correctness, evidence support, permission compliance, appropriate abstention, and effect safety separately from latency and cost. Repeat cases across model or prompt variants rather than relying on a single favorable example.

Include fixtures for ambiguous names, stale versions, contradictory sources, unavailable sources, denied access, missing required evidence, invalid structured output, external instruction injection, duplicate event delivery, ambiguous write timeout, cancellation during a write, and permission revocation before approval.

## 5. Release acceptance criteria

These are proposed requirements for your implementation, not measurements of Attio.

| Area | Test to pass |
|---|---|
| Layout | No accidental horizontal shell overflow at 1440, 1280, 1024, 768, and 390 px test widths |
| Reading | Evidence content remains readable without adopting the compact table typography |
| Contrast | Validate every essential text/background pair; aim for at least 4.5:1 for ordinary text in this specification |
| Keyboard | All essential operations reachable without a mouse; focus returns after overlays close |
| Reduced motion | No ornamental translation, repeated shimmer, or staged paragraph entrance |
| Table continuity | Selection, edited draft, and scroll position survive opening and closing detail |
| Failed save | Pending value is distinguishable from server-confirmed value; retry preserves input |
| Streaming | Incomplete payloads never enable an action or render arbitrary executable content |
| Retrieval | Inaccessible and policy-disallowed versions do not enter the agent's context |
| Evidence | Every supported finding resolves to an accessible, immutable evidence reference |
| Unknowns | Missing evidence produces an explicit unknown, not a fabricated placeholder |
| Approval | Changed target version or changed proposal invalidates stale approval |
| Effects | Duplicate delivery does not create a duplicate logical action in the tested integration |
| Cancellation | No new effect begins after cancellation is acknowledged; in-flight effects are reconciled |
| Recovery | Refreshing or reconnecting does not discard server-side run state |
| Regression | Variants are tested repeatedly on the same fixtures; errors and abstentions are reviewed |
| Performance | Measure local-feedback, time-to-first-useful-result, save acknowledgment, and p95 end-to-end run duration separately |

## 6. Suggested implementation order

Start with canonical IDs, permissions, and a correct persisted state model. Establish design tokens and a small shared component vocabulary next. Implement the table/detail/evidence flow before adding a workflow canvas. Build read-only agent tools and typed output components before authorizing writes. Add proposal validation, approval, idempotent effects, cancellation, and reconciliation. Then profile and refine animation, virtualization, and streaming presentation.

Avoid simultaneous rewrites of routing, styling, state management, authentication, and agent orchestration. Preserve working behavior and introduce one contract at a time. Choose dependencies only after examining the existing repository; do not install an animation or orchestration package because a screenshot resembles another product.

The success criterion is not “looks like Attio.” It is that the user always knows where they are, what information an agent used, what remains uncertain, what action is proposed, what was actually saved, and how to recover safely.
