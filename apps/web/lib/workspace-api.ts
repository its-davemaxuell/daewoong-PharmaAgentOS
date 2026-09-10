import "server-only";
import { backendOrigin } from "./backend-origin";
import { getBackendBearerAssertion } from "./backend-auth";

export async function workspaceApi(path: string, init?: RequestInit) {
  const origin = backendOrigin();
  if (!origin) return new Response(null, { status: 503 });
  const token = await getBackendBearerAssertion();
  if (!token) return new Response(null, { status: 401 });
  const headers = new Headers({ Authorization: `Bearer ${token}`, Accept: "application/json" });
  if (init?.body) headers.set("Content-Type", "application/json");
  return fetch(`${origin}/api/v1/${path}`, { ...init, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
}
