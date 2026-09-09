import { createHash } from "node:crypto";
import type { ChatMessage } from "@/lib/types";

/** Reset transcript state for new answer content, while preserving open tools on feedback updates. */
export function chatTranscriptRevision(messages: readonly ChatMessage[]): string {
  const transcript = messages.map(({ id, role, status, content, citations }) => (
    [id, role, status, content, citations]
  ));
  return createHash("sha256").update(JSON.stringify(transcript)).digest("hex");
}
