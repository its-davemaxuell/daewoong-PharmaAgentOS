import { validateWorkspaceResponse } from "./workspace-contract";
import { cancelViewFade, changeView, viewIdentity } from "@/components/motion/view-fade";
export class WorkspaceError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export async function workspaceJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/workspace/${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  if (!response.ok) throw new WorkspaceError(response.status, response.status === 409 ? "conflict" : "unavailable");
  if (response.status === 204) return undefined as T;
  return validateWorkspaceResponse(path, await response.json()) as T;
}
export function setWorkspaceParams(values: Record<string, string | null>, replace = false) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  const update = () => {
    // Merge against the latest URL so typing during an exit cannot lose filters.
    const current = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) current.searchParams.set(key, value); else current.searchParams.delete(key);
    }
    window.history[replace ? "replaceState" : "pushState"](null, "", current);
  };
  if (viewIdentity(url) !== viewIdentity(new URL(window.location.href))) changeView(update, undefined, true);
  else {
    const main = document.getElementById("main-content");
    if (main && ["tab", "view", "state", "run", "status", "kind", "days"].some(key => key in values)) cancelViewFade(main);
    update();
  }
}
