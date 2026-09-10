import { normalizeRagStreamEvent, type RagStreamEvent } from "@/lib/rag-contract";
import type { RagFilter, RagAnswer, ChatRetrievalMode, ChatModelProfile } from "@/lib/types";

export class ChatStreamFailure extends Error {
  constructor(
    message: string,
    readonly kind: "server" | "protocol" | "incomplete",
    readonly code?: string,
  ) {
    super(message);
    this.name = "ChatStreamFailure";
  }
}

export async function consumeChatStream(
  response: Response,
  filters: RagFilter,
  options: {
    threadId?: string;
    clientMessageId?: string;
    retrievalMode: ChatRetrievalMode;
    modelProfile: ChatModelProfile;
  },
  onEvent: (event: RagStreamEvent) => void,
): Promise<RagAnswer> {
  if (!response.body) {
    throw new ChatStreamFailure("The response did not include a readable stream.", "protocol");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  const processLine = (rawLine: string) => {
    if (rawLine.length > 4_000_000) throw new ChatStreamFailure("The service returned an oversized stream event.", "protocol");
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line.trim()) return undefined;
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch {
      throw new ChatStreamFailure("The service returned malformed NDJSON.", "protocol");
    }
    const event = normalizeRagStreamEvent(payload, filters, options);
    if (!event) {
      throw new ChatStreamFailure("The service returned an unknown stream event.", "protocol");
    }
    onEvent(event);
    if (event.type === "error") {
      throw new ChatStreamFailure(event.message, "server", event.code);
    }
    return event.type === "complete" ? event.data : undefined;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const completed = processLine(buffer.slice(0, newlineIndex));
        buffer = buffer.slice(newlineIndex + 1);
        if (completed) {
          await reader.cancel();
          return completed;
        }
        newlineIndex = buffer.indexOf("\n");
      }
      if (buffer.length > 4_000_000) {
        throw new ChatStreamFailure("The service returned an oversized stream event.", "protocol");
      }
    }
    buffer += decoder.decode();
    const completed = processLine(buffer);
    if (completed) return completed;
    throw new ChatStreamFailure(
      "The connection ended before a verified answer was received.",
      "incomplete",
    );
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

