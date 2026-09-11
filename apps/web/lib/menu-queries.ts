import { queryOptions } from "@tanstack/react-query";
import type { MenuResource, MenuResult } from "./menu-data-types";
import { CASE_STATUSES } from "./case-types";
import { problemKind, safeRequestId, type ProblemKind } from "./api-problem";

export class MenuReadError extends Error {
  constructor(readonly kind: ProblemKind, readonly requestId?: string) { super("Menu temporarily unavailable"); }
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export function validMenuData(resource: MenuResource, value: unknown) {
  if (!record(value)) return false;
  const arrays = (...keys: string[]) => keys.every(key => Array.isArray(value[key]));
  const mode = value.mode === "live" || value.mode === "seeded";
  switch (resource) {
    case "cases": return record(value.page) && Array.isArray(value.page.items) && typeof value.canCreate === "boolean";
    case "approvals": return arrays("items");
    case "evaluations": return arrays("suites", "runs", "inventory") && typeof value.canDevelop === "boolean" && typeof value.canRelease === "boolean";
    case "control-tower": return record(value.tower) && typeof value.tower.generatedAt === "string" && arrays("inventory", "controls") && typeof value.canReadControls === "boolean" && typeof value.canOperateControls === "boolean";
    case "trends": return mode && record(value.data) && record(value.data.discovery) && arrays("categoryTrends", "regulations") && Number.isSafeInteger(value.currentCount) && typeof value.periodStart === "string" && typeof value.periodEnd === "string";
    case "saved-views": return mode && arrays("entries");
    case "admin": return mode && record(value.data) && record(value.data.notification) && record(value.data.corpus) && Array.isArray(value.data.health);
    case "review": return mode && record(value.data) && Array.isArray(value.data.items);
  }
}

export function menuParameters(resource: MenuResource, params: URLSearchParams) {
  if (resource === "trends") return `days=${[30, 90, 365].includes(Number(params.get("days"))) ? params.get("days") : "90"}`;
  const status = params.get("status") || "";
  const allowed: readonly string[] = resource === "cases" ? CASE_STATUSES : resource === "approvals" ? ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"] : [];
  return allowed.includes(status) ? `status=${status}` : "";
}
export function menuQueryOptions<K extends MenuResource>(scope: string, resource: K, params = new URLSearchParams()) {
  const query = menuParameters(resource, params);
  return queryOptions({ queryKey: [scope, "menu", resource, query], staleTime: 30_000,
    queryFn: async ({ signal }): Promise<MenuResult<K>> => {
      const response = await fetch(`/api/portal/menus/${resource}?${query}`, { signal, cache: "no-store" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new MenuReadError(error.kind || problemKind(response.status), safeRequestId(error.requestId));
      }
      const payload = await response.json();
      if (payload?.status !== "restricted" && (payload?.status !== "ready" || !validMenuData(resource, payload.data))) throw new MenuReadError("invalid-response");
      return payload;
    },
  });
}
