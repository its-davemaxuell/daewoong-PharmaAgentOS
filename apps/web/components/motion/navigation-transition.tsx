"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/ui-media";

/** Keep route state and streaming children mounted; animate only a chosen view.
 * Search typing, polling, source previews and restored drafts stay still. */
export function NavigationTransition() {
  const path = usePathname();
  const params = useSearchParams();
  const identity = JSON.stringify([path, ...["tab", "view", "state", "run", "status", "kind"].map(key => params.get(key))]);
  const previous = useRef(identity);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  useLayoutEffect(() => {
    const changed = previous.current !== identity;
    previous.current = identity;
    const content = document.getElementById("main-content");
    if (!changed || !content || reduced || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Opacity preserves fixed evidence panels and the current reading position.
    const animation = content.animate([{ opacity: .65 }, { opacity: 1 }], {
      duration: 200, easing: "cubic-bezier(.2, 0, 0, 1)",
    });
    animation.id = "workspace-transition";
    return () => animation.cancel();
  }, [identity, reduced]);
  return null;
}
