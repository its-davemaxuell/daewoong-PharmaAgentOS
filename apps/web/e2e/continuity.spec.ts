import { test, expect } from "@playwright/test";
const id = "11111111-1111-4111-8111-111111111111";
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" },
  ]);
});
test("assistant retains separate case and general drafts across navigation and nested overlays", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/drug-letters/${id}`);
  await page.locator(".continuity-topbar-actions button[title]").click();
  const panel = page.locator(".continuity-assistant");
  const question = panel.getByRole("textbox", {
    name: "Your question",
    exact: true,
  });
  await expect(question).toBeEnabled();
  await expect(
    panel.getByLabel("Selected FDA letters", { exact: true }),
  ).toContainText("Fictional Pharma");
  await question.fill("Retained question about this case");
  await page.keyboard.press("Control+k");
  await expect(page.locator(".workspace-command")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await expect(question).toHaveValue("Retained question about this case");
  await panel
    .getByRole("button", { name: "Switch to general research", exact: true })
    .click();
  await expect(question).toHaveValue("");
  await question.fill("Separate general research question");
  await panel
    .getByLabel("Retained conversations", { exact: true })
    .selectOption(id);
  await expect(question).toHaveValue("Retained question about this case");
  await panel
    .getByRole("button", { name: "Close assistant", exact: true })
    .click();
  await page.locator('.continuity-sidebar a[href="/drug-letters"]').click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await page.keyboard.press("Control+j");
  await expect(question).toHaveValue("Retained question about this case");
  await expect(page).toHaveURL(/\/drug-letters$/);
  await panel
    .getByLabel("Retained conversations", { exact: true })
    .selectOption("");
  await expect(question).toHaveValue("Separate general research question");
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((n) => n.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
});
test("assistant resize changes modal behavior and restores its opening control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  const trigger = page.locator(".continuity-topbar-actions button[title]");
  await trigger.click();
  await expect(page.locator(".continuity-assistant[open]")).toBeVisible();
  await expect(page.locator(".continuity-assistant:modal")).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator(".continuity-assistant:modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator(".continuity-assistant")).not.toHaveAttribute(
    "open",
  );
});
test("comparison adds two preview records without navigating or losing the underlying list", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const rows = page.locator(".continuity-table tbody button");
  await rows.nth(0).click();
  await page
    .getByRole("button", { name: "Compare record", exact: true })
    .click();
  const compare = page.locator(".continuity-comparison");
  await expect(compare).toBeVisible();
  await expect(
    compare.getByRole("button", { name: "Remove record", exact: true }),
  ).toHaveCount(1);
  await compare
    .getByRole("button", { name: "Close comparison", exact: true })
    .click();
  await rows.nth(1).click();
  await page
    .getByRole("button", { name: "Compare record", exact: true })
    .click();
  await expect(
    compare.getByRole("button", { name: "Remove record", exact: true }),
  ).toHaveCount(2);
  await expect(
    compare.getByRole("link", { name: "Open original", exact: true }),
  ).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(rows).toHaveCount(9);
});
for (const locale of ["en", "ko"])
  test(`overview and assistant geometry in ${locale}`, async ({
    page,
    context,
  }, info) => {
    await context.addCookies([
      { name: "dli_locale", value: locale, url: "http://127.0.0.1:3100" },
    ]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [390, 1024, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      await expect(
        page.locator(".continuity-table tbody button").first(),
      ).toBeVisible();
      await page.locator(".continuity-topbar-actions button[title]").click();
      const panel = page.locator(".continuity-assistant");
      await expect(panel.locator("textarea")).toBeEnabled();
      expect(
        await panel.evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: info.outputPath(`assistant-${locale}-${width}.png`),
        });
      await page.keyboard.press("Escape");
    }
  });

test("evidence and assistant share the context region without overlapping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await page.locator(".continuity-table tbody button").first().click();
  await expect(page.locator(".workspace-inspector[open]")).toBeVisible();
  await page.keyboard.press("Control+j");
  await expect(page.locator(".continuity-assistant[open]")).toBeVisible();
  await expect(page.locator(".workspace-inspector")).toHaveCount(0);
  await page.locator(".continuity-table tbody button").first().click();
  await expect(page.locator(".workspace-inspector[open]")).toBeVisible();
  await expect(page.locator(".continuity-assistant")).not.toHaveAttribute(
    "open",
  );
});
