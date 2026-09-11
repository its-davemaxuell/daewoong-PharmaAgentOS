export type ResearchStatus = "queued" | "running" | "completed" | "stopped" | "failed" | "limit_reached" | "insufficient_evidence";
export type ResearchSource = {
  id: string; chunk_id: string; letter_id: string; company: string; source_url: string;
  anchor: string; version_id: string; version: number; source_hash: string;
  chunk_hash: string; posted_date: string | null; excerpt: string;
};
export type ResearchEvent = {
  sequence: number; kind: string; stage: string; created_at: string;
  data: { query?: string; count?: number; steps?: string[]; title?: string; code?: string;
    issues?: string[]; sources?: Array<Pick<ResearchSource, "id" | "company" | "letter_id" | "anchor">> };
};
export type ResearchBrief = {
  schema_version?: 2;
  title?: string; findings?: Array<{ statement: string; citation_ids: string[]; support?: "supported" | "contradicted" | "insufficient"; limitations?: string[] }>;
  review_questions?: string[]; limitations?: string[]; sources?: ResearchSource[];
  explanation?: string; evidence_check?: string;
};
export type ResearchSummary = {
  id: string; objective: string; language: "ko" | "en"; status: ResearchStatus;
  stage: string; revision: number; created_at: string; updated_at: string;
  started_at: string | null; finished_at: string | null; model_calls: number;
  max_model_calls: number; error_code: string | null; can_resume: boolean;
};
export type ResearchRun = ResearchSummary & {
  context?: { schema_version: 1; context_hash: string; hydrated_at: string; selected_chunk_ids: string[]; sources: Omit<ResearchSource, "id">[] } | null;
  plan: string[]; sources: ResearchSource[]; events: ResearchEvent[]; result: ResearchBrief | null;
};

export const researchActive = (status: ResearchStatus) => status === "queued" || status === "running";

export function mergeResearchRun(current: ResearchRun | undefined, incoming: ResearchRun): ResearchRun {
  if (!current || current.id !== incoming.id) return incoming;
  if (incoming.revision < current.revision) return current;
  const events = new Map(current.events.map((event) => [event.sequence, event]));
  incoming.events.forEach((event) => events.set(event.sequence, event));
  return { ...incoming, events: [...events.values()].sort((a, b) => a.sequence - b.sequence) };
}

export function researchText(run: ResearchRun): string {
  const brief = run.result;
  return [
    brief?.title || run.objective, "", "FDA research · Draft for human review", "",
    ...(brief?.findings || []).map((finding) => {
      const labels = { supported: "Supported", contradicted: "Contradicted claim", insufficient: "Unresolved" };
      const label = finding.support ? `${labels[finding.support]}: ` : "";
      const citations = finding.citation_ids.length ? ` [${finding.citation_ids.join(", ")}]` : "";
      return `${label}${finding.statement}${citations}\n${(finding.limitations || []).join("\n")}\n`;
    }),
    ...(brief?.review_questions || []).map((question) => `• ${question}`), "",
    ...(brief?.limitations || []), brief?.explanation || "", "",
    ...(brief?.sources || []).map((source) => `[${source.id}] ${source.company}\n${source.source_url}\nVersion ${source.version} · ${source.anchor}\n${source.excerpt}\n`),
  ].join("\n");
}
