---
name: PharmaAgent OS — Layered desk
description: A bright, precise research workspace with dimensional white compartments.
colors:
  primary: "#5856d6"
  primary-deep: "#4442b8"
  primary-soft: "#eeedff"
  ink: "#202332"
  muted: "#626779"
  surface: "#ffffff"
  canvas: "#eef0f6"
  inset: "#f5f6fa"
  rule: "#e1e4ee"
  control-border: "#858b9d"
  brand: "#f18a00"
typography:
  body:
    fontFamily: "Pretendard, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  display:
    fontFamily: "Pretendard, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.035em"
rounded:
  control: "8px"
  panel: "16px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
---

## Overview

The user approved composition A: bright, minimal, neat, content-rich, and modern,
with dimensional compartments. This replaces the former navy/cobalt workbench.
PharmaAgent OS serves Korean and English-speaking employees working with retained
FDA warning letters. Visual quality must extend to every route and state.

## Colors

White navigation and work surfaces sit above a cool neutral canvas. Indigo marks
primary actions and selected tabs, with pale lavender selection fields. Charcoal
text supplies hierarchy; semantic green, amber and red retain their state meanings.
Daewoong's orange is reserved for the existing organizational attribution asset.

## Typography

Use local Pretendard with complete Korean coverage. UI body 16px, table/control
text 14–15px, metadata 12–13px, panel headings 18–20px, page headings 28–32px. Use rems.
Comfortable source reading is 16–17px with 1.75 line height. No global zoom.
Compact does not mean tiny: data density comes from alignment and reduced chrome.

## Layout

At desktop a floating white 244px navigation compartment sits within a 256px rail.
A 60px utility bar has a 12px top inset. Main content begins at 96px with 20px
gutters. Maintain the three established navigation groups and their disclosure
behavior. Brand opens Home; existing routes and capability guards remain.
Home uses A's asymmetric desk: a layered objective tray and source collection on
the left, workflow, quick questions and work shortcuts on the right. Task content
occupies the first viewport; no decorative metrics or oversized empty hero.
Chat and source reading use aligned working and evidence compartments. Tables,
forms, review requests and operational tools share the same frame and controls.
At 980px navigation becomes a keyboard-accessible drawer. At narrow widths panels
stack, actions wrap, reading stays single-pane and controls remain reachable.

## Elevation & Depth

Depth identifies working surfaces. Define three shared elevations: compact
controls, workspace panels, floating overlays. Shadows have a small contact edge
and a broad, low-opacity downward falloff. Primary objective trays expose offset
backing sheets beneath a white front surface and an inset top highlight. The approved dimensional compartments
justify panel framing; avoid piling shadows on every nested row or text block.
Inset fields and segmented controls sit below raised buttons. No decorative glass,
glowing text, rotating objects, or depth that interferes with reading.

## Shapes

Panels have 16px corners, controls 8px, inset trays 10px. Use crisp one-pixel
boundaries on fields, clear focus outlines and modest 44px interaction targets.
The P monogram is a small indigo raised tile. No new organization identity asset.

## Components

Page headings are visible, compact and aligned with contextual controls. Surface
headers and footers use fine separators. Table rows have consistent columns and
subtle hover fills. Tabs sit in a recessed strip with a raised selected tab.
Empty/restricted/error states use the same panel language and real next actions.
Workspace content is visible immediately; motion is reserved for selection and
new local context. Respect reduced motion and forced colors.
Home objective preparation carries the text to Research without starting a job.
Source previews use real bounded API results, with explicit loading/unavailable
states. Continue working uses actual saved work. Native inputs remain labelled.
Evidence source checks, unknown metadata and human review remain separate states.

## Do's and Don'ts

Preserve provenance, source scope, saved-work ownership, exports, stop/resume,
streaming, keyboard focus and authorization. Keep bilingual UI and original FDA
passages in their source language. All generated comps are layout references:
never implement their fictional accounts, uploads, broader source claims, records,
or metrics. Existing functionality is the product truth.
References: [Linear's workspace alignment and density](https://linear.app/now/how-we-redesigned-the-linear-ui); [Craft's document hierarchy](https://www.craft.do/).
The user's approved composition A is the visual authority for this redesign.

## Implemented motion conventions

`app/tokens.css` is authoritative for colors, elevation, geometry and motion;
historical variable names remain compatibility aliases. Use 110ms press, 160ms
hover/focus color, 240ms selection, 260ms panel opening (200ms exit) and 300ms context,
with `cubic-bezier(.22,.8,.25,1)`. Translation is 4–8px for local presence; button
press is at most 1px, with .98–.99 scale. No page-wide layout animation or card stagger.

Native selection controls share a decorative, tracking indicator. Its bounded
Web Animations transform measures only a changed selection and cancels/restarts
from the interrupted position. Native button, link, radio and tab semantics own
state. The whole track owns stacking so its moving background stays below every
label; individual controls do not create isolated stacking contexts. The selection
engine does not load Motion layout/drag features.

After a deliberate route change, the receiving workspace settles 6px over 300ms.
The persistent shell keeps its identity; initial loads, query refreshes, streamed
tokens and polling do not replay this transition. Letter view and specialist
selection use the same bounded movement with full text opacity. No exit wait,
page remount, document crossfade, animated dimensions or delayed action.

Motion's lazy `domAnimation` feature bundle and provider are local to ChatWorkspace;
exiting surfaces become inert immediately. The native conversation dialog owns
modal focus and unmount visibility through discrete CSS `display`/`overlay`
transitions. Avoid combining its visibility with AnimatePresence. Closing and
reopening during exit must preserve focus. Actions execute immediately.

New chat turns enter once; streamed tokens do not restart animation. Research
activity enters only when a newer persisted revision introduces a new event.
Restored messages/history, evidence, documents, charts and approval decisions stay
still. A source-anchor highlight is a single 900ms location cue, never flashing.
Skeleton rows are static; no fabricated delay, percentage, pulse or shimmer.

Use the shared pending Button where asynchronous labels change. Reserve both
labels in the same grid cell, disable duplicate submits and announce the real
result. Save/copy failures remain inline; a local save never claims server sync.

`MotionConfig reducedMotion="user"`, the native indicator's media subscription,
and CSS zero-duration tokens cover reduced motion. Disable decorative animation
and smooth scrolling as well. Keep visible focus, selected labels and forced-color
borders without relying on motion or color alone.

Sources for implementation: [Motion feature loading](https://motion.dev/docs/react-reduce-bundle-size),
[Motion accessibility](https://motion.dev/docs/react-accessibility),
[Motion-Primitives selected-background concept](https://motion-primitives.com/docs/animated-background),
[local transition panels](https://motion-primitives.com/docs/transition-panel), and
[native dialog animation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#animating_dialogs).
These inform interaction principles; the approved Layered desk remains the visual authority.
