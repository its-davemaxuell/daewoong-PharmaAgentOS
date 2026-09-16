import { test, expect } from "@playwright/test";
import { retainFixtureSession } from "./session-fixture";
import { samplePress } from "./press-samples";

const thread = "11111111-1111-4111-8111-111111111111";
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
});

test("keyboard presses acknowledge immediately and preserve native Space and Enter activation", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.locator("#ai-question")).toBeEnabled();
  const options = page.getByRole("button", { name: "Search & answer options", exact: true });
  await options.focus();
  await page.keyboard.down("Space");
  await expect(options).toHaveAttribute("data-press-feedback", "true");
  await expect(options).toHaveAttribute("aria-expanded", "false");
  await expect(options).toHaveCSS("scale", "0.98");
  await page.keyboard.up("Space");
  await expect(options).toHaveAttribute("aria-expanded", "true");
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await page.keyboard.down("Enter");
  await expect(options).toHaveAttribute("aria-expanded", "false");
  await expect(options).toHaveAttribute("data-press-feedback", "true");
  await page.keyboard.up("Enter");
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await expect(options).toHaveCSS("scale", "none");
  await page.locator("#ai-question").fill("Draft remains editable");
  await page.keyboard.press("Space");
  await expect(page.locator("[data-press-feedback]")).toHaveCount(0);
});

test("pointer cancellation, drag-away and focus loss never leave a pressed control", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.locator("#ai-question")).toBeEnabled();
  const options = page.getByRole("button", { name: "Search & answer options", exact: true });
  await options.hover(); await page.mouse.down();
  await expect(options).toHaveAttribute("data-press-feedback", "true");
  await page.mouse.move(2, 2);
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await page.mouse.up();
  await expect(options).toHaveAttribute("aria-expanded", "false");
  await options.dispatchEvent("pointerdown", { isPrimary: true, pointerId: 10, button: 0, pointerType: "touch", clientX: 10, clientY: 10 });
  await expect(options).toHaveAttribute("data-press-feedback", "true");
  await options.dispatchEvent("pointercancel", { pointerId: 10 });
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await options.dispatchEvent("pointerdown", { isPrimary: true, pointerId: 11, button: 0, pointerType: "touch", clientX: 10, clientY: 10 });
  await options.dispatchEvent("pointermove", { pointerId: 11, pointerType: "touch", clientX: 10, clientY: 30 });
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await options.focus(); await page.keyboard.down("Space");
  await page.locator("#ai-question").focus();
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await page.keyboard.up("Space");
});

