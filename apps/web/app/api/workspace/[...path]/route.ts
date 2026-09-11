import { workspaceApi } from "@/lib/workspace-api";
import { validMutation } from "@/lib/research-api";

const allowed = /^(workspace\/(search|inbox)(\/[0-9a-f-]{36})?|research\/briefs(\/[0-9a-f-]{36}(\/export)?)?|saved-views(\/[0-9a-f-]{36})?|runs\/[0-9a-f-]{36}(\/(events|inspection))?)$/;
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowed.test(path)) return new Response(null, { status: 404 });
  const mutating = request.method !== "GET";
  if (path.startsWith("runs/") && mutating) return new Response(null, { status: 405 });
  if (mutating && !validMutation(request)) return new Response(null, { status: 403 });
  try {
    const body = mutating ? await request.text() : undefined;
    if (body && body.length > 16000) return new Response(null, { status: 413 });
    const upstream = await workspaceApi(path + new URL(request.url).search, { method: request.method, body });
    const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "private, no-store" });
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch { return Response.json({ detail: "Workspace temporarily unavailable" }, { status: 502 }); }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
