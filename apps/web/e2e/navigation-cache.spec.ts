import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("primary menus preload their routes and remain navigable with keyboard intent", async ({ page }) => {
  const paths = ["/drug-letters", "/saved-work", "/research", "/inbox"];
  const preloads = paths.map(path => page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === path && url.searchParams.has("_rsc") && response.ok();
  }));
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  // Focus works for keyboard users too, and waits for full route preloading.
  for (const path of paths) {
    await page.locator(`.portal-sidebar__nav a[href="${path}"]`).first().focus();
    await page.waitForLoadState("networkidle");
  }
  // Next can leave a speculative RSC stream open until activation. Require its
  // successful response, rather than waiting for end-of-stream or claiming
  // offline routing support.
  await Promise.all(preloads);
  for (const path of paths) {
    await page.locator(`.portal-sidebar__nav a[href="${path}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (path === "/drug-letters") await expect(page.locator(".letter-row")).toHaveCount(20);
    else await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("Sources opens from the preloaded page without waiting for bookmark status", async ({ page }) => {
  let sourceRequests = 0;
  let inboxReads = 0;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/drug-letters" && url.searchParams.get("pageSize") === "20") sourceRequests++;
    if (new URL(request.url()).pathname === "/api/workspace/workspace/inbox") inboxReads++;
  });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/workspace/saved-views?*", async route => { await held; await route.continue(); });
  const sourceResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/drug-letters" && url.searchParams.get("pageSize") === "20";
  });
  await page.goto("/dashboard");
  const sources = page.locator('.portal-sidebar__nav a[href="/drug-letters"]').first();
  await sources.focus();
  await expect.poll(() => sourceRequests).toBe(1);
  await sourceResponse;
  await sources.click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(page.locator(".letter-bookmark-button").first()).toBeDisabled();
  expect(inboxReads).toBe(0);
  release();
  await expect(page.locator(".letter-bookmark-button").first()).toBeEnabled();
  await page.locator('.portal-sidebar__nav a[href="/research"]').first().click();
  await expect(page.locator(".research-run-list")).toBeVisible();
  await page.locator('.portal-sidebar__nav a[href="/drug-letters"]').first().click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  expect(sourceRequests).toBe(1);
});

test("stale Sources stay visible when background refresh fails", async ({ page }) => {
  await page.goto("/drug-letters");
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await page.waitForLoadState("networkidle");
  await page.locator('.portal-sidebar__nav a[href="/research"]').first().click();
  await expect(page.locator(".research-run-list")).toBeVisible();
  await page.clock.setFixedTime(new Date(Date.now() + 61_000));
  await page.route("**/api/drug-letters?*", route => route.fulfill({ status: 502, json: { error: "unavailable" } }));
  await page.locator('.portal-sidebar__nav a[href="/drug-letters"]').first().click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(page.locator(".letter-row")).toHaveCount(20);
});

test("a failed first source load is recoverable without leaving the menu", async ({ page }) => {
  let fail = true;
  await page.route("**/api/drug-letters?*", route => fail ? route.fulfill({ status: 502, json: { error: "unavailable" } }) : route.continue());
  await page.goto("/drug-letters");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  expect(await page.locator(".letter-row").count()).toBe(0);
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
});

test("cached filtered pages survive leaving Sources and browser Back", async ({ page }) => {
  let requests = 0;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/drug-letters" && url.searchParams.get("page") === "2") requests++;
  });
  await page.goto("/drug-letters?page=2");
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(page.locator(".letter-row__titleline").first()).toContainText("Fictional Pharma 21");
  await page.waitForLoadState("networkidle");
  const before = requests;
  await page.locator('.portal-sidebar__nav a[href="/saved-work"]').first().click();
  await expect(page.getByRole("heading", { name: "Saved work", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator(".letter-row__titleline").first()).toContainText("Fictional Pharma 21");
  expect(requests).toBe(before);
});

test("removing a saved source refreshes its cached bookmark status", async ({ page }) => {
  const id = "11111111-1111-4111-8111-111111111111";
  const view = { id, name: `Drug letter bookmark:${id}`, description: "Fictional Pharma 1", view_kind: "source_bookmark", source_id: id, open_url: `/drug-letters/${id}` };
  let saved = true;
  await page.route("**/api/workspace/saved-views**", route => {
    if (route.request().method() === "DELETE") { saved = false; return route.fulfill({ status: 204 }); }
    return route.fulfill({ json: { items: saved ? [view] : [], has_more: false } });
  });
  await page.goto("/drug-letters");
  await expect(page.locator(".letter-bookmark-button").first()).toHaveAttribute("aria-pressed", "true");
  await page.locator('.portal-sidebar__nav a[href="/saved-work"]').first().click();
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No saved items on this page.", { exact: false })).toBeVisible();
  await page.locator('.portal-sidebar__nav a[href="/drug-letters"]').first().click();
  await expect(page.locator(".letter-bookmark-button").first()).toHaveAttribute("aria-pressed", "false");
});

test("Saved work retains its cached list when refresh fails", async ({ page }) => {
  const brief = { id: "brief-1", title: "Retained test brief", run_id: "run-1", content_hash: "a".repeat(64), run_revision: 1, created_at: "2026-09-01T00:00:00Z" };
  let fail = false;
  await page.route("**/api/workspace/research/briefs?*", route => fail ? route.fulfill({ status: 502, json: { error: "unavailable" } }) : route.fulfill({ json: { items: [brief], has_more: false } }));
  await page.goto("/saved-work");
  await expect(page.getByText(brief.title, { exact: true })).toBeVisible();
  await page.locator('.portal-sidebar__nav a[href="/research"]').first().click();
  await expect(page.locator(".research-run-list")).toBeVisible();
  fail = true;
  await page.clock.setFixedTime(new Date(Date.now() + 31_000));
  await page.locator('.portal-sidebar__nav a[href="/saved-work"]').first().click();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.getByText(brief.title, { exact: true })).toBeVisible();
});
