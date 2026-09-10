export type EvidenceCoverage = "sufficient" | "partial" | "insufficient" | "unknown";

export function readEvidenceCoverage(value: unknown): EvidenceCoverage {
  return value === "sufficient" || value === "partial" || value === "insufficient" ? value : "unknown";
}

/** Official document links only. A homepage is not a substitute for a source. */
export function trustedFdaUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !(url.hostname === "fda.gov" || url.hostname.endsWith(".fda.gov")) || url.pathname === "/") return undefined;
    return url.href;
  } catch { return undefined; }
}
