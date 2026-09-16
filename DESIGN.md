# PharmaAgent OS — Neumorphic workspace

The September 15, 2026 request replaces the flat visual system across the website.
This is an Operate interface for English/Korean pharmaceutical employees working
in ordinary office lighting. Product truth and scope remain in PRODUCT.md.

## Material and color

Use a continuous cool porcelain canvas (#e9eef4), dark slate text (#243247),
secondary slate (#53647a), and a restrained cobalt accent (#275bd6).
Panels and controls share the canvas color. Paired upper-left white highlights
and lower-right slate shadows define raised surfaces. Inputs and selected
navigation are recessed. Retained source passages use a brighter inset reading
surface (#f1f4f8). Semantic success, warning and error colors retain labels.

Depth has three roles: stationary panels, small tactile controls, and floating
dialogs. Do not apply large shadows to individual table rows or animate large
panel shadows. Hairlines divide content; outer panel boundaries use depth.
Interactive fields retain a visible outline. Keyboard focus uses a 2px blue
outline with 3px clearance. Text contrast is at least 4.5:1. Forced colors restores
system outlines when shadows disappear.

## Geometry and typography

Keep all direct navigation, the 232px sidebar/56px collapsed rail, 54px top bar,
390px source inspector reservation, and the anchored chat composer. Use 24px
desktop gutters and compact mobile gutters. Large panels have 20px corners;
controls 10px, recessed fields 14px. Dense tabular content stays scanable.
Use local Pretendard for both languages. Preserve the readable 28–36px page
headings, 32–48px chat welcome, 15–18px working text and 13px metadata.
No global scaling. No decorative copy, invented metrics or capability claims.

## Component system

The chat canvas sits in a soft raised frame. Three task choices are tactile keys;
the source → answer → review diagram carries matching depth. The composer is a
recessed input well with raised source/options controls and a cobalt send key.
Research, Overview, sources, saved work, cases, governance, agents, usage, settings
and Help use the same panel/control material. Source passages keep their readable
measure and visible provenance. Dialogs and mobile navigation share the material.

## Motion

The signature interaction is a raised key compressing into its surface on press.
Matching four-part outer/inset shadow lists allow depth to interpolate continuously.
Control hover takes 180ms, press 110ms, selection 240ms, panels 260ms with a faster
180ms exit. Travel uses decelerating easing without bounce. Animate only small
control shadows. Preserve interruption-aware selection travel, content-only route
fades, inert exiting panels, streaming state, drafts, focus return and evidence
reading position. Native dialogs animate entry and exit using discrete display
and overlay transitions; unsupported browsers keep working native dialogs.
Native disclosures animate where supported. No global observer or new dependency.

The follow-up interaction pass extends the tactile system to quick taps, Enter
and Space, archive actions, pagination, research exports, governance filters and
menu controls. Keep a quick press visible for at most the remaining part of 110ms;
native activation stays immediate. Release on cancellation, drag-away, focus loss,
window blur or preference changes. Preserve structural transforms on positioned
controls. Apply press scaling only when motion is enabled. Input focus and table
selection use continuous border/tint changes without moving reading content.

Conversation Find uses interruptible presence and restores focus on Escape from
any control. Native action disclosures support arrow keys, Home/End and normal
Tab navigation. Animate native disclosure exits only when the engine supports
both size interpolation and CSS interactivity: inert; closed actions must never
remain focusable during the visual exit. Mobile navigation retains inert content
until the browser finishes its exit, with reopening invalidating old cleanup.
All presence surfaces subscribe to preference changes while already mounted.

Retain the original animated all-menu startup and honest Retry/Continue fallback.
Its progress and containing panel inherit the material. Reveal once per entry.
Reduced motion removes nonessential movement, loops and transitions, including
when the preference changes during a session. Forced colors keeps every control
and selection distinguishable without shadows.

## Content and interaction

Prefer an editable question, result selector, evidence search or direct action to
an explanatory paragraph. Examples use a compact selection list and actual output
preview. Result readers expose one section at a time with complete output available;
translation comparison pairs each section with its exact retained original.
Keep input, run provenance, role definitions and guidance one disclosure away.
Preserve visible draft/synthetic labels, complete source text and full exports.
Mobile selectors scroll within their own bounds and retain native keyboard access.

## Verification

Inspect Chromium renders at desktop, tablet and phone widths in both languages,
including restored conversations, citations, source readers, research briefs,
dialogs, keyboard/focus, disabled/error states and reduced motion.
Local visual records use explicitly fictional existing fixtures. API authorization,
session ownership, evidence identity and human review gates remain product rules.
