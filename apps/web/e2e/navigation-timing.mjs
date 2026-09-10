import { chromium } from "@playwright/test";

const baseURL = process.argv[2] || "http://127.0.0.1:3100";
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "dli_locale", value: "en", url: baseURL }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard`);
  await page.waitForLoadState("networkidle");
  const results = [];
  for (let round = 0; round < 3; round++) {
    for (const [href, ready] of [["/drug-letters", ".letter-row"], ["/saved-work", ".workspace-page h1"], ["/research", ".research-history"]]) {
      const link = page.locator(`.portal-sidebar__nav a[href="${href}"]`).first();
      const start = performance.now();
      await link.click();
      await page.waitForURL(url => url.pathname === href);
      if (href === "/research") await page.locator(".research-run-list").waitFor();
      else await page.locator(ready).first().waitFor();
      results.push({ round: round + 1, href, ms: Math.round(performance.now() - start) });
      await page.waitForLoadState("networkidle");
    }
  }
  console.log(JSON.stringify({ baseURL, measuredAt: new Date().toISOString(), results, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
