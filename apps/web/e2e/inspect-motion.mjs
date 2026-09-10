// Supplemental normal-motion inspection; loopback fixtures only.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const output = new URL(process.env.MOTION_FOLLOWUP ? "../../../.artifacts/motion-upgrade/followup-interactions/" : "../../../.artifacts/motion-upgrade/interaction-review/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const base = "http://127.0.0.1:3100";
const id = "11111111-1111-4111-8111-111111111111";
const report = { cycles: [], selection: [], navigation: [], visuals: [] };
for (const cpu of [1, 4]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "dli_locale", value: "en", url: base }]);
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  await cdp.send("Performance.enable");
  await page.goto(`${base}/chat/${id}`); await page.waitForLoadState("networkidle");
  // Fixed measurement windows, not sleeps used to prove application behavior.
  const cycle = async count => page.evaluate(async count => {
    const samples = [];
    const sample = phase => new Promise(resolve => {
      let previous = performance.now(); const start = previous;
      function frame(now) { samples.push({ phase, dt: now - previous }); previous = now; if (now - start < 300) requestAnimationFrame(frame); else resolve(); }
      requestAnimationFrame(frame);
    });
    for (let i = 0; i < count; i++) {
      [...document.querySelectorAll("button")].find(node => node.textContent === "Sources (1)").click();
      await sample("open");
      document.querySelector('[aria-label="Close evidence panel"]').click();
      await sample("close");
    }
    return samples;
  }, count);
  await cycle(3); await cdp.send("HeapProfiler.collectGarbage");
  const before = await cdp.send("Performance.getMetrics");
  const samples = await cycle(12); await cdp.send("HeapProfiler.collectGarbage");
  const after = await cdp.send("Performance.getMetrics");
  report.cycles.push({ cpu, count: 12, samples, before: before.metrics, after: after.metrics, remainingPanels: await page.locator(".chat-evidence-panel").count() });
  await page.goto(`${base}/drug-letters/${id}`); await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.selectionSamples = []; const start = performance.now();
    window.selectionFinished = new Promise(resolve => {
      function frame(now) {
        const node = document.querySelector(".record-tab-list [data-motion-indicator]");
        const r = node.getBoundingClientRect();
        window.selectionSamples.push({ ms: now - start, x: r.x, width: r.width });
        if (now - start < 500) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  });
  await page.getByRole("tab").nth(2).click();
  await page.evaluate(() => window.selectionFinished);
  const settled = await page.locator(".record-tab-list [data-motion-indicator]").evaluate(async node => {
    await Promise.allSettled(node.getAnimations().map(animation => animation.finished));
    const rect = node.getBoundingClientRect();
    return { x: rect.x, width: rect.width, background: getComputedStyle(node).backgroundColor };
  });
  report.selection.push({ cpu, samples: await page.evaluate(() => window.selectionSamples), settled });
  if (process.env.MOTION_FOLLOWUP) {
    await page.evaluate(() => {
      window.navigationSamples = [];
      window.navigationFinished = new Promise(resolve => {
        let last = performance.now(), started;
        const frame = now => {
          const main = document.querySelector("main");
          const moving = main.getAnimations().some(a => a.id === "context-arrival");
          if (moving && !started) started = now;
          if (started) window.navigationSamples.push({ ms: now - started, dt: now - last, opacity: getComputedStyle(main).opacity, transform: getComputedStyle(main).transform });
          last = now;
          if (started && now - started >= 400) resolve(); else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    });
    await page.locator('.portal-nav__link[href="/drug-letters"]').click();
    await page.evaluate(() => window.navigationFinished);
    report.navigation.push({ cpu, samples: await page.evaluate(() => window.navigationSamples) });
  }
  await context.close();
}
for (const width of [390, 1920]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1080 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "dli_locale", value: "ko", url: base }]);
  const page = await context.newPage();
  for (const route of ["/dashboard", "/drug-letters", `/drug-letters/${id}`, `/chat/${id}`, "/research?run=22222222-2222-4222-8222-222222222222", "/requests", "/approvals", "/settings"]) {
    await page.goto(base + route); await page.waitForLoadState("networkidle"); await page.evaluate(() => document.fonts.ready);
    const slug = route.replaceAll(/[^a-z0-9]/gi, "-");
    await page.screenshot({ path: fileURLToPath(new URL(`ko-${width}${slug}.png`, output)), fullPage: true, animations: "disabled" });
    report.visuals.push({ route, width, locale: "ko", overflow: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth)) });
  }
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(base + `/drug-letters/${id}`); await page.waitForLoadState("networkidle"); await page.getByRole("tab").nth(1).focus();
  await page.screenshot({ path: fileURLToPath(new URL(`forced-colors-${width}.png`, output)), fullPage: true });
  await context.close();
}
await writeFile(new URL("inspection.json", output), JSON.stringify(report, null, 2));
await browser.close();
console.log("Normal-motion trajectories, repeated-cycle metrics, Korean and forced-color captures saved.");
