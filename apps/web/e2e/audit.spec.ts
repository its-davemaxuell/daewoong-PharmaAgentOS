import { test, expect } from "@playwright/test";

const threadId = "11111111-1111-4111-8111-111111111111";
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("bounded library, one-option filter, history, stale search and failure recovery", async ({ page }) => {
  await page.goto("/drug-letters");
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await page.getByRole("button", { name: /Filters/ }).click();
  const documents = page.getByLabel("Linked documents");
  await expect(documents).toBeEnabled();
  await documents.selectOption("response");
  await expect(page.locator(".letter-row")).toHaveCount(1);
  await documents.selectOption("");
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await page.goBack();
  await expect(documents).toHaveValue("response");
  await expect(page.locator(".letter-row")).toHaveCount(1);
  await expect(page.locator(".letter-row [tabindex='0']")).toHaveCount(0);
  const search = page.getByLabel('Search archive', { exact: true });
  await search.fill("slow");
  await page.waitForTimeout(350);
  await search.fill("no-match");
  await expect(page.locator(".letter-row")).toHaveCount(0);
  await page.waitForTimeout(900);
  await expect(page.locator(".letter-row")).toHaveCount(0);
  await search.fill("failure");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await expect(search).toHaveValue("failure");
});

test("unknown evidence, unavailable provenance and reader focus restoration", async ({ page }) => {
  await page.goto(`/chat/${threadId}`);
  // Next may briefly retain an outgoing streamed tree hidden in the DOM.
  await expect(page.getByText(/Evidence coverage: Not assessed/).filter({ visible: true })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Sources (1)", exact: true });
  await trigger.click();
  await expect(page.getByRole("heading", { name: "Read the source" })).toBeFocused();
  await expect(page.getByText("Version metadata unavailable")).toBeVisible();
  await expect(page.getByText("Source link unavailable")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("approval locale, empty, restricted and malformed response states", async ({ page, context }) => {
  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Review requests", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open review", exact: true })).toBeVisible();
  await context.addCookies([{ name: "dli_locale", value: "ko", url: "http://127.0.0.1:3100" }]);
  await page.evaluate(() => localStorage.setItem("daewoong-fda-locale", "ko"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "검토 요청", exact: true })).toBeVisible();
  await page.goto("/approvals?status=EXPIRED");
  await expect(page.getByRole("heading", { name: "이 조건에 맞는 요청이 없습니다" })).toBeVisible();
  await page.goto("/approvals?status=REJECTED");
  await expect(page.getByRole("heading", { name: "검토 담당자의 권한이 필요한 단계입니다" })).toBeVisible();
  await page.goto("/approvals?status=APPROVED");
  await expect(page.getByText(/서비스가 불완전한 검토 데이터를 반환했습니다/).filter({ visible: true })).toBeVisible();
});

test("Home prepares a research objective without starting a job", async ({ page }) => {
  const created: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/research")) created.push(request.url()); });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Prepare research", exact: true })).toBeDisabled();
  const objective = "Compare cleaning-validation findings and prepare questions for our quality team.";
  await page.getByLabel("Your research question", { exact: true }).fill(objective);
  await page.getByRole("button", { name: "Prepare research", exact: true }).click();
  await expect(page).toHaveURL(/\/research$/);
  await expect(page.locator("#research-goal")).toHaveValue(objective);
  await expect(page.getByRole("button", { name: "Start research", exact: true })).toBeEnabled();
  expect(created).toEqual([]);
});

test("supporting workspaces and all source tabs retain readable geometry", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const openWorkspace = async (route: string) => {
    // Streamed case headings can appear before the shell hydrates. Network idle
    // alone can therefore precede its sidebar request on hosted WebKit. Wait for
    // that real request before inspecting or unloading the current workspace.
    const [sidebar] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar"),
      page.goto(route),
    ]);
    expect(sidebar.ok(), `sidebar on ${route}`).toBe(true);
    await sidebar.finished();
    await page.waitForLoadState("networkidle");
  };
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/saved-views", "/requests", "/agents", "/cases", "/evaluations", "/control-tower", "/settings", "/help", "/trends", `/drug-letters/${threadId}`]) {
      await openWorkspace(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} at ${width}`).toBe(true);
      if (width === 1440) {
        // Content must clear the fixed navigation, not merely avoid overflow.
        expect(await page.locator("main").evaluate(element => element.getBoundingClientRect().left)).toBeGreaterThanOrEqual(256);
      }
    }
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    if (width === 390) {
      const sourceIndex = page.locator(".original-index__mobile");
      await expect(sourceIndex).not.toHaveAttribute("open");
      await sourceIndex.locator("summary").click();
      await expect(sourceIndex.getByRole("link", { name: /Official FDA source/ })).toBeVisible();
      await sourceIndex.locator("summary").click();
    }
    for (let index = 0; index < 3; index++) {
      await tabs.nth(index).click();
      await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    for (const view of ["overview", "plan", "execution", "impact", "review", "integrations", "evidence", "history"]) {
      await openWorkspace(`/cases/${threadId}?view=${view}`);
      await expect(page.getByRole("heading", { name: "Fictional cleaning-validation review", exact: true }).filter({ visible: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `case ${view} at ${width}`).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test("navigation disclosure, mobile keyboard return and enlarged text remain usable", async ({ page }) => {
  await page.goto("/dashboard");
  const settings = page.locator(".portal-workspace-group").nth(2);
  await settings.locator("summary").first().click();
  await expect(settings).toHaveAttribute("open", "");
  await page.getByRole("link", { name: "Warning letter library", exact: true }).click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(settings).toHaveAttribute("open", "");
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: "Open navigation", exact: true });
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page.goto(`/chat/${threadId}`);
  const source = page.getByRole("button", { name: "Sources (1)", exact: true });
  await source.click();
  await expect(page.getByRole("heading", { name: "Read the source" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(source).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/approvals");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(page.getByRole("link", { name: "Open review", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("route matrix has no overflow, hydration failures or missing assets", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const metrics = [];
  for (const width of [320, 390, 768, 980, 981, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/dashboard", "/drug-letters", "/ask", "/research", "/approvals"]) {
      await page.goto(route);
      if (route === "/ask") {
        // This route redirects after the streamed shell. Network idle alone can
        // precede its client redirect, especially in WebKit on hosted runners.
        await expect(page).toHaveURL(/\/ask\?new=/);
        // Next can retain the previous streamed tree hidden during the swap.
        await expect(page.locator("#ai-question").filter({ visible: true })).toHaveCount(1);
      }
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} at ${width}`).toBe(true);
      metrics.push({ width, route, navigation: await page.evaluate(() => performance.getEntriesByType("navigation").map(item => item.toJSON())), resources: await page.evaluate(() => performance.getEntriesByType("resource").map(item => ({ name: item.name.split("/").pop(), bytes: (item as PerformanceResourceTiming).transferSize }))) });
    }
  }
  expect(errors).toEqual([]);
  await testInfo.attach("route-network-measurements", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
});
