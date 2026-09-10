import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { cpus, totalmem, platform, release } from "node:os";

// Record the representative trace separately so snapshot capture is not in the timing path.
test.use({ trace: "off" });

for (const size of [100, 1000, 10000]) test(`cached inspector timing with ${size} available sources`, async ({ page, browser }, info) => {
  await page.context().addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar" && response.ok()),
    page.goto(`/drug-letters?q=fixture-${size}`),
  ]);
  await expect(page.locator(".letter-row")).toHaveCount(20);
  await expect(page.getByText(`${size} results`, { exact: true })).toBeVisible();
  await page.locator(".letter-row__titleline a").first().click();
  await expect(page.locator(".workspace-inspector h3").first()).toHaveText("Fictional Pharma");
  await page.keyboard.press("Escape");
  const frameCalibration = await page.evaluate(async () => {
    const samples: number[] = [];
    let previous = performance.now();
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const now = performance.now(); samples.push(now - previous); previous = now;
    }
    return samples;
  });
  const samples: { acknowledgment: number; usefulContent: number; animationComplete: number }[] = [];
  for (let index = 0; index < 30; index++) {
    await expect(page.locator(".workspace-inspector")).toHaveCount(0);
    // This is an isolated latency measurement, not a history-write stress test.
    // Next writes history again when synchronizing each search-param update.
    // Keep those writes below WebKit's 100-per-10-second quota. The pause is
    // outside the timed activation, and the same cadence applies to all browsers.
    await page.waitForTimeout(500);
    expect(browserErrors).toEqual([]);
    await expect(page.locator(".letter-row")).toHaveCount(20);
    samples.push(await page.evaluate(async () => {
      const start = performance.now();
      (document.querySelector(".letter-row__titleline a") as HTMLElement).click();
      const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      while (!document.querySelector(".workspace-inspector[open]")) await frame();
      await frame();
      const acknowledgment = performance.now() - start;
      while (!document.querySelector(".workspace-inspector h3")) await frame();
      const usefulContent = performance.now() - start;
      await Promise.all(document.querySelector(".workspace-inspector")!.getAnimations().map(animation => animation.finished.catch(() => {})));
      const animationComplete = performance.now() - start;
      (document.querySelector(".workspace-inspector header button") as HTMLElement).click();
      return { acknowledgment, usefulContent, animationComplete };
    }));
  }
  const percentile = (key: keyof typeof samples[number], p: number) => samples.map(sample => sample[key]).sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];
  const report = {
    method: "Production fixture build with tracing disabled during timing. 500 ms untimed spacing between activations avoids the browser History API quota. DOM activation to next frame with open inspector, cached heading, then CSS animation completion. Separate representative trace after timing. Excludes hardware input latency and server save durability; not field INP or sustained throughput.",
    browser: info.project.name, browserVersion: browser.version(), os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, memoryBytes: totalmem(), viewport: page.viewportSize(),
    availableSources: size, renderedRows: await page.locator(".letter-row").count(), frameCalibration, samples,
    p95: { acknowledgment: percentile("acknowledgment", .95), usefulContent: percentile("usefulContent", .95), animationComplete: percentile("animationComplete", .95) },
  };
  await writeFile(info.outputPath("workspace-performance.json"), JSON.stringify(report, null, 2));
  await info.attach("workspace-performance", { body: JSON.stringify(report), contentType: "application/json" });
  await page.context().tracing.start({ screenshots: true, snapshots: true });
  await page.locator(".letter-row__titleline a").first().click();
  await expect(page.locator(".workspace-inspector h3").first()).toHaveText("Fictional Pharma");
  await page.keyboard.press("Escape");
  await page.context().tracing.stop({ path: info.outputPath("representative-trace.zip") });
  expect(report.renderedRows).toBe(20);
  expect(browserErrors).toEqual([]);
  // Lab regression ceiling; report the separate proposed 100 ms goal honestly.
  expect(report.p95.usefulContent).toBeLessThan(500);
});
