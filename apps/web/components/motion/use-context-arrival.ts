"use client";

import { useLayoutEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/ui-media";

/** A newly chosen workspace settles onto the desk. No remount, exit wait, or
 * animation on initial load, streamed tokens, refreshed data or restored state. */
export function useContextArrival<T extends HTMLElement>(identity: string, reading = false) {
  const ref = useRef<T>(null);
  const previous = useRef(identity);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  useLayoutEffect(() => {
    const changed = previous.current !== identity;
    previous.current = identity;
    const node = ref.current;
    if (!changed || !node || reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = node.animate([
      { opacity: reading ? 1 : 0.72, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 300, easing: "cubic-bezier(.22, .8, .25, 1)" });
    animation.id = "context-arrival";
    return () => animation.cancel();
  }, [identity, reading, reduced]);
  return ref;
}
