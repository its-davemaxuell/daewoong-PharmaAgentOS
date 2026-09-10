import { queryOptions } from "@tanstack/react-query";
import type { LetterPage } from "./letter-query";
import type { DataMode } from "./types";

export type SourcePage = { data: LetterPage; mode: DataMode };

// One key and transport for menu preloading, first visits, and filtered pages.
// Memory belongs to the signed browser session's WorkspaceProvider.
export function sourcePageOptions(scope: string, query: string) {
  return queryOptions({
    queryKey: [scope, "letters", query],
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    queryFn: async ({ signal }): Promise<SourcePage> => {
      const response = await fetch(`/api/drug-letters?${query}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Library unavailable");
      const payload = await response.json();
      if (!payload.data || !Array.isArray(payload.data.items) || !Number.isSafeInteger(payload.data.total) ||
          !payload.data.facets || !["live", "seeded"].includes(payload.mode)) throw new Error("Invalid library response");
      return payload;
    },
  });
}