test("disabled controls and live reduced-motion changes stay still", async ({ page }) => {
  await page.goto("/ask");
  await expect(page.locator("#ai-question")).toBeEnabled();
  const send = page.locator(".chat-send-button");
  await expect(send).toBeDisabled();
  const disabledScale = await send.evaluate(node => getComputedStyle(node).scale);
  await send.hover(); await page.mouse.down();
  await expect(send).not.toHaveAttribute("data-press-feedback");
  await expect(send).toHaveCSS("scale", disabledScale);
  await page.mouse.up();
  const options = page.getByRole("button", { name: "Search & answer options", exact: true });
  await options.focus(); await page.keyboard.down("Space");
  await expect(options).toHaveAttribute("data-press-feedback", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(options).not.toHaveAttribute("data-press-feedback");
  await expect(options).toHaveCSS("transition-duration", "0s");
  await expect(options).toHaveCSS("scale", "none");
  await page.keyboard.up("Space");
  await expect(options).toHaveAttribute("aria-expanded", "true");
  await expect(options).not.toHaveAttribute("data-press-feedback");
});

test("mobile drawer retains inert content through exit and survives immediate reopening", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ask");
  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  const drawer = page.locator(".continuity-mobile-nav");
  await trigger.click();
  await expect(drawer.locator("a").first()).toBeVisible();
  // Real hit testing must reach the close control, including at phone widths.
  await drawer.locator(".continuity-mobile-close").click();
  await expect(trigger).toBeFocused();
  await expect(drawer.locator("a")).toHaveCount(0);
  await trigger.click();
  await expect(drawer.locator("a").first()).toBeVisible();
  await drawer.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  const exit = await drawer.evaluate(node => {
    node.querySelector<HTMLButtonElement>(".continuity-mobile-close")!.click();
    return new Promise<{ open: boolean; inert: boolean; links: number; animations: number }>(resolve => requestAnimationFrame(() => resolve({
      open: (node as HTMLDialogElement).open, inert: (node as HTMLElement).inert,
      links: node.querySelectorAll("a").length, animations: node.getAnimations().length,
    })));
  });
  expect(exit.open).toBe(false); expect(exit.inert).toBe(true);
  if (await page.evaluate(() => CSS.supports("overlay", "auto") && CSS.supports("transition-behavior", "allow-discrete"))) {
    expect(exit.links).toBeGreaterThan(0); expect(exit.animations).toBeGreaterThan(0);
  }
  await expect(trigger).toBeFocused();
  await expect(drawer.locator("a")).toHaveCount(0);
  await trigger.click();
  await expect(drawer.locator("a").first()).toBeVisible();
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>(".continuity-mobile-close")!.click();
    document.querySelector<HTMLButtonElement>(".continuity-mobile-trigger")!.click();
  });
  await expect(drawer).toHaveAttribute("open", "");
  await drawer.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  await expect(drawer).not.toHaveAttribute("inert");
  await expect(drawer.locator("a").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("conversation find exits inert, restores focus and can reopen during exit", async ({ page }) => {
  await retainFixtureSession(page);
  await page.goto(`/chat/${thread}`);
  const trigger = page.getByRole("button", { name: "Find in chat", exact: true });
  const find = page.locator(".chat-find__bar");
  await trigger.click();
  await expect(page.getByRole("searchbox", { name: "Find in this chat", exact: true })).toBeFocused();
  await page.getByRole("searchbox", { name: "Find in this chat", exact: true }).fill("fictional");
  await expect(find.getByRole("status")).toContainText("/");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await page.locator('.chat-find__bar[data-presence="exiting"]').evaluateAll(nodes => nodes.every(node => node.hasAttribute("inert")))).toBe(true);
  await trigger.click();
  await expect(find).toHaveAttribute("data-presence", "open");
  await expect(find).not.toHaveAttribute("inert");
  await expect(page.getByRole("searchbox", { name: "Find in this chat", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(find).toHaveCount(0);
});

test("conversation actions support arrow keys, Home, End, Escape and native Tab exit", async ({ page }) => {
  await retainFixtureSession(page);
  await page.goto(`/chat/${thread}`);
  const menu = page.locator(".chat-thread-menu");
  const summary = menu.locator("summary");
  await expect(menu.locator("button").first()).toBeEnabled();
  await summary.focus(); await page.keyboard.press("ArrowDown");
  await expect(menu).toHaveAttribute("open", "");
  const choices = menu.locator("button:enabled");
  await expect(choices.first()).toBeFocused();
  await page.keyboard.press("End"); await expect(choices.last()).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(choices.first()).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.press("Home"); await expect(choices.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open"); await expect(summary).toBeFocused();
  await page.keyboard.press("ArrowUp"); await expect(choices.last()).toBeFocused();
  await page.keyboard.press("Tab"); await expect(menu).not.toHaveAttribute("open");
});

test("research task keys interpolate keyboard depth without starting a run", async ({ page }) => {
  let submissions = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/research") submissions++; });
  await page.goto("/research");
  const task = page.locator('[class*="exampleTopics"] button').first();
  await expect(task).toBeEnabled(); await task.focus();
  await task.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  const raised = await task.evaluate(node => getComputedStyle(node).boxShadow);
  const samples = await samplePress(task, "keydown", () => page.keyboard.down("Space"));
  expect(new Set(samples).size).toBeGreaterThan(2);
  expect(samples.at(-1)).not.toBe(raised);
  await page.keyboard.up("Space");
  await expect(page.locator("textarea").first()).not.toHaveValue("");
  expect(submissions).toBe(0);
});

test("closed menu actions cannot take focus during their visual exit", async ({ page }) => {
  await retainFixtureSession(page);
  await page.goto(`/chat/${thread}`);
  const menu = page.locator(".chat-thread-menu");
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await menu.evaluate(node => Promise.allSettled(node.getAnimations({ subtree: true }).map(animation => animation.finished)));
  await menu.locator("summary").focus();
  const exit = await menu.evaluate(node => {
    (node as HTMLDetailsElement).open = false;
    return new Promise<{ focusedClosedAction: boolean; focusOnSummary: boolean }>(resolve => requestAnimationFrame(() => {
      node.querySelector<HTMLButtonElement>("button")!.focus();
      resolve({ focusedClosedAction: node.querySelector("div")!.contains(document.activeElement), focusOnSummary: document.activeElement === node.querySelector("summary") });
    }));
  });
  expect(exit).toEqual({ focusedClosedAction: false, focusOnSummary: true });
  await page.keyboard.press("ArrowDown");
  await expect(menu.locator("button").first()).toBeFocused();
});

test("changing reduced motion while find is open stops its exit and Escape works from match controls", async ({ page }) => {
  await retainFixtureSession(page);
  await page.goto(`/chat/${thread}`);
  const trigger = page.getByRole("button", { name: "Find in chat", exact: true });
  await trigger.click();
  await page.getByRole("searchbox", { name: "Find in this chat", exact: true }).fill("fictional");
  const next = page.getByRole("button", { name: "Next match", exact: true });
  await next.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = await next.evaluate(node => {
    const panel = node.closest<HTMLElement>(".chat-find__bar")!;
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return new Promise<{ retained: boolean; inert: boolean; transform: string }>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({ retained: panel.isConnected, inert: panel.inert, transform: getComputedStyle(panel).transform });
    })));
  });
  expect(state.retained).toBe(false);
  await expect(trigger).toBeFocused();
});

test("primary buttons keep Daewoong orange depth while pressing and do not submit before release", async ({ page }) => {
  await page.goto("/ask");
  await page.locator("#ai-question").fill("A prepared question");
  const send = page.locator(".chat-send-button");
  await expect(send).toBeEnabled();
  await send.hover(); await page.mouse.down();
  await send.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
  const pressed = await send.evaluate(node => ({ shadow: getComputedStyle(node).boxShadow, text: getComputedStyle(node).color }));
  expect(pressed.shadow).toContain("rgb(185, 93, 0)");
  expect(pressed.text).toBe("rgb(51, 40, 28)");
  await page.mouse.move(1, 1); await page.mouse.up();
  await expect(page.locator("#ai-question")).toHaveValue("A prepared question");
});
