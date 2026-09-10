import { test, expect } from "@playwright/test";

test("global command shortcut opens one dialog and uses the visible conversation action", async ({ page, context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  // The shell's real client request confirms hydration before exercising a global key listener.
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar"),
    page.goto("/chat/11111111-1111-4111-8111-111111111111"),
  ]);
  await page.locator("main").focus();
  await page.keyboard.press("Control+k");
  const command = page.locator(".workspace-command");
  await expect(command).toHaveAttribute("open");
  await expect(page.locator(".chat-library")).not.toHaveAttribute("open");
  await command.getByRole("button", { name: "Search conversations", exact: true }).click();
  await expect(command).not.toHaveAttribute("open");
  await expect(page.getByLabel("Search conversation titles and messages")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Conversations", exact: true })).toBeFocused();
});
