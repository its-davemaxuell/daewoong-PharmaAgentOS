import { expect, it, vi } from "vitest";
import { readEvidenceCoverage, trustedFdaUrl } from "@/lib/evidence-state";
import { normalizeRagAnswer } from "@/lib/rag-contract";
import { readLetterQuery, previewLetterPage } from "@/lib/letter-query";
import { problemKind, safeRequestId } from "@/lib/api-problem";
import { seedLetters } from "@/lib/seed-data";

it("preserves missing evidence coverage even when citations exist", () => {
  for (const value of [undefined, null, "approved", {}, "SUFFICIENT"]) expect(readEvidenceCoverage(value)).toBe("unknown");
  expect(readEvidenceCoverage("partial")).toBe("partial");
  const result = normalizeRagAnswer({ answer: "Example [1]", citations: [{ letter_id: "one", excerpt: "Example" }] }, {}, {});
  expect(result?.evidenceSufficiency).toBe("unknown");
});

it("accepts only official document URLs without credentials or nonstandard ports", () => {
  for (const url of [undefined, "", "https://www.fda.gov/", "http://fda.gov/doc", "https://fda.gov.evil.test/doc", "https://evilfda.gov/doc", "https://user:pass@fda.gov/doc", "https://fda.gov:444/doc", "javascript:alert(1)", "//fda.gov/doc"]) expect(trustedFdaUrl(url)).toBeUndefined();
  expect(trustedFdaUrl("https://www.fda.gov/inspections/example#p1")).toBe("https://www.fda.gov/inspections/example#p1");
});

it("normalizes dates, fractional pages, excessive pages and reversed ranges", () => {
  const query = readLetterQuery(new URLSearchParams("page=1.5&pageSize=999&postedFrom=2026-02-30&postedTo=oops&sort=nope"));
  expect(query).toMatchObject({ page: 1, pageSize: 20, sort: "posted-desc", filters: { postedFrom: "", postedTo: "" } });
  const reversed = readLetterQuery(new URLSearchParams("postedFrom=2026-09-10&postedTo=2026-01-01"));
  expect(reversed.filters).toMatchObject({ postedFrom: "2026-01-01", postedTo: "2026-09-10" });
});

it("keeps preview facets independent of an empty filter result", () => {
  const query = readLetterQuery(new URLSearchParams("q=NO_MATCH_FICTIONAL"));
  const page = previewLetterPage(seedLetters, query);
  expect(page.total).toBe(0);
  expect(page.facets.country.length).toBeGreaterThan(0);
  expect(page.collectionTotal).toBe(seedLetters.length);
});

it("maps operational failures separately and bounds diagnostic identifiers", () => {
  expect([401, 403, 404, 429, 500, 502, 503].map(problemKind)).toEqual(["restricted", "restricted", "not-found", "rate-limited", "unavailable", "invalid-response", "unavailable"]);
  expect(safeRequestId("request-123")).toBe("request-123");
  expect(safeRequestId("private payload with spaces")).toBeUndefined();
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/backend-auth", () => ({ getBackendBearerAssertion: async () => "fixture" }));

it("does not manufacture missing source classification, scope, link or version", async () => {
  vi.resetModules(); vi.stubEnv("API_BASE_URL", "https://fixture.example");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "missing", company_name: "Fictional company" })));
  try {
    const { getLetter } = await import("@/lib/api-client");
    const { data } = await getLetter("missing");
    expect(data).toMatchObject({ productClasses: [], scopeStatus: "unknown", sourceUrl: "", sourceVersion: "" });
    expect(data?.metadataIssues).toEqual(expect.arrayContaining(["classification", "scope", "source-link", "version", "hash"]));
  } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});
