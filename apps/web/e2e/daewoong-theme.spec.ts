import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

async function sampleSwitch(page: Page, selector: string, region = "#main-content") {
  return page.evaluate(async ({ selector, region }) => {
    const node = document.querySelector<HTMLElement>(region)!;
    const samples: { opacity: number; path: string; text: string; animations: string[] }[] = [];
    const targets = [...document.querySelectorAll<HTMLElement>(selector)];
    targets.find(target => target.checkVisibility())!.click();
    const start = performance.now();
    while (performance.now() - start < 600) {
      samples.push({ opacity: Number(getComputedStyle(node).opacity), path: location.pathname,
        text: node.textContent || "", animations: node.getAnimations().map(animation => animation.id) });
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return samples;
  }, { selector, region });
}

test("menu navigation fades the previous contents before showing the destination", async ({ page }, info) => {
  await page.goto("/ask");
  await expect(page.locator("#ai-question")).toBeEnabled();
  await page.locator('.continuity-sidebar a[href="/agents"]').hover();
  const frames = await sampleSwitch(page, '.continuity-sidebar a[href="/agents"]');
  await info.attach("menu-fade-frames", { body: JSON.stringify(frames), contentType: "application/json" });
  expect(frames.some(frame => frame.path === "/ask" && frame.opacity < .8 && frame.text.includes("A question."))).toBe(true);
  expect(frames.some(frame => frame.path === "/agents" && frame.opacity < .9 && frame.animations.includes("workspace-transition"))).toBe(true);
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("heading", { name: "Specialists, in action." })).toBeVisible();
});

test("local result tabs have both fade legs and keep evidence usable", async ({ page }, info) => {
  await page.goto("/examples/document-translation");
  const evidence = page.getByRole("button", { name: /^Evidence / });
  await evidence.click();
  await expect(evidence).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Result", exact: true }).click();
  await expect(page.getByRole("button", { name: "Result", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#example-result-view")).toBeVisible();
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
  const frames = await sampleSwitch(page, '[aria-controls="example-evidence-view"]');
  await info.attach("local-tab-fade-frames", { body: JSON.stringify(frames), contentType: "application/json" });
  expect(frames.some(frame => frame.animations.includes("view-departure") && frame.opacity < .8)).toBe(true);
  expect(frames.some(frame => frame.animations.includes("context-arrival") && frame.opacity < .9)).toBe(true);
  await expect(page.locator("#example-evidence-view")).toBeVisible();
  await expect(page.locator("#example-result-view")).toBeHidden();
  await page.getByRole("searchbox", { name: "Find in evidence" }).fill("aseptic");
  await page.getByRole("button", { name: "Result", exact: true }).click();
  await expect(page.getByRole("button", { name: "Result", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[aria-controls="example-evidence-view"]')!.click();
    document.querySelector<HTMLButtonElement>('[aria-controls="example-result-view"]')!.click();
  });
  await page.waitForTimeout(280);
  await expect(page.locator("#example-result-view")).toBeVisible();
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
});

test("rapid selections resolve to the final target and reduced motion settles mid-exit", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.locator("#ai-question")).toBeEnabled();
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('.continuity-sidebar a[href="/agents"]')!.click();
    document.querySelector<HTMLAnchorElement>('.continuity-sidebar a[href="/examples"]')!.click();
  });
  await expect(page).toHaveURL(/\/examples$/);
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('.continuity-sidebar a[href="/agents"]')!.click();
    document.querySelector<HTMLAnchorElement>('.continuity-sidebar a[href="/examples"]')!.click();
  });
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/examples$/);
  await page.locator('.continuity-sidebar a[href="/agents"]').evaluate(node => (node as HTMLElement).click());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page).toHaveURL(/\/agents$/);
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
  expect(await page.locator("#main-content").evaluate(node => node.getAnimations().length)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/examples$/);
});

test("query tabs retain keyboard semantics through interrupted exits", async ({ page }) => {
  await page.goto("/drug-letters/11111111-1111-4111-8111-111111111111");
  const tabs = page.getByRole("tab");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).click();
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => {
    const tabs = document.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[1].click(); tabs[2].click(); tabs[0].click();
  });
  await page.waitForTimeout(300);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#main-content")).toHaveCSS("opacity", "1");
});

test("the brand palette keeps labels, placeholders and input boundaries legible", async ({ page }, info) => {
  await page.goto("/ask");
  await page.locator("#ai-question").fill("Check the brand contrast");
  const ratios = await page.evaluate(() => {
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const light = (color: string) => rgb(color).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const contrast = (a: string, b: string) => (Math.max(light(a), light(b)) + .05) / (Math.min(light(a), light(b)) + .05);
    const style = (selector: string, pseudo?: string) => getComputedStyle(document.querySelector(selector)!, pseudo);
    const canvas = style("body").backgroundColor;
    const send = style(".chat-send-button");
    return { action: contrast(send.color, send.backgroundColor), muted: contrast(style(".chat-welcome p").color, canvas), placeholder: contrast(style("#ai-question", "::placeholder").color, canvas), boundary: contrast(style(".chat-composer").borderTopColor, canvas) };
  });
  expect(ratios.action).toBeGreaterThanOrEqual(4.5);
  expect(ratios.muted).toBeGreaterThanOrEqual(4.5);
  expect(ratios.placeholder).toBeGreaterThanOrEqual(4.5);
  expect(ratios.boundary).toBeGreaterThanOrEqual(3);
  await info.attach("computed-contrast", { body: JSON.stringify(ratios), contentType: "application/json" });
});

for (const [width, locale] of [[1440, "en"], [768, "en"], [390, "ko"], [320, "ko"]] as const) {
  test(`Daewoong theme and quiet text entry at ${width}px ${locale}`, async ({ page, context }, info) => {
    await context.addCookies([{ name: "dli_locale", value: locale, url: "http://127.0.0.1:3100" }]);
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/ask");
    const field = page.locator("#ai-question");
    await expect(field).toBeEnabled();
    await field.fill("A draft that remains editable.");
    await expect(field).toHaveCSS("outline-style", "none");
    await expect(page.locator(".chat-composer")).toHaveCSS("outline-style", "none");
    await expect(page.locator(".chat-composer")).toHaveCSS("border-top-color", "rgb(145, 133, 121)");
    await expect(page.locator(".chat-send-button")).toHaveCSS("background-color", "rgb(241, 138, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    // Field text can still be selected/copied, and keyboard actions remain marked.
    await field.evaluate(node => (node as HTMLTextAreaElement).select());
    expect(await field.evaluate(node => (node as HTMLTextAreaElement).selectionEnd - (node as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
    const action = page.locator(".chat-tool-button").first();
    await page.keyboard.press("Tab");
    await action.focus();
    await expect(action).toHaveCSS("outline-style", "solid");
    await field.focus();
    await page.screenshot({ path: info.outputPath(`chat-${width}-${locale}.png`), animations: "disabled" });
    await page.goto("/research");
    const research = page.locator('main textarea').first();
    await research.fill("Investigate quality review evidence.");
    await expect(research).toHaveCSS("outline-style", "none");
    await expect(research).toHaveCSS("border-top-color", "rgb(145, 133, 121)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
