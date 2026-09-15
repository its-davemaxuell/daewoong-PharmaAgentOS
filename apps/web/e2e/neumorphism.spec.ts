import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("pressed task controls interpolate depth and only prepare a draft", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/chat/query")) requests++; });
  await page.goto("/ask");
  const key = page.locator(".chat-suggestions button").first();
  await expect(page.locator("#ai-question")).toBeEnabled();
  await key.hover();
  await key.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  const raised = await key.evaluate(node => getComputedStyle(node).boxShadow);
  await page.mouse.down();
  const samples = await key.evaluate(node => new Promise<string[]>(resolve => {
    const values: string[] = [], start = performance.now();
    const frame = () => {
      values.push(getComputedStyle(node).boxShadow);
      if (performance.now() - start < 180) requestAnimationFrame(frame); else resolve(values);
    };
    requestAnimationFrame(frame);
  }));
  await page.mouse.up();
  expect(samples.at(-1)).not.toBe(raised);
  expect(new Set(samples).size).toBeGreaterThan(2);
  await expect(page.locator("#ai-question")).toHaveValue(/cleaning validation/);
  expect(requests).toBe(0);
});

test("inspector releases focus while its inert exit finishes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/drug-letters?selected=11111111-1111-4111-8111-111111111111");
  const inspector = page.locator(".workspace-inspector");
  await expect(inspector).toBeVisible();
  await inspector.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  const state = await inspector.evaluate(node => {
    node.querySelector<HTMLButtonElement>("header button")!.click();
    return new Promise<{ connected: boolean; inert: boolean; open: boolean; focusInside: boolean; animated: boolean }>(resolve => requestAnimationFrame(() => {
      resolve({ connected: node.isConnected, inert: (node as HTMLElement).inert, open: (node as HTMLDialogElement).open,
        focusInside: node.contains(document.activeElement), animated: node.getAnimations().length > 0 });
    }));
  });
  expect(state.inert).toBe(true);
  expect(state.open).toBe(false);
  expect(state.focusInside).toBe(false);
  if (await page.evaluate(() => CSS.supports("transition-behavior", "allow-discrete") && CSS.supports("overlay", "auto"))) {
    expect(state.connected).toBe(true);
    expect(state.animated).toBe(true);
  }
  await expect(inspector).toHaveCount(0);
  await expect(page).not.toHaveURL(/selected=/);
});

test("reduced motion closes inspectors immediately and keeps forced-color selection visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/drug-letters?selected=11111111-1111-4111-8111-111111111111");
  const inspector = page.locator(".workspace-inspector");
  await expect(inspector).toBeVisible();
  expect(await inspector.evaluate(node => node.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
  await expect(inspector).toHaveCount(0);
  const selected = page.locator('.continuity-sidebar [aria-current="page"]');
  await expect(selected).toHaveCSS("outline-style", "solid");
});

test("selecting another source during exit cancels the old close", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/drug-letters?selected=11111111-1111-4111-8111-111111111111");
  const inspector = page.locator(".workspace-inspector");
  await expect(inspector).toBeVisible();
  await inspector.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>(".workspace-inspector header button")!.click();
    document.querySelectorAll<HTMLAnchorElement>(".letter-row__titleline a")[1].click();
  });
  await expect(page.locator(".letter-row").nth(1)).toHaveAttribute("data-selected", "true");
  await expect(inspector).toHaveAttribute("open", "");
  await inspector.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  await expect(inspector).not.toHaveAttribute("inert");
  await expect(page.locator(".letter-row").nth(1)).toHaveAttribute("data-selected", "true");
});
