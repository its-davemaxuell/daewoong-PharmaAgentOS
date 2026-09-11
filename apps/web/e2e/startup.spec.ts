import { expect, test, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";

async function fixture(page: Page) {
  await page.context().addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  // Production uses a Secure __Host cookie. WebKit correctly refuses that cookie
  // on this HTTP-only loopback server, so inject a valid fixture session header.
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(`anonymous:${randomUUID()}`).setIssuer("pharmaagent-os-browser").setAudience("pharmaagent-os-browser").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("fixture-only-not-for-production-".repeat(2)));
  await page.route("http://127.0.0.1:3100/**", async route => {
    const request = route.request();
    // route.continue cannot override the browser's Cookie header. Use the API
    // transport for document/data/action requests; leave speculative RSC streams
    // in the browser so prefetching retains its normal streaming behavior.
    if (request.resourceType() !== "document" && request.method() !== "POST" && !new URL(request.url()).pathname.startsWith("/api/")) return route.continue();
    const headers = route.request().headers();
    const cookies = (headers.cookie || "").split(";").filter(value => value.trim() && !value.trim().startsWith("__Host-pharma-visitor="));
    cookies.push(`__Host-pharma-visitor=${token}`);
    const response = await route.fetch({ headers: { ...headers, cookie: cookies.join("; ") } });
    return route.fulfill({ response });
  });
  await page.route("**/api/workspace/workspace/inbox?**", route => route.fulfill({ json: { items: [], counts: {}, has_more: false, page: 1, starts_at: "2026-08-12T00:00:00Z" } }));
}
async function entered(page: Page) { await expect(page.locator("[data-startup-gate]")).toHaveAttribute("data-state", "entered", { timeout: 25_000 }); }

test("cold startup prepares menus, fades in, and does not replay on internal navigation", async ({ page }, info) => {
  await fixture(page);
  const reads: string[] = [], writes: string[] = [], errors: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/")) { reads.push(request.url()); if (request.method() !== "GET") writes.push(request.url()); } });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/portal/menus/evaluations?**", async route => { await new Promise(resolve => setTimeout(resolve, 1400)); await route.continue(); });
  await page.goto("/dashboard");
  await expect(page.locator("[data-startup-overlay]")).toBeVisible();
  await expect(page.locator("main").locator('xpath=ancestor::*[@inert]').first()).toHaveAttribute("inert", "");
  await page.keyboard.press("Control+k");
  await expect(page.locator(".workspace-command")).not.toBeVisible();
  const positions = await page.locator('[data-startup-overlay] [aria-hidden="true"]').evaluate(node => {
    const animation = node.getAnimations()[0];
    animation.pause();
    const frames = Array.from({ length: 24 }, (_, index) => {
      animation.currentTime = (index + 0.5) * 2000 / 24;
      return getComputedStyle(node).backgroundPosition;
    });
    animation.play(); return frames;
  });
  expect(new Set(positions).size).toBe(24);
  await page.screenshot({ path: info.outputPath("startup-folders.png") });
  await entered(page);
  expect(reads.some(url => url.includes("menus/control-tower"))).toBe(true);
  expect(reads.some(url => url.includes("menus/admin") || url.includes("menus/review"))).toBe(false);
  expect(reads.filter(url => url.includes("workspace/inbox")).every(url => url.includes("preview=true"))).toBe(true);
  expect(writes).toEqual([]);
  const timings: Record<string, number> = {};
  for (const href of ["/drug-letters", "/saved-work", "/research", "/inbox", "/ask", "/trends", "/requests", "/agents", "/cases", "/approvals", "/evaluations", "/settings", "/help", "/control-tower", "/drug-letters"]) {
    const link = page.locator(`.portal-sidebar a[href="${href}"]`).first();
    if (!await link.isVisible()) await link.locator("xpath=ancestor::details/summary").click();
    const started = Date.now();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href.replaceAll("-", "\\-")}(\\?|$)`));
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator('main [data-startup-pending="true"]')).toHaveCount(0);
    timings[href] = Date.now() - started;
    await expect(page.locator("[data-startup-overlay]")).toHaveCount(0);
  }
  await info.attach("prepared-menu-timings", { body: JSON.stringify(timings, null, 2), contentType: "application/json" });
  expect(reads.filter(url => new URL(url).pathname === "/api/drug-letters")).toHaveLength(1);
  // Exercise a real Server Action after all menu modules have loaded. Shared
  // form state must never be registered as an exported server function.
  const bookmark = page.locator(".letter-bookmark-button").first();
  const action = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/drug-letters");
  await bookmark.click();
  expect((await action).ok()).toBe(true);
  await expect(bookmark).toBeEnabled();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert").filter({ hasText: "Save failed" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("startup supplies a readable fallback when scripts are disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/dashboard");
  await expect(page.locator("#workspace-noscript p")).toContainText("Enable JavaScript");
  await expect(page.locator("#workspace-noscript p")).toBeVisible();
  await expect(page.locator("[data-startup-overlay]")).not.toBeVisible();
  await context.close();
});

test("failed preparation names the unfinished menu and Retry recovers", async ({ page }) => {
  await fixture(page);
  let fail = true;
  await page.route("**/api/portal/menus/trends?**", route => fail ? route.fulfill({ status: 503, json: { detail: "Unavailable" } }) : route.continue());
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Some menus need more time" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-startup-overlay]")).toContainText("Regulatory trends");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await entered(page);
});

test("a stalled service offers Continue after the deadline and preserves a direct link", async ({ page }) => {
  await fixture(page);
  await page.route("**/api/portal/menus/trends?**", async route => { await new Promise(resolve => setTimeout(resolve, 20_000)); await route.fulfill({ status: 503, json: {} }).catch(() => {}); });
  await page.goto("/drug-letters?q=validation");
  await expect(page.getByRole("button", { name: "Continue with available menus" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue with available menus" }).click();
  await entered(page);
  await expect(page).toHaveURL(/drug-letters\?q=validation/);
  await expect(page.locator(".letter-row")).toHaveCount(20);
});

test("Korean mobile startup respects reduced motion and restarts on refresh", async ({ page }, info) => {
  await fixture(page);
  await page.context().addCookies([{ name: "dli_locale", value: "ko", url: "http://127.0.0.1:3100" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/portal/menus/trends?**", async route => { await new Promise(resolve => setTimeout(resolve, 1600)); await route.continue(); });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "워크스페이스를 준비하고 있습니다" })).toBeVisible();
  const sprite = page.locator('[data-startup-overlay] [aria-hidden="true"]');
  expect(await sprite.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await page.screenshot({ path: info.outputPath("startup-ko-mobile.png") });
  await entered(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload();
  await expect(page.locator("[data-startup-overlay]")).toBeVisible();
  await entered(page);
});
