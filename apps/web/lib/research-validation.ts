import type { ResearchRun } from "./research-types";

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
export function isContextSource(value: unknown): boolean {
  if (!record(value)) return false;
  return ["chunk_id", "letter_id", "company", "source_url", "anchor", "version_id", "source_hash", "chunk_hash", "excerpt"].every(key => typeof value[key] === "string")
    && Number.isInteger(value.version) && Number(value.version) > 0;
}
export function isResearchRun(value: unknown): value is ResearchRun {
  if (!record(value) || typeof value.id !== "string" || typeof value.objective !== "string"
    || !["queued", "running", "completed", "stopped", "failed", "limit_reached", "insufficient_evidence"].includes(String(value.status))
    || !Number.isInteger(value.revision) || !strings(value.plan) || !Array.isArray(value.sources)
    || !value.sources.every(source => isContextSource(source) && typeof source.id === "string")
    || !Array.isArray(value.events) || !value.events.every(event => record(event)
      && Number.isInteger(event.sequence) && typeof event.kind === "string" && record(event.data))) return false;
  if (value.context != null) {
    const context = value.context;
    if (!record(context) || context.schema_version !== 1 || typeof context.context_hash !== "string"
      || typeof context.hydrated_at !== "string" || !strings(context.selected_chunk_ids)
      || !Array.isArray(context.sources) || !context.sources.every(isContextSource)) return false;
  }
  if (value.result != null) {
    const result = value.result;
    if (!record(result) || (result.schema_version !== undefined && result.schema_version !== 2)) return false;
    if (result.findings !== undefined) {
      const sources = new Set(value.sources.map(source => source.id));
      if (!Array.isArray(result.findings) || !result.findings.every(finding => record(finding)
        && typeof finding.statement === "string" && strings(finding.citation_ids)
        && finding.citation_ids.every(id => sources.has(id))
        && (finding.support === undefined ? result.schema_version === undefined : ["supported", "contradicted", "insufficient"].includes(String(finding.support)))
        && (finding.limitations === undefined || strings(finding.limitations)))) return false;
    }
    if (value.status === "completed" && (!Array.isArray(result.findings) || !result.findings.length)) return false;
  } else if (value.status === "completed") return false;
  return true;
}
