import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { LetterPage } from "./letter-query";
import type { DataMode } from "./types";
import type { SavedWorkspaceView, WorkspacePage } from "./workspace-types";
import { workspaceJson } from "./workspace-client";

export function bookmarkPageOptions(scope: string, ids: string[], client: QueryClient) {
  return queryOptions({ queryKey: [scope, "bookmark-page", ids], queryFn: async ({ signal }) => {
    const params = new URLSearchParams({ limit: "100" });
    ids.forEach(id => params.append("source_ids", id));
    const saved = await workspaceJson<WorkspacePage<SavedWorkspaceView>>(`saved-views?${params}`, { signal });
    if (!signal.aborted) for (const id of ids) {
      if (!client.getQueryData([scope, "bookmark-pending", id])) client.setQueryData([scope, "bookmark", id], saved.items.some(item => item.source_id === id || item.name === `Drug letter bookmark:${id}`));
    }
    return saved;
  } });
}

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
