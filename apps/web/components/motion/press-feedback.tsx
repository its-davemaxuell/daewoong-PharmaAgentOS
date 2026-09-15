"use client";

import { useEffect } from "react";

/** A short visual press survives a quick tap/Enter without delaying native actions.
 * Delegate input only: no observers, React rerenders, pointer capture or click synthesis.
 */
export function PressFeedback() {
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let active: { node: HTMLElement; started: number; key?: string; pointer?: number; x: number; y: number } | null = null;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(releaseTimer);
      active?.node.removeAttribute("data-press-feedback");
      active = null;
    };
    const control = (target: EventTarget | null) => {
      const node = target instanceof Element ? target.closest<HTMLElement>("button, a[href], summary, input[type=button], input[type=submit], input[type=reset]") : null;
      if (!node?.closest(".neumorphic-app") || node.closest('[inert], [aria-disabled="true"]') || node.matches(":disabled")) return null;
      return node;
    };
    const start = (node: HTMLElement, input: { key?: string; pointer?: number; x: number; y: number }) => {
      clear();
      active = { node, started: performance.now(), ...input };
      node.setAttribute("data-press-feedback", "true");
    };
    const release = () => {
      if (!active) return;
      const remaining = preference.matches ? 0 : Math.max(0, 110 - (performance.now() - active.started));
      clearTimeout(releaseTimer);
      if (remaining) releaseTimer = setTimeout(clear, remaining); else clear();
    };
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const node = control(event.target);
      if (node) start(node, { pointer: event.pointerId, x: event.clientX, y: event.clientY });
      else clear();
    };
    const pointerUp = (event: PointerEvent) => { if (event.pointerId === active?.pointer) release(); };
    const pointerCancel = (event: PointerEvent) => { if (event.pointerId === active?.pointer) clear(); };
    const pointerMove = (event: PointerEvent) => {
      if (!active || active.pointer !== event.pointerId) return;
      // A touch drag belongs to scrolling; moving off a key also cancels its feedback.
      if (event.pointerType !== "mouse" && Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) { clear(); return; }
      if (event.pointerType === "mouse" && !active.node.contains(event.target as Node)) clear();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || !["Enter", " "].includes(event.key)) return;
      const node = control(event.target);
      if (!node || (node.tagName === "A" && event.key !== "Enter") || (event.target instanceof Element && event.target.closest("input:not([type=button]):not([type=submit]):not([type=reset]), textarea, select, [contenteditable=true]"))) return;
      start(node, { key: event.key, x: 0, y: 0 });
    };
    const keyUp = (event: KeyboardEvent) => { if (active?.key === event.key) release(); };
    const focusOut = (event: FocusEvent) => { if (active?.node === event.target) clear(); };
    const visibility = () => { if (document.hidden) clear(); };
    const events = new AbortController();
    const options = { capture: true, passive: true, signal: events.signal };
    document.addEventListener("pointerdown", pointerDown, options);
    document.addEventListener("pointerup", pointerUp, options);
    document.addEventListener("pointercancel", pointerCancel, options);
    document.addEventListener("pointermove", pointerMove, options);
    document.addEventListener("keydown", keyDown, options);
    document.addEventListener("keyup", keyUp, options);
    document.addEventListener("focusout", focusOut, options);
    document.addEventListener("visibilitychange", visibility, options);
    window.addEventListener("blur", clear, options);
    preference.addEventListener("change", clear, options);
    return () => { events.abort(); clear(); };
  }, []);
  return null;
}
