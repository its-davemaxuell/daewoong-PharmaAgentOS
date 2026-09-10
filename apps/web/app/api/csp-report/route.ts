/** Bounded diagnostics. Never retain report URLs, source samples, cookies or user content. */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 8192 || !request.body) return new Response(null, { status: 413 });
  const reader = request.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) return new Response(null, { status: 413 });
    }
    // Count reports in request metrics; bodies are deliberately discarded.
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
