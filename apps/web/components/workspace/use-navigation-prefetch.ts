"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useWorkspaceScope } from "./provider";
import { letterQueryString, readLetterQuery } from "@/lib/letter-query";
import { sourcePageOptions } from "@/lib/source-queries";
import { briefListOptions, researchListOptions } from "@/lib/workspace-queries";

function canPrefetch() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType || "");
}

export function useNavigationPrefetch() {
  const client = useQueryClient();
  const scope = useWorkspaceScope();
  const [ready, setReady] = useState(false);
  const [intendedHref, setIntendedHref] = useState("");
  useEffect(() => {
    if (!canPrefetch()) return;
    const warm = () => {
      setReady(true);
      // Only one bounded data page is warmed automatically, never the catalog.
      void client.prefetchQuery(sourcePageOptions(scope, letterQueryString(readLetterQuery(new URLSearchParams()))));
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 1000);
    return () => clearTimeout(id);
  }, [client, scope]);
  const prepare = (href: string) => {
    // Honor reduced-data connections; a click still loads the destination normally.
    if (!canPrefetch()) return;
    setIntendedHref(href);
    if (href === "/drug-letters") void client.prefetchQuery(sourcePageOptions(scope, letterQueryString(readLetterQuery(new URLSearchParams()))));
    if (href === "/research") void client.prefetchQuery(researchListOptions(scope));
    if (href === "/saved-work") void client.prefetchQuery(briefListOptions(scope));
    // Startup warms a read-only Inbox preview. This intent fallback must not
    // establish the user's personal triage horizon before activation.
  };
  // Link's public prefetch=true API loads the complete route, including dynamic
  // pages; router.prefetch's default only warms their loading boundary.
  const shouldPrefetch = (href: string) => intendedHref === href || (ready && ["/drug-letters", "/research", "/saved-work", "/inbox"].includes(href));
  return { prepare, shouldPrefetch };
}
