import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { sourcePageOptions } from "../lib/source-queries";

const payload = { data: { items: [], total: 0, collectionTotal: 0, page: 1, pageSize: 20, facets: {} }, mode: "live" };
afterEach(() => vi.unstubAllGlobals());

it("shares an in-flight prefetch with navigation and keeps owners and filters separate", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient();
  try {
    const options = sourcePageOptions("owner-a", "page=1");
    await Promise.all([client.prefetchQuery(options), client.fetchQuery(options)]);
    await client.fetchQuery(options);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(sourcePageOptions("owner-b", "page=1").queryKey)).toBeUndefined();
    expect(client.getQueryData(sourcePageOptions("owner-a", "page=2").queryKey)).toBeUndefined();
    await client.invalidateQueries({ queryKey: ["owner-a", "letters"] });
    await client.fetchQuery(options);
    expect(fetch).toHaveBeenCalledTimes(2);
  } finally { client.clear(); }
});

it("retains cached content when a stale refresh fails and allows recovery", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const options = sourcePageOptions("owner", "page=1");
    await client.fetchQuery(options);
    await client.invalidateQueries({ queryKey: options.queryKey });
    fetch.mockResolvedValueOnce({ ok: false });
    await expect(client.fetchQuery(options)).rejects.toThrow("Library unavailable");
    expect(client.getQueryData(options.queryKey)).toEqual(payload);
    await expect(client.fetchQuery(options)).resolves.toEqual(payload);
  } finally { client.clear(); }
});

it("rejects malformed responses before they can enter the cache", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] }, mode: "live" }) }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const options = sourcePageOptions("owner", "page=1");
    await expect(client.fetchQuery(options)).rejects.toThrow("Invalid library response");
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally { client.clear(); }
});
