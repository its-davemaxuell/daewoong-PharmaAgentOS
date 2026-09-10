import { expect, it } from "vitest";
import { consumeChatStream } from "@/lib/chat-stream";

const options = { retrievalMode: "auto" as const, modelProfile: "auto" as const };
const completion = JSON.stringify({ type: "complete", data: { answer: "한국어 answer", evidence_sufficiency: "partial", citations: [] } });
function response(chunks: Uint8Array[]) {
  return new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } }));
}
it("decodes split UTF-8 and CRLF and accepts the complete final event without a newline", async () => {
  const bytes = new TextEncoder().encode('{"type":"phase","phase":"retrieving"}\r\n' + completion);
  const answer = await consumeChatStream(response([...bytes].map(byte => new Uint8Array([byte]))), {}, options, () => {});
  expect(answer.answer).toBe("한국어 answer");
});
it("fails incomplete, malformed and oversized streams without promoting a draft", async () => {
  for (const text of ['{"type":"draft_delta","attempt":1,"text":"draft"}\n', '{"type":', 'x'.repeat(4_000_001) + '\n']) {
    await expect(consumeChatStream(response([new TextEncoder().encode(text)]), {}, options, () => {})).rejects.toThrow();
  }
});
it("cancels the reader on protocol failure and only accepts the first terminal completion", async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("invalid\n")); }, cancel() { cancelled = true; } });
  await expect(consumeChatStream(new Response(stream), {}, options, () => {})).rejects.toThrow("malformed");
  expect(cancelled).toBe(true);
  const events: string[] = [];
  await consumeChatStream(response([new TextEncoder().encode(completion + '\n' + completion)]), {}, options, event => events.push(event.type));
  expect(events).toEqual(["complete"]);
});
