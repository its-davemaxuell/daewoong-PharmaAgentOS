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
  await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open review", exact: true })).toBeVisible();
  // Complete the initial preference write before the fixture replaces cookie/storage.
  await expect(page.locator("html")).toHaveAttribute("data-locale", "en");
  await context.addCookies([{ name: "dli_locale", value: "ko", url: "http://127.0.0.1:3100" }]);
  await page.evaluate(() => localStorage.setItem("daewoong-fda-locale", "ko"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "승인", exact: true })).toBeVisible();
  await page.goto("/approvals?status=EXPIRED");
  await expect(page.getByRole("heading", { name: "이 조건에 맞는 요청이 없습니다" })).toBeVisible();
  await page.goto("/approvals?status=REJECTED");
  await expect(page.getByRole("heading", { name: "검토 담당자의 권한이 필요한 단계입니다" })).toBeVisible();
  await page.goto("/approvals?status=APPROVED");
  await expect(page.getByText(/서비스가 불완전한 검토 데이터를 반환했습니다/).filter({ visible: true })).toBeVisible();
});

test("Overview opens research without starting a job", async ({ page }) => {
 const created: string[] = [];
 page.on("request", request => { if(request.method()==="POST"&&request.url().endsWith("/api/research")) created.push(request.url()); });
 await page.goto("/dashboard");
 await page.getByRole("link",{name:"New research",exact:true}).click();
 await expect(page).toHaveURL(/\/research$/);
 await expect(page.locator("#research-goal")).toBeVisible();
 expect(created).toEqual([]);
});

test("supporting workspaces and all source tabs retain readable geometry", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  const casePrefetches: string[] = [];
  const context = page.context();
  const recordError = (error: Error) => errors.push(error.message);
  const observe = () => {
    const observedPage = page;
    observedPage.on("pageerror", recordError);
    observedPage.on("request", request => {
      if (observedPage.url().includes(`/cases/${threadId}`) && request.url().includes(`/cases/${threadId}`)
        && request.headers()["next-router-prefetch"] === "1") casePrefetches.push(request.url());
    });
  };
  observe();
  const openWorkspace = async (route: string) => {
    // Each geometry sample is an independent cold page. Stop observing only
    // when disposing that page: WebKit reports cancelled speculative streams
    // as access-control errors during document replacement. In-app navigation
    // is exercised separately by the motion and navigation-cache suites.
    if (page.url() !== "about:blank") {
      const viewport = page.viewportSize();
      page.removeListener("pageerror", recordError);
      await page.close();
      page = await context.newPage();
      if (viewport) await page.setViewportSize(viewport);
      observe();
    }
    // Streamed case headings can appear before the shell hydrates. Network idle
    // alone can therefore precede its sidebar request on hosted WebKit. Wait for
    // that real request before inspecting or unloading the current workspace.
    const [sidebar, sourceWarm] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar"),
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/drug-letters"),
      page.goto(route),
    ]);
    expect(sidebar.ok(), `sidebar on ${route}`).toBe(true);
    await sidebar.finished();
    // Finish the real idle data warmup before unloading this document. WebKit
    // reports a same-origin fetch aborted by navigation as an access-control error.
    await sourceWarm.finished();
    // Next can retain a speculative RSC stream until its link is activated.
    // Geometry depends on the rendered destination, not unrelated prefetches.
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator('main [data-startup-pending="true"]')).toHaveCount(0);
  };
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/saved-views", "/requests", "/agents", "/cases", "/evaluations", "/control-tower", "/settings", "/help", "/trends", `/drug-letters/${threadId}`]) {
      await openWorkspace(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} at ${width}`).toBe(true);
      if (width === 1440) {
        // Content must clear the fixed navigation, not merely avoid overflow.
        const sidebarRight = await page.locator(".continuity-sidebar").evaluate(element => element.getBoundingClientRect().right);
        expect(await page.locator("main").evaluate(element => element.getBoundingClientRect().left)).toBeGreaterThanOrEqual(sidebarRight);
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
    const impactTab = page.getByRole("navigation", { name: "Case workspace sections" }).getByRole("link", { name: /Impact/ });
    await impactTab.click();
    await expect(impactTab).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveURL(/view=impact$/);
  }
  expect(casePrefetches).toEqual([]);
  expect(errors).toEqual([]);
});

test("navigation disclosure, mobile keyboard return and enlarged text remain usable", async ({ page }) => {
  await page.goto("/dashboard");
  const settings = page.locator('.continuity-sidebar a[href="/settings"]');
  await expect(settings).toBeVisible();
  await page.locator('.continuity-sidebar a[href="/drug-letters"]').click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(settings).toBeVisible();
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

for (const width of [320, 390, 768, 980, 981, 1024, 1440]) {
  for (const route of ["/dashboard", "/drug-letters", "/ask", "/research", "/approvals"]) {
    test(`route matrix ${route} at ${width} has no overflow, hydration failures or missing assets`, async ({ page }, testInfo) => {
      // Each case owns a fresh page. Late Link prefetches from a previous
      // document must not be aborted by the next route's navigation or resize.
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.setViewportSize({ width, height: 900 });
      await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar" && response.ok()),
        page.goto(route),
      ]);
      if (route === "/ask") {
        await expect(page).toHaveURL(/\/ask\?new=/);
        await expect(page.locator("#ai-question").filter({ visible: true })).toHaveCount(1);
      }
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} at ${width}`).toBe(true);
      const metrics = { width, route, navigation: await page.evaluate(() => performance.getEntriesByType("navigation").map(item => item.toJSON())), resources: await page.evaluate(() => performance.getEntriesByType("resource").map(item => ({ name: item.name.split("/").pop(), bytes: (item as PerformanceResourceTiming).transferSize }))) };
      expect(errors).toEqual([]);
      await testInfo.attach("route-network-measurements", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
    });
  }
}
