"use client";

import { useLayoutEffect, useRef } from "react";
import { arriveView, cancelViewFade } from "./view-fade";

/** Complete a selected region's fade without remounting its contents.
 * Initial load, streamed tokens and restored state remain stationary. */
export function useContextArrival<T extends HTMLElement>(identity: string, reading = false) {
  const ref = useRef<T>(null);
  const previous = useRef(identity);
  useLayoutEffect(() => {
    const changed = previous.current !== identity;
    previous.current = identity;
    const node = ref.current;
    if (!changed || !node) return;
    if (document.getElementById("main-content")?.getAnimations().some(animation => ["view-departure", "workspace-transition"].includes(animation.id))) return;
    arriveView(node, "context-arrival");
    return () => cancelViewFade(node);
  }, [identity, reading]);
  return ref;
}
