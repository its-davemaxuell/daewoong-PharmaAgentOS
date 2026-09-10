import type { RagAnswer } from "./types";
import type { RagStreamEvent, RagStreamPhase } from "./rag-contract";

export type StreamTurnState = { answer?: RagAnswer; provisionalDraft?: string; streamAttempt?: number; streamPhase?: RagStreamPhase; error?: string; cancelled?: boolean };
/** Keep provisional text separate from a terminal answer; discard older generation attempts. */
export function applyStreamEvent<T extends StreamTurnState>(state: T, event: RagStreamEvent): T {
  if (state.answer || state.cancelled || state.error) return state;
  if (event.type === "phase") return { ...state, streamPhase: event.phase };
  if (event.type === "draft_delta") {
    if (state.streamAttempt !== undefined && event.attempt < state.streamAttempt) return state;
    return { ...state, provisionalDraft: (state.streamAttempt === event.attempt ? state.provisionalDraft ?? "" : "") + event.text, streamAttempt: event.attempt, streamPhase: "generating" };
  }
  if (event.type === "draft_reset") {
    if (state.streamAttempt !== undefined && event.attempt < state.streamAttempt) return state;
    return { ...state, provisionalDraft: undefined, streamAttempt: event.attempt, streamPhase: "generating" };
  }
  if (event.type === "complete") return { ...state, answer: event.data, provisionalDraft: undefined, streamAttempt: undefined, streamPhase: undefined, error: undefined };
  return { ...state, error: event.message, provisionalDraft: undefined, streamAttempt: undefined, streamPhase: undefined };
}
