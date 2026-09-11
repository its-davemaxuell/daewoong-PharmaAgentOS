import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ dashboard: vi.fn(), letters: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ getDashboard: mocks.dashboard, getLetters: mocks.letters }));
import { getTrendsSummary } from "@/lib/trends-summary";

it("preserves period and per-letter counts without sending the catalogue to the browser", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
  mocks.dashboard.mockResolvedValue({ mode: "live", data: { discovery: { exceptions: 0, lastSuccess: "2026-09-11" } } });
  const letter = { company: "Private display record", categories: ["Validation", "Validation"], regulations: ["21 CFR 211.67"], retrievedAt: "2026-09-11T00:00:00Z" };
  mocks.letters.mockResolvedValue({ mode: "live", data: [
    { ...letter, postedDate: "2026-09-11" }, { ...letter, postedDate: "2026-09-01" }, { ...letter, postedDate: "2026-08-01" },
  ] });
  try {
    const summary = await getTrendsSummary(30);
    expect(summary).toMatchObject({ currentCount: 2, letterDelta: 1, periodStart: "2026-08-13", periodEnd: "2026-09-11", periodQuery: "postedFrom=2026-08-13&postedTo=2026-09-11" });
    expect(summary.categoryTrends).toEqual([{ label: "Validation", value: 2, previous: 1 }]);
    expect(JSON.stringify(summary)).not.toContain("Private display record");
  } finally { vi.useRealTimers(); }
});
