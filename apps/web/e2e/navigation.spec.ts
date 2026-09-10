import { test, expect } from "@playwright/test";

test("navigation groups slide, reverse immediately and respect reduced motion", async ({ page, context }) => {
  await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("summary").filter({ hasText: "Workspace" })).toBeVisible();
  for (const group of await page.locator(".portal-workspace-group").all()) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const trigger = group.locator("summary");
    if (await trigger.getAttribute("aria-expanded") === "true") await trigger.click();
    await expect(group).not.toHaveAttribute("open");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const pauseNext = () => group.evaluate(node => {
      const animate = node.animate.bind(node);
      node.animate = (...args: Parameters<HTMLElement["animate"]>) => {
        node.animate = animate;
        const animation = animate(...args);
        animation.pause();
        return animation;
      };
    });
    await pauseNext();
    await trigger.click();
    const halfway = await group.evaluate(node => {
      const animation = node.getAnimations()[0];
      if (!animation) throw new Error("Submenu did not animate");
      animation.pause();
      animation.currentTime = 100;
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      return { duration: animation.effect?.getTiming().duration, token: getComputedStyle(node).getPropertyValue("--motion-panel"), height: node.getBoundingClientRect().height, start: parseFloat(String(frames[0].height)), end: parseFloat(String(frames[1].height)) };
    });
    expect(halfway.duration).toBe(200);
    expect(halfway.height).toBeGreaterThan(halfway.start);
    expect(halfway.height).toBeLessThan(halfway.end);
    await pauseNext();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(group.locator(".portal-workspace-group__content")).toHaveAttribute("inert");
    const reversedStart = await group.evaluate(node => parseFloat(String((node.getAnimations()[0].effect as KeyframeEffect).getKeyframes()[0].height)));
    expect(Math.abs(reversedStart - halfway.height)).toBeLessThan(1);
    await group.evaluate(node => node.getAnimations().forEach(animation => animation.finish()));
    await expect(group).not.toHaveAttribute("open");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => group.evaluate(node => node.getAnimations().length)).toBe(0);
    await trigger.click();
    await expect(group).not.toHaveAttribute("open");
    await expect(trigger).toBeFocused();
  }
});
