import { workspaceApi } from "@/lib/workspace-api";

export async function GET() {
  try {
    const upstream = await workspaceApi("chat/threads/usage");
    return new Response(upstream.body, { status: upstream.status, headers: {
      "Content-Type": "application/json", "Cache-Control": "private, no-store",
    } });
  } catch {
    return Response.json({ detail: "Usage unavailable" }, { status: 502 });
  }
}
