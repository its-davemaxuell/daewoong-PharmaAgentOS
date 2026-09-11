import { expect, test, type Page } from "@playwright/test";
import { retainFixtureSession } from "./session-fixture";

const usage = { scope: "personal", since: "2026-08-13T00:00:00Z", as_of: "2026-09-12T00:00:00Z", conversations: 0, chat_requests: 0, research_runs: 0, research_model_calls: 0, research_tokens: 0 };
async function fixture(page: Page) {
  await page.context().addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  await retainFixtureSession(page);
  await page.route("**/api/workspace/workspace/inbox?**", route => route.fulfill({ json: { items: [], counts: {}, has_more: false, page: 1, starts_at: "2026-08-12T00:00:00Z" } }));
  await page.route("**/api/usage", route => route.fulfill({ json: usage }));
}

test("all menus prepare before revealing the site and navigation does not replay startup", async ({ page }) => {
  await fixture(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/usage", async route => { await held; await route.fulfill({ json: usage }); });
  try {
    await page.goto("/dashboard");
    await expect(page.locator("[data-startup-overlay]")).toBeVisible();
    await expect(page.locator("[data-startup-gate] > [inert]").filter({ has: page.locator("main") })).toHaveAttribute("aria-hidden", "true");
    await page.keyboard.press("Control+k");
    await expect(page.locator(".workspace-command")).not.toBeVisible();
  } finally { release(); }
  await expect(page.locator("[data-startup-gate]")).toHaveAttribute("data-state", "entered", { timeout: 40000 });
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await page.locator('.continuity-sidebar a[href="/usage"]').click();
  await expect(page.getByRole("row", { name: "Research tokens 0", exact: true })).toBeVisible();
  await expect(page.locator("[data-startup-overlay]")).toHaveCount(0);
});

test("a failed menu can be retried without resetting ready menus", async ({ page }) => {
  await fixture(page);
  let failed = true;
  await page.route("**/api/usage", route => route.fulfill(failed ? { status: 502, json: {} } : { json: usage }));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Some menus need more time" })).toBeVisible({ timeout: 40000 });
  await expect(page.locator("[data-startup-overlay]")).toContainText("Usage");
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("[data-startup-gate]")).toHaveAttribute("data-state", "entered", { timeout: 40000 });
});

test("available menus remain accessible when a service cannot be prepared", async ({ page }) => {
  await fixture(page);
  await page.route("**/api/usage", route => route.fulfill({ status: 502, json: {} }));
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Continue with available menus", exact: true }).click({ timeout: 40000 });
  await expect(page.locator("[data-startup-gate]")).toHaveAttribute("data-state", "entered");
  await expect(page.locator('.continuity-sidebar a[href="/research"]')).toBeVisible();
});

test("mobile reduced motion keeps preparation and reveals a usable menu", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ask");
  await expect(page.locator("[data-startup-gate]")).toHaveAttribute("data-state", "entered", { timeout: 40000 });
  await expect(page.getByRole("heading", { name: "RAG Chat", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.locator("dialog.continuity-mobile-nav:modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
