import { expect, test } from "@playwright/test";

const source = {
  chunk_id: "44444444-4444-4444-8444-444444444444", letter_id: "11111111-1111-4111-8111-111111111111",
  company: "Fictional validation evidence / 가상 밸리데이션 근거", source_url: "https://www.fda.gov/inspections/fictional-example",
  anchor: "paragraph-1", version_id: "55555555-5555-4555-8555-555555555555", version: 1,
  source_hash: "a".repeat(64), chunk_hash: "b".repeat(64), posted_date: "2026-09-01",
  excerpt: "Fictional source passage for browser testing. No real regulatory finding is represented.",
};

test("explicit context survives failed requests and fits all reference widths", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/research/context?**", route => route.fulfill({ json: { items: [source] } }));
  await page.route("**/api/research", async route => {
    if (route.request().method() !== "POST") return route.continue();
    expect(route.request().postDataJSON().selected_chunk_ids).toEqual([source.chunk_id]);
    return route.fulfill({ status: 503, json: { error: "unavailable" } });
  });
  await page.goto("/research");
  const goal = page.locator("#research-goal").filter({ visible: true });
  await expect(goal).toBeVisible();
  await goal.fill("Prepare a validation evidence briefing for review.");
  const picker = page.locator("fieldset.research-context");
  await picker.locator("summary").click();
  await picker.locator("input").fill("validation");
  await picker.getByRole("button", { name: /^(Search|검색)$/ }).click();
  await picker.getByRole("button", { name: /Include passage|문단 포함/ }).click();
  await expect(picker.locator("ul li")).toHaveCount(1);
  await expect(picker.getByRole("button", { name: /^(Selected|선택됨)$/ })).toBeDisabled();
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `width ${width}`).toBe(true);
  }
  await page.getByRole("button", { name: /^(Start research|리서치 시작)$/ }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(goal).toHaveValue("Prepare a validation evidence briefing for review.");
  await expect(picker.locator("ul li")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("selected-context-mobile.png"), fullPage: true });
  await picker.getByRole("button", { name: /Remove Fictional|Fictional.*제외/ }).click();
  await expect(picker.locator("ul li")).toHaveCount(0);
  expect(errors).toEqual([]);
});
