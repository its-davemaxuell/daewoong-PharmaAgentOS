import { test, expect } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("primary products and supporting pages are directly reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ask/);
  await expect(page.getByRole("heading", { name: "RAG Chat", exact: true })).toBeVisible();
  const rail = page.locator(".continuity-sidebar");
  const destinations = rail.locator(".continuity-nav");
  await expect(destinations.nth(0)).toHaveText("RAG Chat");
  await expect(destinations.nth(1)).toHaveText("Research Agent");
  for (const href of ["/ask", "/research", "/dashboard", "/inbox", "/saved-work", "/requests", "/drug-letters", "/saved-views", "/trends", "/search", "/cases", "/approvals", "/agents", "/evaluations", "/usage", "/settings", "/help"]) {
    await expect(rail.locator(`.continuity-nav[href="${href}"]`)).toHaveCount(1);
  }
  await expect(rail.locator('a[href="/admin"]')).toHaveCount(0);
  await rail.getByRole("link", { name: "Research Agent", exact: true }).click();
  await expect(page.locator("#research-goal").filter({ visible: true })).toBeEnabled();
  await expect(rail.locator('[aria-current="page"]')).toHaveText("Research Agent");
});

test("find keeps the transcript intact and research handoff only prepares a draft", async ({ page }) => {
  let starts = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/research")) starts++; });
  await page.goto(`/chat/${id}`);
  await page.getByRole("button", { name: "Find in chat", exact: true }).click();
  const input = page.getByRole("searchbox", { name: "Find in this chat" });
  await input.fill("fictional");
  await expect(page.locator('[data-find-match="true"]')).toHaveCount(1);
  await expect(input).toBeFocused();
  await input.fill("no such phrase anywhere");
  await expect(page.getByRole("status").filter({ hasText: "No matches" })).toBeVisible();
  await expect(page.locator(".chat-turn")).toHaveCount(1);
  await input.press("Escape");
  await expect(page.getByRole("button", { name: "Find in chat", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy with sources", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Research this question", exact: true }).click();
  await expect(page.locator("#research-goal").filter({ visible: true })).toHaveValue("What does this fictional source establish?");
  expect(starts).toBe(0);
});

test("loading is animated, accessible and respects reduced motion", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/workspace/research/briefs?**", async route => { await gate; await route.fulfill({ json: { items: [], has_more: false } }); });
  try {
    await page.goto("/saved-work");
    const status = page.locator('.workspace-loading [role="status"]');
    await expect(status).toHaveText("Loading…");
    const spinner = status.locator('[aria-hidden="true"]');
    await expect.poll(() => spinner.evaluate(node => getComputedStyle(node).animationName)).not.toBe("none");
    await expect(status.locator(".sr-only")).toHaveCSS("position", "absolute");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(spinner).toHaveCSS("animation-name", "none");
  } finally { release(); }
  await expect(page.locator(".workspace-loading")).toHaveCount(0);
});

test("usage failure remains explicit and report export uses actual scoped data", async ({ page }) => {
  let available = false;
  await page.route("**/api/usage", route => route.fulfill(available ? { json: { scope: "personal", since: "2026-08-13T00:00:00Z", as_of: "2026-09-12T00:00:00Z", conversations: 3, chat_requests: 8, research_runs: 2, research_model_calls: 5, research_tokens: 321 } } : { status: 503, json: {} }));
  await page.goto("/usage");
  await expect(page.locator("main .workspace-feedback[role=alert]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
  available = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("row", { name: "Research tokens 321", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("pharmaagent-personal-usage.csv");
});
