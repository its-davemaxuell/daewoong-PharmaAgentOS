// Read-only browser audit of the deployed, curated public examples.
// Run after `npm install` in apps/web and Playwright browser installation.
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.artifacts/playwright-browsers');
const { chromium, firefox, webkit, expect } = require('../apps/web/node_modules/@playwright/test');
const examples = require('../apps/web/content/examples/catalog.json');
const base = process.argv[2] || 'https://pharmaagent-os-ochre.vercel.app';
const output = path.join(root, '.artifacts/pipeline-examples/browser-hosted');
fs.mkdirSync(output, { recursive: true });

async function ready(page, locale, result) {
  await page.waitForFunction(() => {
    const gate = document.querySelector('[data-startup-gate]');
    return !gate || ['entered', 'attention'].includes(gate.dataset.state);
  }, undefined, { timeout: 45000 });
  if (await page.locator('[data-startup-gate]').getAttribute('data-state') === 'attention') {
    result.startupRetry = true;
    await page.getByRole('button', { name: locale === 'en' ? 'Retry' : '다시 시도', exact: true }).click();
    await expect(page.locator('[data-startup-gate]')).toHaveAttribute('data-state', 'entered', { timeout: 40000 });
  }
  await expect(page.locator('[data-startup-overlay]')).toHaveCount(0);
}

async function audit(browser, name, locale, width) {
  const result = { browser: name, locale, width, passed: false, inspected: [], errors: [], submissions: [] };
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: width < 768 ? 'reduce' : 'no-preference' });
  await context.addCookies([{ name: 'dli_locale', value: locale, url: base }]);
  await context.addInitScript(value => localStorage.setItem('daewoong-fda-locale', value), locale);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/(chat|research)/.test(request.url())) result.submissions.push(new URL(request.url()).pathname);
  });
  const screenshot = async label => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `${name}-${locale}-${width}-${label}.png`), fullPage: label !== 'translation' });
  };
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  try {
    expect((await page.goto(`${base}/examples`, { waitUntil: 'domcontentloaded' })).status()).toBe(200);
    await ready(page, locale, result);
    await expect(page.locator('main a[href^="/examples/"]').filter({ has: page.locator('h2') })).toHaveCount(examples.length);
    await noOverflow();
    await screenshot('gallery');
    for (const example of examples) {
      await page.locator(`main a[href="/examples/${example.slug}"]`).click();
      await expect(page.locator('main h1')).toHaveText(example.title[locale === 'ko' ? 1 : 0]);
      await noOverflow();
      const references = page.getByRole('link', { name: /^(Source|근거) [DEI]/ });
      if (await references.count()) {
        const target = await references.first().getAttribute('href');
        await references.first().click();
        await expect(page.locator(target)).toHaveAttribute('open', '');
        await expect(page.locator(target).locator('blockquote')).toBeVisible();
        await noOverflow();
      }
      const response = await context.request.get(`${base}${example.download}`);
      expect(response.status()).toBe(200);
      const bytes = await response.body();
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(example.sha256);
      const snapshot = JSON.parse(bytes.toString());
      expect(snapshot.human_approved).toBe(false);
      expect(snapshot.synthetic_sources).toBe(example.origin === 'reference');
      if (['document-findings', 'review-package'].includes(example.slug)) await screenshot(example.slug);
      if (example.slug === 'document-translation' && locale === 'ko') await screenshot('translation');
      result.inspected.push(example.slug);
      await page.locator('main a[href="/examples"]').click();
      await expect(page.locator('main a[href^="/examples/"]').filter({ has: page.locator('h2') })).toHaveCount(examples.length);
    }
    expect(result.errors).toEqual([]);
    expect(result.submissions).toEqual([]);
    result.passed = true;
  } catch (error) {
    result.failure = error.message;
    await page.screenshot({ path: path.join(output, `${name}-${locale}-failure.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

(async () => {
  const results = [];
  for (const [name, kind] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await kind.launch();
    try {
      for (const [locale, width] of [['en', 1440], ['ko', 390]]) {
        const result = await audit(browser, name, locale, width);
        results.push(result);
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
        console.log(`${name} ${locale} ${width}: ${result.passed ? 'PASS' : 'FAIL'}, ${result.inspected.length} examples${result.startupRetry ? ', startup Retry recovered' : ''}`);
        if (result.failure) console.log(result.failure);
      }
    } finally { await browser.close(); }
  }
  if (results.some(result => !result.passed)) process.exitCode = 1;
})();
