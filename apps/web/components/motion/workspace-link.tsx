"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { cancelViewFade, changeView, viewIdentity } from "./view-fade";

/** Keep native modified clicks/downloads and Next prefetch; only view changes fade. */
export default function WorkspaceLink({ onNavigate, ...props }: ComponentProps<typeof NextLink>) {
  const router = useRouter();
  return <NextLink {...props} onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented || typeof props.href !== "string") return;
    const destination = new URL(props.href, window.location.href);
    if (viewIdentity(destination) === viewIdentity(new URL(window.location.href))) {
      const main = document.getElementById("main-content");
      if (main) cancelViewFade(main);
      return;
    }
    event.preventDefault();
    changeView(() => router[props.replace ? "replace" : "push"](destination.pathname + destination.search + destination.hash, { scroll: props.scroll }), undefined, true);
  }} />;
}
