import { test, expect } from "@playwright/test";

test("Streamline icons render locally and the license credit follows the interface language", async ({ page, context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  const externalAssets: string[] = [];
  const errors: string[] = [];
  page.on("request", request => {
    if (/streamlinehq\.com/.test(request.url())) externalAssets.push(request.url());
  });
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/dashboard", "/drug-letters", "/research", "/help"]) {
    await page.goto(route);
    // Let the shell's account-scoped sidebar request settle before replacing the
    // document; WebKit reports an interrupted cross-document fetch as a page error.
    await page.waitForLoadState("networkidle");
    const icons = page.locator("svg[data-streamline-icon]:visible");
    await expect(icons.first()).toBeVisible();
    expect(await icons.count()).toBeGreaterThan(5);
    expect(await page.locator("svg.lucide").count()).toBe(0);
    const navigationIcon = page.locator(".portal-nav__icon").first();
    await expect(navigationIcon).toHaveAttribute("aria-hidden", "true");
    expect(await navigationIcon.evaluate(node => parseFloat(getComputedStyle(node).strokeWidth))).toBeGreaterThan(0);
  }
  await expect(page.getByRole("heading", { name: "Icon credits" })).toBeVisible();
  await expect(page.locator("#credits").getByRole("link", { name: "Streamline", exact: true })).toHaveAttribute("href", "https://www.streamlinehq.com/");
  await expect(page.locator("#credits").getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  await page.getByRole("button", { name: "Switch interface to 한국어", exact: true }).click();
  await expect(page.getByRole("heading", { name: "아이콘 출처" })).toBeVisible();
  expect(externalAssets).toEqual([]);
  expect(errors).toEqual([]);
});
