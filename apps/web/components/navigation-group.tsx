"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Native disclosure with one owner for its interruptible visual close. */
export function NavigationGroup({ open, active, label, onToggle, children }: {
  open: boolean; active: boolean; label: ReactNode; onToggle: () => void; children: ReactNode;
}) {
  const element = useRef<HTMLDetailsElement>(null);
  const [initialOpen] = useState(open);
  const mounted = useRef(false);
  const interruptedHeight = useRef<number | null>(null);
  const contentId = useId();

  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const summary = node.querySelector("summary")!;
    const start = interruptedHeight.current ?? node.getBoundingClientRect().height;
    interruptedHeight.current = null;
    // React keeps the initial open attribute stable; this effect owns native
    // visibility so a close can finish before details hides its content.
    const settle = () => { node.open = open; node.style.removeProperty("overflow"); };
    if (!mounted.current || reduced.matches) {
      mounted.current = true;
      settle();
      return;
    }
    if (!open && node.contains(document.activeElement)) summary.focus();
    node.open = true;
    const end = open ? node.getBoundingClientRect().height : summary.getBoundingClientRect().height;
    node.style.overflow = "hidden";
    const tokens = getComputedStyle(node);
    // Production CSS minification may serialize 260ms as .26s.
    const timing = tokens.getPropertyValue("--motion-panel").trim();
    const duration = parseFloat(timing) * (timing.endsWith("ms") ? 1 : 1000);
    const animation = node.animate([{ height: `${start}px` }, { height: `${end}px` }], {
      duration: Number.isFinite(duration) ? duration : 260,
      easing: tokens.getPropertyValue("--motion-ease").trim() || "ease-out",
    });
    animation.onfinish = settle;
    const stop = () => { if (reduced.matches) { animation.cancel(); settle(); } };
    reduced.addEventListener("change", stop);
    return () => {
      // Retain the interrupted height until the next effect measures it.
      interruptedHeight.current = node.getBoundingClientRect().height;
      animation.cancel();
      reduced.removeEventListener("change", stop);
      node.style.removeProperty("overflow");
    };
  }, [open]);

  return <details ref={element} open={initialOpen} className="portal-workspace-group"
    data-active={active} data-expanded={open}>
    <summary aria-expanded={open} aria-controls={contentId} onClick={event => { event.preventDefault(); onToggle(); }}>{label}</summary>
    <div id={contentId} className="portal-workspace-group__content" inert={!open} aria-hidden={!open}>{children}</div>
  </details>;
}
