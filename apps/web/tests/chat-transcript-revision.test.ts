import { expect, it } from "vitest";
import { chatTranscriptRevision } from "@/lib/chat-transcript-revision";
import type { ChatMessage } from "@/lib/types";

const answer: ChatMessage = {
  id: "answer", sequence: 2, role: "assistant", status: "complete", content: "Answer A",
  citations: [], generationUsed: true, createdAt: "2026-09-09T00:00:00Z",
};

it("preserves open workspace tools when feedback changes the message timestamp", () => {
  expect(chatTranscriptRevision([{
    ...answer, feedbackRating: "helpful", updatedAt: "2026-09-10T00:00:00Z",
  }])).toBe(chatTranscriptRevision([answer]));
});

it("refreshes a replaced answer even when its length and timestamp stay the same", () => {
  expect(chatTranscriptRevision([{ ...answer, content: "Answer B" }]))
    .not.toBe(chatTranscriptRevision([answer]));
});

it("refreshes completed streams and newly appended turns", () => {
  expect(chatTranscriptRevision([{ ...answer, status: "streaming" }]))
    .not.toBe(chatTranscriptRevision([answer]));
  expect(chatTranscriptRevision([answer, { ...answer, id: "next", sequence: 3 }]))
    .not.toBe(chatTranscriptRevision([answer]));
});
