import { queryOptions } from "@tanstack/react-query";

export const usageMetrics = ["conversations", "chat_requests", "research_runs", "research_model_calls", "research_tokens"] as const;
export type PersonalUsage = Record<typeof usageMetrics[number], number> & { since: string; as_of: string; scope: "personal" };

export function personalUsageOptions(scope: string) {
  return queryOptions({ queryKey: [scope, "personal-usage"], queryFn: async ({ signal }): Promise<PersonalUsage> => {
    const response = await fetch("/api/usage", { signal });
    if (!response.ok) throw new Error("Usage unavailable");
    const data = await response.json();
    if (data.scope !== "personal" || !Number.isFinite(Date.parse(data.since)) || !Number.isFinite(Date.parse(data.as_of)) || usageMetrics.some(key => !Number.isSafeInteger(data[key]) || data[key] < 0)) throw new Error("Usage unavailable");
    return data;
  } });
}
