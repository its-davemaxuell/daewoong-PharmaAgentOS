"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { arriveView, cancelViewFade } from "./view-fade";

/** Keep route state and streaming children mounted; animate only a chosen view.
 * Search typing, polling, source previews and restored drafts stay still. */
export function NavigationTransition() {
  const path = usePathname();
  const params = useSearchParams();
  const identity = JSON.stringify([path, ...["tab", "view", "state", "run", "status", "kind", "days"].map(key => params.get(key))]);
  const previous = useRef(identity);
  useLayoutEffect(() => {
    const changed = previous.current !== identity;
    previous.current = identity;
    const content = document.getElementById("main-content");
    if (!changed || !content) return;
    arriveView(content);
    return () => cancelViewFade(content);
  }, [identity]);
  return null;
}
