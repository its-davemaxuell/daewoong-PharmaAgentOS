import { getLetter } from "@/lib/api-client";
import { requirePortalRole } from "@/lib/backend-auth";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePortalRole("viewer");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const result = await getLetter(id);
    if (!result.data) return new Response(null, { status: 404 });
    return Response.json(result.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return new Response(null, { status: 502 }); }
}
