import { test, expect } from "@playwright/test";
import { retainFixtureSession } from "./session-fixture";

const thread = "44444444-4444-4444-8444-444444444444";
for (const locale of ["en", "ko"] as const) {
  test(`${locale}: date and country filters survive submission and evidence distinguishes dates`, async ({ page, context }, info) => {
    await context.addCookies([{ name: "dli_locale", value: locale, url: "http://127.0.0.1:3100" }]);
    await retainFixtureSession(page);
    const savedThread = { id: thread, title: "Fictional metadata test", created_at: "2026-09-16T00:00:00Z", updated_at: "2026-09-16T00:00:00Z", active_letter_ids: [], messages: [] as Array<Record<string, unknown>> };
    await page.request.post("http://127.0.0.1:8100/__fixtures/chat", { data: savedThread });
    const requests: Array<Record<string, unknown>> = [];
    await page.route("**/api/chat/query", async route => {
      requests.push(route.request().postDataJSON());
      const data = {
        query_id: "metadata-fixture", answer: "**2 saved FDA Drug warning letters** match this query.\n\nFictional metadata example [1].",
        interpretation_label: "source_facts", retrieval_strategy: "metadata", generation_used: false,
        evidence_sufficiency: "sufficient", generated_at: "2026-09-16T00:00:00Z",
        filters_applied: { country: "India", issue_date_from: "2025-01-01", issue_date_to: "2025-12-31" },
        citations: [{ chunk_id: "metadata-citation", warning_letter_id: thread, company_name: "Fictional date fixture",
          title: "Fictional metadata evidence", issue_date: "2025-01-01", posted_date: "2025-02-03",
          source_anchor: "fixture", excerpt: "Issue date: 2025-01-01\nFDA posting date: 2025-02-03",
          source_url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/fixture",
        }],
      };
      savedThread.messages = [
        { id: "metadata-q", role: "user", sequence: 1, status: "completed", content: requests[0].question, created_at: savedThread.created_at },
        { id: "metadata-a", role: "assistant", sequence: 2, status: "completed", content: data.answer, citations: data.citations, route_metadata: data, model_metadata: { generation_used: false }, created_at: savedThread.created_at },
      ];
      await page.request.post("http://127.0.0.1:8100/__fixtures/chat", { data: savedThread });
      await route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "complete", data }) + "\n" });
    });
    await page.goto(`/chat/${thread}`);
    const question = page.locator("#ai-question");
    await question.fill("How many FDA warning letters were issued in 2025?");
    await page.getByRole("button", { name: locale === "en" ? "Search & answer options" : "검색·답변 설정", exact: true }).click();
    await page.getByRole("button", { name: locale === "en" ? "Filters" : "필터", exact: true }).click();
    await page.getByLabel(locale === "en" ? "Recipient country" : "수신인 국가", { exact: true }).fill("India");
    await page.getByLabel(locale === "en" ? "Issue date from" : "발행 시작일", { exact: true }).fill("2025-01-01");
    await page.getByLabel(locale === "en" ? "Issue date to" : "발행 종료일", { exact: true }).fill("2025-12-31");
    await page.getByRole("button", { name: locale === "en" ? "Close filters" : "필터 닫기", exact: true }).click();
    await expect(question).toBeFocused();
    await question.press("Shift+Enter");
    expect(requests).toHaveLength(0);
    await question.press("Enter");
    await expect(page.locator(".chat-turn").last()).toContainText("2 saved FDA Drug warning letters");
    expect(requests).toHaveLength(1);
    expect(requests[0].filters).toMatchObject({ country: "India", dateFrom: "2025-01-01", dateTo: "2025-12-31" });
    await expect(page.locator(".chat-turn__filter-summary").last()).toContainText("2025-01-01");
    await expect(page.locator(".chat-turn__filter-summary").last()).toContainText("India");
    const source = page.locator(".chat-source-strip__open").last();
    await source.click();
    const panel = page.locator(".chat-evidence-panel");
    await expect(page.locator("#evidence-panel-title")).toBeFocused();
    await expect(panel.locator("dl").first()).toContainText("2025-01-01");
    await expect(panel.locator("dl").first()).toContainText("2025-02-03");
    await expect(panel).toContainText(locale === "en" ? "Saved letter metadata" : "저장된 서한 메타데이터");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`metadata-${locale}-${width}.png`), fullPage: true });
    }
    await page.locator("#evidence-panel-title").press("Escape");
    await expect(source).toBeFocused();
    await question.fill("Keep my next question editable");
    await expect(question).toBeEnabled();
  });
}

test("typing during the first answer's route handoff preserves the next draft", async ({ page, context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  await retainFixtureSession(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let navigating!: () => void;
  const departure = new Promise<void>(resolve => { navigating = resolve; });
  let requests = 0;
  await page.route("**/chat/**", async route => { navigating(); await gate; await route.continue(); });
  await page.route("**/api/chat/query", async route => {
    requests++;
    const input = route.request().postDataJSON();
    const id = input.options.threadId;
    const stamp = "2026-09-16T00:00:00Z";
    const result = { thread_id: id, answer: "Fictional metadata count: zero.", retrieval_strategy: "metadata", evidence_sufficiency: "sufficient", generated_at: stamp, citations: [] };
    await page.request.post("http://127.0.0.1:8100/__fixtures/chat", { data: {
      id, title: "New metadata conversation", created_at: stamp, updated_at: stamp, active_letter_ids: [],
      messages: [
        { id: "handoff-q", role: "user", sequence: 1, status: "completed", content: input.question, created_at: stamp },
        { id: "handoff-a", role: "assistant", sequence: 2, status: "completed", content: result.answer, route_metadata: result, created_at: stamp },
      ],
    } });
    await route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "complete", data: result }) + "\n" });
  });
  try {
    await page.goto("/ask");
    await page.locator("#ai-question").fill("How many FDA warning letters were issued in 2099?");
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await departure;
    await page.locator("#ai-question").fill("And what about 2025? Keep this draft.");
    await page.locator("#ai-question").press("Enter");
    expect(requests).toBe(1);
    release();
    await expect(page).toHaveURL(/\/chat\//);
    await expect(page.locator("#ai-question")).toHaveValue("And what about 2025? Keep this draft.");
    await expect(page.locator("#ai-question")).toBeFocused();
    await expect(page.getByRole("button", { name: "Ask AI", exact: true })).toBeEnabled();
    await expect(page.locator(".chat-turn")).toHaveCount(1);
  } finally { release(); }
});
