"use client";

import { cloneElement, createContext, useContext, useLayoutEffect, useRef, type ReactElement, type RefObject } from "react";
import { useMediaQuery } from "@/lib/ui-media";
import styles from "./motion.module.css";

const SelectionContext = createContext<RefObject<DOMRect | null> | null>(null);
export function SelectionGroup({ children }: { children: ReactElement<{ className?: string; "data-selection-track"?: string }> }) {
  const previous = useRef<DOMRect | null>(null);
  return <SelectionContext value={previous}>{cloneElement(children, {
    className: [children.props.className, styles.track].filter(Boolean).join(" "),
    "data-selection-track": "",
  })}</SelectionContext>;
}

/** One bounded measurement per selection. Native controls retain semantics and state.
 * Capture the interrupted visual position before cancelling so rapid changes retarget.
 * No document observer, continuous layout measurement or full-workspace animation.
 */
export function SelectionIndicator({ tone = "raised" }: { tone?: "raised" | "tinted" }) {
  const previous = useContext(SelectionContext);
  const element = useRef<HTMLElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  useLayoutEffect(() => {
    const node = element.current;
    if (!node || !previous) return;
    const track = node.closest<HTMLElement>("[data-selection-track]");
    const control = node.parentElement;
    if (track && control && track.scrollWidth > track.clientWidth) {
      const bounds = track.getBoundingClientRect(), selected = control.getBoundingClientRect();
      if (selected.left < bounds.left) track.scrollLeft += selected.left - bounds.left - 5;
      else if (selected.right > bounds.right) track.scrollLeft += selected.right - bounds.right + 5;
    }
    const target = node.getBoundingClientRect();
    const origin = previous.current;
    let animation: Animation | undefined;
    // A media change can arrive between rendering and this layout effect (WebKit).
    // Read the current preference before starting, as well as subscribing above.
    if (!reduced && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && origin && target.width && target.height && origin.width && origin.height) {
      animation = node.animate([
        { transform: `translate(${origin.x - target.x}px, ${origin.y - target.y}px) scale(${origin.width / target.width}, ${origin.height / target.height})` },
        { transform: "translate(0, 0) scale(1, 1)" },
      ], { duration: 240, easing: "cubic-bezier(.22, .8, .25, 1)" });
      animation.id = "selection-travel";
    }
    return () => { previous.current = node.getBoundingClientRect(); animation?.cancel(); };
  }, [previous, reduced]);
  return <i ref={element} aria-hidden="true" data-motion-indicator="" className={styles.selection} data-tone={tone} />;
}
