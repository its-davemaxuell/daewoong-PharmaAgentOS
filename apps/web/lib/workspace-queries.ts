import { queryOptions } from "@tanstack/react-query";
import { workspaceJson } from "./workspace-client";
import type { BriefSummary, WorkspacePage } from "./workspace-types";
import type { ResearchSummary } from "./research-types";

export function briefListOptions(scope: string, page = 1) {
  return queryOptions({ queryKey: [scope, "briefs", page], queryFn: ({ signal }) =>
    workspaceJson<WorkspacePage<BriefSummary>>(`research/briefs?page=${page}`, { signal }) });
}

export function researchListOptions(scope: string, q = "", status = "all", cursor = "") {
  return queryOptions({ queryKey: [scope, "research-list", q, status, cursor],
    queryFn: async ({ signal }): Promise<WorkspacePage<ResearchSummary>> => {
      const response = await fetch(`/api/research?${new URLSearchParams({ q, status, cursor })}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Research list unavailable");
      return response.json();
    } });
}
