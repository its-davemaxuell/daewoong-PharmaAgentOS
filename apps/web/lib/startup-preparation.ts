import type { QueryClient } from "@tanstack/react-query";
import { portalNavigation } from "./navigation";
import type { AppRole } from "./auth-types";
import type { MenuResource } from "./menu-data-types";
import { menuQueryOptions } from "./menu-queries";
import { bookmarkPageOptions, sourcePageOptions } from "./source-queries";
import { letterQueryString, readLetterQuery } from "./letter-query";
import { briefListOptions, inboxOptions, researchListOptions, savedViewsOptions } from "./workspace-queries";

export type PreparationTask = { id: string; en: string; ko: string; run: () => Promise<unknown> };
export type PreparationStatus = "pending" | "ready" | "failed";
export const menuModules: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/components/agent-platform/beginner-home"),
  "/drug-letters": () => import("@/components/workspace/sources-workspace"),
  "/research": () => import("@/components/research/research-workspace"),
  "/saved-work": () => import("@/components/workspace/saved-workspace"),
  "/inbox": () => import("@/components/workspace/inbox-workspace"),
  "/ask": () => import("@/components/prepared/chat-entry"),
  "/agents": () => import("@/components/agent-platform/agent-team"),
  "/usage": () => import("@/components/workspace/usage-workspace"),
  "/settings": () => import("@/components/system-settings"),
  "/help": () => import("@/components/agent-platform/employee-guide"),
  "/search": () => import("@/components/workspace/search-workspace"),
};
const preparedModule = () => import("@/components/prepared/menu-workspace");

export function preparationTasks(client: QueryClient, scope: string, roles: AppRole[], linear: boolean, destination: URL) {
  const menus = [{ href: "/dashboard", en: "Home", ko: "홈" }, ...portalNavigation(linear).navItems.filter(item => !item.requiredRole || roles.includes(item.requiredRole)), { href: "/search", en: "Search", ko: "검색" }].filter((menu, index, all) => all.findIndex(item => item.href === menu.href) === index);
  const tasks: PreparationTask[] = menus.map(menu => ({ id: menu.href, en: menu.en, ko: menu.ko, run: async () => {
    const params = destination.pathname === menu.href ? destination.searchParams : new URLSearchParams();
    await (menuModules[menu.href] ?? preparedModule)();
    const source = () => client.fetchQuery(sourcePageOptions(scope, letterQueryString(readLetterQuery(menu.href === "/drug-letters" ? params : new URLSearchParams()))));
    switch (menu.href) {
      case "/dashboard": await Promise.all([source(), client.fetchQuery(researchListOptions(scope))]); break;
      case "/drug-letters": {
        const page = await source();
        if (page.data.items.length) await client.fetchQuery(bookmarkPageOptions(scope, page.data.items.map(letter => letter.id), client));
        break;
      }
      case "/ask": await source(); break;
      case "/research": await client.fetchQuery(researchListOptions(scope, params.get("q") || "", params.get("status") || "all", params.get("cursor") || "")); break;
      case "/saved-work": {
        const tab = params.get("tab") || "briefs";
        if (tab === "briefs") await client.fetchQuery(briefListOptions(scope, Number(params.get("page")) || 1));
        else if (tab === "sources" || tab === "views") await client.fetchQuery(savedViewsOptions(scope, tab, params.get("cursor") || ""));
        break;
      }
      case "/inbox": await client.fetchQuery(inboxOptions(scope, params.get("state") || "new", Number(params.get("page")) || 1, true)); break;
      case "/usage": case "/settings": case "/agents": case "/help": case "/search": break;
      default: await client.fetchQuery(menuQueryOptions(scope, (menu.href === "/requests" ? "cases" : menu.href.slice(1)) as MenuResource, menu.href === "/requests" ? new URLSearchParams() : params));
    }
  }}));
  // Start independent aggregations before Home/Chat/Sources can occupy workers
  // awaiting the same source page. Production traces put operations and trends
  // on the critical path; the actual opening page still gets first priority.
  const early = ["/control-tower", "/trends", "/evaluations", "/drug-letters"];
  const priority = (task: PreparationTask) => task.id === destination.pathname ? -1 : early.includes(task.id) ? early.indexOf(task.id) : early.length;
  return tasks.sort((a, b) => priority(a) - priority(b));
}

/** Bounded workers; failed tasks never suppress successful preparation. */
export async function runPreparation(tasks: PreparationTask[], concurrency: number, signal: AbortSignal, settle: (id: string, status: PreparationStatus) => void) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (!signal.aborted && index < tasks.length) {
      const task = tasks[index++];
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([task.run(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Preparation timed out")), 30_000); })]);
        if (!signal.aborted) settle(task.id, "ready");
      }
      catch { if (!signal.aborted) settle(task.id, "failed"); }
      finally { clearTimeout(timer); }
    }
  }));
}
