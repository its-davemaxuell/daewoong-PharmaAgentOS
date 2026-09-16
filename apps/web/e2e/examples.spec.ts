import { test, expect } from "@playwright/test";

test("public examples filter, show real output and expose only curated downloads", async ({ page, context }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("daewoong-fda-locale", "en"));
  let mutations = 0;
  page.on("request", request => { if (request.method() === "POST" && /\/api\/(chat|research)/.test(request.url())) mutations++; });
  await page.goto("/examples");
  await expect(page.getByRole("heading", { name: "Explore real results." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("examples-gallery.png"), fullPage: true });
  await page.getByRole("button", { name: "Specialists", exact: true }).click();
  await page.getByRole("button", { name: /Matching internal documents/ }).click();
  await expect(page.getByRole("heading", { name: "Matching internal documents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quality-unit oversight, with citations" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search examples" }).fill("no such demonstration");
  await expect(page.getByRole("heading", { name: "No matching examples" })).toBeVisible();
  await page.getByRole("button", { name: "Show all examples" }).click();
  await page.getByRole("link", { name: "Open: Quality-unit oversight, with citations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The result", exact: true })).toBeVisible();
  await expect(page.getByText("Dabur India Limited", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: /^Evidence / }).click();
  const firstSource = page.locator("details").filter({ has: page.locator("blockquote") }).first();
  await firstSource.locator("summary").first().click();
  await expect(firstSource.locator("blockquote")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("example-detail.png"), fullPage: true });
  const download = page.getByRole("link", { name: "Download result JSON" });
  const response = await context.request.get((await download.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  const artifact = await response.json();
  expect(artifact.human_approved).toBe(false);
  expect(artifact.output.generationUsed).toBe(true);
  expect(mutations).toBe(0);
});

test("document findings open their exact evidence and unknown examples show not found", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("daewoong-fda-locale", "en"));
  await page.goto("/examples/document-findings");
  const reference = page.getByRole("link", { name: /^Source D/ }).first();
  const target = (await reference.getAttribute("href"))!;
  await reference.click();
  await expect(page.locator(target)).toHaveAttribute("open", "");
  await expect(page.locator(target).locator("blockquote")).toBeVisible();
  // Next.js streams the shared shell with 200 before notFound() resolves.
  await page.goto("/examples/nonexistent-example");
  await expect(page.getByRole("heading", { name: "This page or record could not be found." })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
  await expect(page.getByRole("link", { name: "Download result JSON" })).toHaveCount(0);
});

test("Korean mobile examples remain readable with reduced motion and truthful reference labels", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("daewoong-fda-locale", "ko"));
  await page.goto("/examples/review-package");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByText(/simulated|시뮬레이션/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("example-reference-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: /Copy result|결과 복사/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /copied|복사|Copy unavailable/ })).toBeVisible();
});
