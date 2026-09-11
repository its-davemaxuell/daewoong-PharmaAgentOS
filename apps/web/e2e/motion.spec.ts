import { test, expect } from "@playwright/test";
import { retainFixtureSession } from "./session-fixture";

const origin = "http://127.0.0.1:3100";
const threadId = "11111111-1111-4111-8111-111111111111";
const researchId = "22222222-2222-4222-8222-222222222222";
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: origin }]);
});

test("selection is immediate and workspace navigation retains the shell without arrival movement", async ({ page }) => {
  await page.goto(`/drug-letters/${threadId}`);
  const tabs = page.getByRole("tab");
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).click();
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => document.querySelector("main")!.setAttribute("data-retained-shell", "true"));
  await page.locator('.continuity-sidebar a[href="/drug-letters"]').click();
  await expect(page).toHaveURL(/\/drug-letters$/);
  await expect(page.locator("main")).toHaveAttribute("data-retained-shell", "true");
  expect(await page.locator("main").evaluate(node => node.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.continuity-sidebar a[href="/saved-work"]').click();
  await expect(page).toHaveURL(/\/saved-work$/);
  expect(await page.locator("main").evaluate(node => node.getAnimations().length)).toBe(0);
});

test("rapid view selection preserves semantics and reduced motion stops movement", async ({ page }) => {
  await page.goto(`/drug-letters/${threadId}`);
  const tabs = page.getByRole("tab");
  // Establish the hydrated interaction boundary before sending raw rapid keys.
  // Visible server-rendered buttons can precede their event handlers on a cold load.
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).click();
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".record-tab-list [data-motion-indicator]")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".record-tab-list [data-motion-indicator]").evaluate(node => ({
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    animations: node.getAnimations().map(animation => ({ state: animation.playState, frames: (animation.effect as KeyframeEffect).getKeyframes() })),
  }))).toEqual({ reduced: true, animations: [] });
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-panel")))).toBe(0);
});

test("source and native dialog exits restore focus and cannot trap keyboard", async ({ page }) => {
  await retainFixtureSession(page);
  await page.goto(`/chat/${threadId}`);
  const source = page.getByRole("button", { name: "Sources (1)", exact: true });
  for (let index = 0; index < 4; index++) {
    await source.click();
    await expect(page.getByRole("heading", { name: "Read the source" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(source).toBeFocused();
    const exiting = page.locator('[data-presence="exiting"]');
    // Inspect one DOM snapshot: a fast exit may unmount between two locator calls.
    expect(await exiting.evaluateAll(nodes => nodes.every(node => node.hasAttribute("inert")))).toBe(true);
  }
  await expect(page.locator(".chat-evidence-panel")).toHaveCount(0);
  const library = page.getByRole("button", { name: "Conversations", exact: true });
  for (let index = 0; index < 3; index++) {
    await library.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Search conversation titles and messages")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(library).toBeFocused();
    await expect(page.locator("dialog.chat-library")).not.toHaveAttribute("open");
    await expect(page.locator("dialog.chat-library")).toHaveAttribute("inert", "");
  }
  await expect(page.locator("dialog.chat-library")).toHaveCount(1);
});

test("mobile drawer isolates the workspace and rapid closing restores its trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const menu = page.getByRole("button", { name: "Open navigation", exact: true });
  for (let index = 0; index < 3; index++) {
    await menu.click();
    await expect(page.locator('dialog.continuity-mobile-nav:modal')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(page.locator('dialog.continuity-mobile-nav')).not.toHaveAttribute('open');
  }
  await expect(page.locator('.continuity-sidebar')).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});

test("persisted research events advance once; stop does not wait for animation", async ({ page, request }) => {
  const response = await request.get(`${origin}/api/research/${researchId}`);
  const fixture = await response.json();
  let current = { ...fixture, status: "running", stage: "planning", revision: 1, events: [], result: null, finished_at: null };
  let stopRequests = 0;
  await page.route(`**/api/research/${researchId}*`, async route => {
    if (route.request().method() === "POST") {
      stopRequests++;
      current = { ...current, status: "stopped", revision: 3, can_resume: true };
    }
    await route.fulfill({ json: current });
  });
  await page.goto(`/research?run=${researchId}`);
  await expect(page.locator('[data-research-status="running"]')).toBeVisible();
  expect(await page.locator('[data-new-event="true"]').count()).toBe(0);
  current = { ...current, stage: "searching", revision: 2, events: [{ sequence: 2, kind: "search_completed", stage: "searching", created_at: fixture.updated_at, data: { count: 1, query: "New fictional evidence query" } }] };
  const event = page.locator('[data-event-sequence="2"]');
  await expect(event).toContainText("New fictional evidence query");
  await expect(event).toHaveAttribute("data-new-event", "true");
  await page.getByRole("button", { name: "Stop research", exact: true }).click();
  await expect(page.locator('[data-research-status="stopped"]')).toBeVisible();
  expect(stopRequests).toBe(1);
  await expect(page.getByRole("button", { name: "Resume research", exact: true })).toBeEnabled();
  await expect(event).toHaveCount(1);
});

test("large restored history stays still, IME does not submit, and reading position stays user-owned", async ({ page }) => {
  let submissions = 0;
  page.on("request", request => { if (request.url().endsWith("/api/chat/query") && request.method() === "POST") submissions++; });
  await page.goto("/chat/33333333-3333-4333-8333-333333333333");
  await expect(page.locator(".chat-turn")).toHaveCount(60);
  await expect(page.locator('.chat-turn[data-introduced="true"]')).toHaveCount(0);
  const composer = page.locator("#ai-question");
  await composer.fill("한국어 조합 중인 질문입니다");
  await composer.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, bubbles: true });
  expect(submissions).toBe(0);
  await expect(composer).toHaveValue("한국어 조합 중인 질문입니다");
  const transcript = page.locator(".chat-page__conversation");
  await transcript.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
  await expect(page.getByRole("button", { name: /latest/i })).toBeVisible();
  expect(await transcript.evaluate(node => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: /latest/i }).click();
  await expect.poll(() => transcript.evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(80);
});

test("wide desktop and Korean filter recovery retain usable controls", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/drug-letters");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByLabel("Linked documents").selectOption("response");
  await expect(page.locator(".archive-filter-chips button")).toHaveCount(1);
  await page.getByRole("button", { name: "Remove filter: response", exact: true }).click();
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await page.getByRole("button", { name: "Switch interface to 한국어", exact: true }).click();
  await expect(page.getByLabel("연결된 문서")).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});


test("bookmark pending state prevents duplicate writes and failure never looks saved", async ({ page }) => {
  await page.goto("/drug-letters");
  let mutations = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/drug-letters", async route => {
    if (route.request().method() !== "POST") return route.continue();
    mutations++; await gate; await route.abort("failed");
  });
  const bookmark = page.locator(".letter-bookmark-button").first();
  await bookmark.click();
  await expect(bookmark).toBeDisabled();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect(bookmark).toContainText("Saving source preference");
  await expect(bookmark).toHaveAttribute("aria-busy", "true");
  await bookmark.evaluate(node => { (node as HTMLButtonElement).click(); });
  await expect.poll(() => mutations).toBe(1);
  release();
  await expect(page.getByRole("alert").filter({ hasText: "Save failed" })).toBeVisible();
  await expect(bookmark).toBeEnabled();
  await expect(bookmark).toHaveAttribute("aria-pressed", "false");
});

