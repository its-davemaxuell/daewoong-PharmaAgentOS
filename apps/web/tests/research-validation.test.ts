import { describe, expect, it } from "vitest";
import { isResearchRun } from "../lib/research-validation";
import { researchText, type ResearchRun } from "../lib/research-types";

const source = { id: "S1", chunk_id: "c", letter_id: "l", company: "Example", source_url: "https://www.fda.gov/example", anchor: "a", version_id: "v", version: 1, source_hash: "a".repeat(64), chunk_hash: "b".repeat(64), excerpt: "Evidence" };
const run = { id: "r", objective: "Research", status: "completed", revision: 2, plan: ["Read"], sources: [source], events: [], result: { schema_version: 2, findings: [{ statement: "Observation", support: "supported", citation_ids: ["S1"], limitations: [] }] } };
describe("typed research output", () => {
  it("accepts complete typed findings", () => expect(isResearchRun(run)).toBe(true));
  it("rejects incomplete structured output", () => expect(isResearchRun({ ...run, result: { findings: [null] } })).toBe(false));
  it("rejects unresolved citations", () => expect(isResearchRun({ ...run, sources: [] })).toBe(false));
  it("does not interpret future component versions", () => expect(isResearchRun({ ...run, result: { ...run.result, schema_version: 99 } })).toBe(false));
  it("retains historical findings without inventing support labels", () => expect(isResearchRun({ ...run, result: { findings: [{ statement: "Observation", citation_ids: ["S1"] }] } })).toBe(true));
  it("preserves uncertainty when copying or downloading plain text", () => {
    const value: ResearchRun = { ...run, status: "completed", language: "en", stage: "complete",
      created_at: "2026-09-11T00:00:00Z", updated_at: "2026-09-11T00:00:00Z", started_at: null,
      finished_at: null, model_calls: 0, max_model_calls: 12, error_code: null, can_resume: false,
      sources: [{ ...source, posted_date: null }],
      result: { findings: [{ statement: "A disputed claim", support: "contradicted", citation_ids: ["S1"], limitations: ["Limited evidence"] }] } };
    expect(researchText(value)).toContain("Contradicted claim: A disputed claim");
    expect(researchText(value)).toContain("Limited evidence");
  });
});
