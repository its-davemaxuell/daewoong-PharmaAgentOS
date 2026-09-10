export type ProblemKind = "restricted" | "not-found" | "rate-limited" | "invalid-response" | "not-configured" | "unavailable";
export function problemKind(status: number): ProblemKind {
  if (status === 401 || status === 403) return "restricted";
  if (status === 404) return "not-found";
  if (status === 429) return "rate-limited";
  if (status === 502) return "invalid-response";
  return "unavailable";
}
export function safeRequestId(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) ? value : undefined;
}