test("clipboard failure keeps a persistent recovery instruction", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("Fixture permission denied")) } }); });
  await page.goto(`/research?run=${researchId}`);
  await page.getByRole("button", { name: "Copy brief", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not copy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Copied", exact: true })).toHaveCount(0);
});

test("stream chunks preserve reading position and do not replay message entrances", async ({ page }) => {
  await page.addInitScript(() => {
    const fixture = window as typeof window & { pushMotionChunk?: (text: string) => void; endMotionStream?: () => void; messageEntrances?: number };
    const original = window.fetch.bind(window);
    fixture.messageEntrances = 0;
    document.addEventListener("animationstart", event => { if (event.animationName === "turn-arrive") fixture.messageEntrances!++; });
    window.fetch = async (input, init) => {
      if (String(input) !== "/api/chat/query") return original(input, init);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({ start(controller) {
        fixture.pushMotionChunk = text => controller.enqueue(encoder.encode(JSON.stringify({ type: "draft_delta", attempt: 1, text }) + "\n"));
        fixture.endMotionStream = () => controller.close();
      } });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
    };
  });
  await page.goto("/chat/33333333-3333-4333-8333-333333333333");
  await page.locator("#ai-question").fill("Inspect the fictional evidence during a streamed answer.");
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(page.locator(".chat-turn")).toHaveCount(61);
  await expect.poll(() => page.evaluate(() => typeof (window as typeof window & { pushMotionChunk?: unknown }).pushMotionChunk)).toBe("function");
  await page.evaluate(() => (window as typeof window & { pushMotionChunk: (text: string) => void }).pushMotionChunk("First fictional streamed passage. ".repeat(30)));
  await expect(page.locator(".chat-turn").last()).toContainText("First fictional streamed passage");
  await expect.poll(() => page.locator(".chat-turn").last().evaluate(node => node.getAnimations()
    .filter(animation => (animation as CSSAnimation).animationName === "turn-arrive" && animation.playState === "running").length)).toBe(0);
  const transcript = page.locator(".chat-page__conversation");
  await transcript.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
  await expect(page.getByRole("button", { name: "Latest answer", exact: true })).toBeVisible();
  await page.evaluate(() => (window as typeof window & { pushMotionChunk: (text: string) => void }).pushMotionChunk("Second fictional passage."));
  await expect(page.locator(".chat-turn").last()).toContainText("Second fictional passage");
  expect(await transcript.evaluate(node => node.scrollTop)).toBe(0);
  expect(await page.evaluate(() => (window as typeof window & { messageEntrances: number }).messageEntrances)).toBe(1);
  await page.evaluate(() => (window as typeof window & { endMotionStream: () => void }).endMotionStream());
  await expect(page.getByRole("button", { name: "Ask AI", exact: true })).toBeVisible();
  await expect(page.locator(".chat-turn").last()).toContainText(/connection ended|incomplete/i);
});
