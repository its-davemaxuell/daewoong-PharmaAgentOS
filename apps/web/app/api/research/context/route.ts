import { getPortalIdentity } from "@/lib/backend-auth";
import { researchApi, researchError, researchHeaders } from "@/lib/research-api";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 180) return new Response(null, { status: 422 });
  try {
    await getPortalIdentity();
    return Response.json(await researchApi(`/context?q=${encodeURIComponent(query)}`), { headers: researchHeaders });
  } catch (error) { return researchError(error); }
}
