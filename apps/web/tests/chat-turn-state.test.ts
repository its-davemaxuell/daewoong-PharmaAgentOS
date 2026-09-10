import { expect, it } from "vitest";
import { applyStreamEvent, type StreamTurnState } from "@/lib/chat-turn-state";
it("does not allow old attempts or late phases to replace a terminal state", () => {
  const state: StreamTurnState = { streamAttempt: 2, provisionalDraft: "new" };
  expect(applyStreamEvent(state, { type: "draft_delta", attempt: 1, text: "old" })).toBe(state);
  expect(applyStreamEvent(state, { type: "draft_reset", attempt: 1 })).toBe(state);
  const failed = applyStreamEvent(state, { type: "error", code: "failure", message: "Interrupted" });
  expect(failed.provisionalDraft).toBeUndefined();
  expect(applyStreamEvent(failed, { type: "phase", phase: "generating" })).toBe(failed);
  const cancelled = { ...state, cancelled: true };
  expect(applyStreamEvent(cancelled, { type: "draft_delta", attempt: 2, text: "late" })).toBe(cancelled);
});
