import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("daily navigation separates personal work and governed review", async ({ page }) => {
  await page.goto("/dashboard");
  const sidebar = page.locator(".continuity-sidebar");
  for (const name of ["Research", "Inbox", "Saved work", "FDA sources"]) {
    await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(sidebar.getByRole("link", { name: "Source review", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Operations", exact: true })).toHaveCount(0);
  await sidebar.getByRole("link", { name: "Inbox", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();
  await expect(page.getByText("Organize new source updates. Inbox actions do not approve evidence.")).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.locator(".workspace-command").getByRole("button", { name: "FDA sources", exact: true })).toBeVisible();
  await expect(page.locator(".workspace-command").getByRole("button", { name: "Admin", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("home examples prepare a question without starting research", async ({ page }) => {
  let starts = 0;
  await page.route("**/api/research?**", route => route.fulfill({ json: { items: [], has_more: false } }));
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/research")) starts++; });
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "What do FDA letters say about cleaning validation?", exact: true }).click();
  await expect(page.locator("#research-goal")).toHaveValue("What do FDA letters say about cleaning validation?");
  expect(starts).toBe(0);
});

test("home keeps active work visible while a source request fails", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/research?**", route => route.fulfill({ json: { items: [{ id: "fictional-active", objective: "Fictional ongoing research for layout testing", status: "running", updated_at: "2026-09-11T00:00:00Z" }], has_more: false } }));
  await page.route("**/api/drug-letters?**", route => route.fulfill({ status: 503, json: { error: "Fictional unavailable source service" } }));
  await page.goto("/dashboard");
  const active = page.getByRole("link", { name: /Fictional ongoing research/ });
  await expect(active).toBeVisible();
  expect((await active.boundingBox())!.y).toBeLessThan(500);
  await expect(active).toHaveAttribute("href", "/research?run=fictional-active");
  await expect(active).toContainText("Working");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("mobile research gives the question priority and keeps history accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/research");
  await expect(page.locator("#research-goal")).toBeEnabled();
  expect((await page.locator("#research-goal").boundingBox())!.y).toBeLessThan(450);
  await expect(page.locator(".research-history-body")).toBeHidden();
  await page.getByRole("button", { name: "Show history", exact: true }).click();
  await expect(page.locator(".research-history-body")).toBeVisible();
  await page.getByRole("button", { name: "Hide history", exact: true }).click();
  await expect(page.locator(".research-history-body")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".research-history-body")).toBeVisible();
});

for (const locale of ["en", "ko"]) {
  test(`working surfaces remain readable at four widths in ${locale}`, async ({ page, context }, info) => {
    test.setTimeout(180_000);
    await context.addCookies([{ name: "dli_locale", value: locale, url: "http://127.0.0.1:3100" }]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["dashboard", "research", "drug-letters", "inbox", "saved-work", "cases", "trends", "settings", "help", "approvals"]) {
        await page.goto(`/${route}`);
        await expect(page.locator("main h1").first()).toBeVisible();
        await page.locator(".continuity-topbar-actions button[title]").waitFor();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`).toBe(true);
        // Sources replaces its loading heading after hydration. Resolve the visible
        // heading on each retry instead of measuring a detached loading node.
        await expect(page.locator("main h1").filter({ visible: true }).first(), `${route} title at ${width}`).toHaveCSS("font-size", "22px");
        if ((width === 1440 || width === 390) && ["dashboard", "research", "cases"].includes(route)) {
          await page.screenshot({ path: info.outputPath(`${route}-${locale}-${width}.png`), fullPage: true });
        }
      }
    }
  });
}
