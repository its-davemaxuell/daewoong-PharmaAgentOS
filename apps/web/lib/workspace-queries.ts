import { queryOptions } from "@tanstack/react-query";
import { workspaceJson } from "./workspace-client";
import type { BriefSummary, InboxPage, SavedWorkspaceView, WorkspacePage } from "./workspace-types";
import type { ResearchSummary } from "./research-types";

export function briefListOptions(scope: string, page = 1) {
  return queryOptions({ queryKey: [scope, "briefs", page], queryFn: ({ signal }) =>
    workspaceJson<WorkspacePage<BriefSummary>>(`research/briefs?page=${page}`, { signal }) });
}

export function inboxOptions(scope: string, state = "new", page = 1, preview = false) {
  return queryOptions({ queryKey: [scope, preview ? "inbox-preview" : "inbox", state, page], queryFn: ({ signal }) =>
    workspaceJson<InboxPage>(`workspace/inbox?state=${encodeURIComponent(state)}&page=${page}${preview ? "&preview=true" : ""}`, { signal }) });
}

export function savedViewsOptions(scope: string, tab = "sources", cursor = "") {
  return queryOptions({ queryKey: [scope, "views", tab, cursor], queryFn: ({ signal }) => workspaceJson<WorkspacePage<SavedWorkspaceView>>(`saved-views?limit=20&kind=${tab === "sources" ? "source_bookmark" : "source_view"}&cursor=${encodeURIComponent(cursor)}`, { signal }) });
}

export function researchListOptions(scope: string, q = "", status = "all", cursor = "") {
  return queryOptions({ queryKey: [scope, "research-list", q, status, cursor],
    queryFn: async ({ signal }): Promise<WorkspacePage<ResearchSummary>> => {
      const response = await fetch(`/api/research?${new URLSearchParams({ q, status, cursor })}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Research list unavailable");
      const payload = await response.json();
      if (!Array.isArray(payload?.items) || !payload.items.every((item: ResearchSummary) => item && typeof item.id === "string" && typeof item.objective === "string" && typeof item.updated_at === "string" && ["queued", "running", "completed", "stopped", "failed", "limit_reached", "insufficient_evidence"].includes(item.status))) throw new Error("Invalid research list");
      return payload;
    } });
}
