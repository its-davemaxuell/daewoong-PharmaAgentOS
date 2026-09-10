// Fictional browser/performance fixtures. Imported by the loopback server only.
export const researchId = "22222222-2222-4222-8222-222222222222";
export const longThreadId = "33333333-3333-4333-8333-333333333333";
const stamp = "2026-09-01T00:00:00Z";
export const researchFixture = {
  id: researchId, objective: "Review fictional cleaning-validation evidence for the quality team.",
  language: "en", status: "completed", stage: "complete", revision: 85,
  created_at: stamp, updated_at: stamp, started_at: stamp, finished_at: stamp,
  model_calls: 6, max_model_calls: 12, error_code: null, can_resume: false,
  plan: ["Find relevant retained letters", "Read source passages", "Check each claim"],
  sources: [{ id: "S1", chunk_id: "c1", letter_id: "11111111-1111-4111-8111-111111111111",
    company: "Fictional Pharma", source_url: "https://www.fda.gov/inspections/fictional-example",
    anchor: "p1", version_id: "version-1", version: 1, source_hash: "a".repeat(64),
    chunk_hash: "b".repeat(64), posted_date: "2026-09-01", excerpt: "Fictional source passage for testing. No real regulatory finding is represented." }],
  events: [...Array.from({ length: 80 }, (_, i) => ({ sequence: i + 1, kind: ["search_completed", "read_completed", "checkpoint_saved"][i % 3], stage: "reading", created_at: stamp, data: { count: 1, query: `Fictional evidence query ${i + 1}` } })),
    ...["plan_saved", "search_completed", "read_completed", "check_completed", "completed"].map((kind, i) => ({ sequence: 81 + i, kind, stage: "complete", created_at: stamp, data: {} }))],
  result: { title: "Fictional evidence brief", findings: [{ statement: "The fictional passage supports a question for human review.", citation_ids: ["S1"] }], review_questions: ["Which internal records would help answer this question?"], limitations: ["Fictional browser fixture; no actual compliance determination."], evidence_check: "passed" },
};
export function longThreadFixture(thread) {
  return { ...thread, id: longThreadId, title: "Fictional extended research conversation", messages: Array.from({ length: 60 }, (_, i) => thread.messages.map((message, j) => ({ ...message, id: `${message.id}-${i}`, sequence: i * 2 + j + 1, content: message.role === "user" ? `Fictional review question ${i + 1}` : `Fictional answer ${i + 1}. ${"This is an inspectable evidence discussion for performance testing. ".repeat(8)} [1]` }))).flat() };
}
