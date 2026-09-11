import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { preparationTasks, runPreparation } from "@/lib/startup-preparation";
import { menuParameters, menuQueryOptions, validMenuData } from "@/lib/menu-queries";
import { researchListOptions } from "@/lib/workspace-queries";

describe("startup preparation", () => {
  it("prepares every permitted menu including collapsed groups, prioritizing the destination", () => {
    const client = new QueryClient();
    const tasks = preparationTasks(client, "one", ["viewer"], true, new URL("https://example.test/trends?days=30"));
    expect(tasks[0].id).toBe("/trends");
    const homeTasks = preparationTasks(client, "one", ["viewer"], true, new URL("https://example.test/dashboard"));
    expect(homeTasks.slice(0, 4).map(task => task.id)).toEqual(["/dashboard", "/trends", "/evaluations", "/drug-letters"]);
    expect(new Set(tasks.map(task => task.id)).size).toBe(tasks.length);
    expect(tasks.map(task => task.id)).toEqual(expect.arrayContaining(["/inbox", "/cases", "/settings", "/help"]));
    expect(tasks.some(task => ["/admin", "/review", "/control-tower"].includes(task.id))).toBe(false);
    expect(preparationTasks(client, "two", ["admin", "reviewer"], true, new URL("https://example.test/dashboard")).map(task => task.id)).toContain("/control-tower");
    client.clear();
  });
  it("bounds concurrent work, records failures and completes independent tasks", async () => {
    let active = 0, maximum = 0;
    const settle = vi.fn();
    const tasks = Array.from({ length: 6 }, (_, index) => ({ id: String(index), en: "", ko: "", run: async () => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 1)); active--;
      if (index === 1) throw new Error("Unavailable");
    } }));
    await runPreparation(tasks, 2, new AbortController().signal, settle);
    expect(maximum).toBe(2);
    expect(settle).toHaveBeenCalledTimes(6);
    expect(settle).toHaveBeenCalledWith("1", "failed");
    expect(settle).toHaveBeenCalledWith("5", "ready");
  });
  it("does not publish late completions or start queued work after cancellation", async () => {
    const controller = new AbortController();
    const settle = vi.fn(), queued = vi.fn();
    await runPreparation([{ id: "one", en: "", ko: "", run: async () => controller.abort() }, { id: "two", en: "", ko: "", run: queued }], 1, controller.signal, settle);
    expect(settle).not.toHaveBeenCalled(); expect(queued).not.toHaveBeenCalled();
  });
  it("normalizes menu keys and isolates subjects", () => {
    expect(menuParameters("trends", new URLSearchParams("days=2"))).toBe("days=90");
    expect(menuParameters("approvals", new URLSearchParams("status=REJECTED"))).toBe("status=REJECTED");
    expect(menuParameters("cases", new URLSearchParams("status=malformed"))).toBe("");
    expect(menuQueryOptions("one", "cases").queryKey).not.toEqual(menuQueryOptions("two", "cases").queryKey);
  });
  it("rejects incomplete successful menu responses before caching readiness", () => {
    for (const resource of ["cases", "approvals", "evaluations", "control-tower", "trends", "saved-views", "admin", "review"] as const) {
      expect(validMenuData(resource, {})).toBe(false);
      expect(validMenuData(resource, null)).toBe(false);
    }
    expect(validMenuData("cases", { page: { items: [] }, canCreate: false })).toBe(true);
    expect(validMenuData("approvals", { items: [] })).toBe(true);
  });
  it("does not mark malformed research history as prepared", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [{ id: "broken" }] })));
    try {
      await expect(client.fetchQuery(researchListOptions("session"))).rejects.toThrow("Invalid research list");
      expect(client.getQueryData(researchListOptions("session").queryKey)).toBeUndefined();
    } finally { client.clear(); vi.unstubAllGlobals(); }
  });
});
