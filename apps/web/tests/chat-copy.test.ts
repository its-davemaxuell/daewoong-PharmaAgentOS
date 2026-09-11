import { expect, it } from "vitest";
import { answerWithSources } from "@/lib/chat-copy";
import type { RagAnswer } from "@/lib/types";

it("retains citation numbering and version provenance without copying invalid source links", () => {
  const answer = { answer: "Finding [1] and [2]", citations: [
    { company: "A", title: "Letter A", sourceUrl: "https://www.fda.gov/letter-a", anchor: "p1", documentVersionId: "version-1" },
    { company: "B", title: "Letter B", sourceUrl: "javascript:alert(1)", anchor: "p2" },
  ] } as RagAnswer;
  const content = answerWithSources(answer, "en");
  expect(content).toContain("Finding [1] and [2]");
  expect(content).toContain("[1] A — Letter A\nhttps://www.fda.gov/letter-a\np1 · version-1");
  expect(content).toContain("[2] B — Letter B\nSource link unavailable\np2");
  expect(content).not.toContain("javascript:");
  expect(answerWithSources(answer, "ko")).toContain("담당자 검토 필요");
});
