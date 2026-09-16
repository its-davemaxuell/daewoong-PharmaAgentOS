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
const output = path.join(root, '.artifacts', process.argv[3] || 'pipeline-examples/browser-hosted');
if (!output.startsWith(path.join(root, '.artifacts') + path.sep)) throw new Error('Audit output must stay inside workspace .artifacts');
fs.mkdirSync(output, { recursive: true });

async function ready(page, locale, result) {
  await page.waitForFunction(() => {
    const gate = document.querySelector('[data-startup-gate]');
    return !gate || ['entered', 'attention'].includes(gate.dataset.state);
  }, undefined, { timeout: 45000 });
  if (await page.locator('[data-startup-gate]').count() && await page.locator('[data-startup-gate]').getAttribute('data-state') === 'attention') {
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
    await page.screenshot({ path: path.join(output, `${name}-${locale}-${width}-${label}.png`), fullPage: label !== 'translation', animations: 'disabled' });
  };
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const t = (en, ko) => locale === 'en' ? en : ko;
  const navigate = async route => {
    const mobile = page.getByRole('button', { name: t('Open navigation', '탐색 메뉴 열기'), exact: true });
    if (await mobile.isVisible()) await mobile.click();
    await page.locator(`.continuity-nav[href="${route}"]:visible`).click();
    await expect(page).toHaveURL(url => url.origin === new URL(base).origin && url.pathname === route);
  };
  try {
    expect((await page.goto(`${base}/examples`, { waitUntil: 'domcontentloaded' })).status()).toBe(200);
    await ready(page, locale, result);
    await expect(page.locator('main nav a[href^="/examples/"]')).toHaveCount(examples.length);
    await noOverflow();
    await screenshot('gallery');
    for (const example of examples) {
      await page.locator(`main nav a[href="/examples/${example.slug}"]`).click();
      await expect(page.locator('main h1')).toHaveText(example.title[locale === 'ko' ? 1 : 0]);
      await noOverflow();
      if (example.sections.length > 1) {
        const section = page.getByRole('combobox', { name: t('Result section', '결과 구간') });
        await section.selectOption(String(example.sections.length - 1));
        await expect(page.locator('#example-result-view')).toContainText(example.sections.at(-1).title);
        await expect(page.getByRole('button', { name: t('Next section', '다음 구간'), exact: true })).toBeDisabled();
        await section.selectOption('0');
      }
      if (example.slug === 'document-translation') {
        await page.getByRole('button', { name: t('Next section', '다음 구간'), exact: true }).click();
        await page.getByRole('button', { name: t('Compare original', '원문 대조'), exact: true }).click();
        const source = example.sources.find(source => example.sections[1].sourceIds.includes(source.id));
        await expect(page.locator('#example-result-view blockquote')).toHaveText(source.excerpt);
        await noOverflow();
        await screenshot('translation');
      }
      const references = page.getByRole('link', { name: /^(Source|근거) [DESI]/ });
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
      result.inspected.push(example.slug);
      await page.locator('main a[href="/examples"]').click();
      await expect(page.locator('main nav a[href^="/examples/"]')).toHaveCount(examples.length);
    }
    await navigate('/help');
    const question = page.getByRole('textbox', { name: t('Your question', '질문 내용'), exact: true });
    const draft = t('Compare cleaning-validation evidence and list questions for human review.', '세척 밸리데이션 근거를 비교하고 담당자가 검토할 질문을 정리하세요.');
    await question.fill(draft);
    await page.getByRole('button', { name: t('Laboratory investigations', '시험실 조사'), exact: true }).click();
    await expect(page.locator('[data-example-preview="research-laboratory-ko"]')).toBeVisible();
    await page.getByRole('button', { name: t('Contamination control', '오염 관리'), exact: true }).click();
    await expect(question).toHaveValue(draft);
    await noOverflow();
    await screenshot('help');
    await page.getByRole('button', { name: t('Use in Research', '리서치에서 사용'), exact: true }).click();
    await expect(page.locator('#research-goal').filter({ visible: true })).toHaveValue(draft);
    await page.getByRole('button', { name: t('Edit question', '질문 편집'), exact: true }).click();
    await expect(page.locator('#research-goal').filter({ visible: true })).toBeFocused();
    await screenshot('research');
    await navigate('/agents');
    await page.getByRole('navigation', { name: t('Agent definitions', '에이전트 정의') }).getByRole('button', { name: /Internal knowledge|내부 지식 에이전트/ }).click();
    await expect(page.locator('[data-example-preview="internal-knowledge"]')).toBeVisible();
    await noOverflow();
    await screenshot('agents');
    await navigate('/ask');
    await expect(page.locator('.chat-evidence-flow a')).toHaveCount(3);
    await noOverflow();
    await screenshot('chat');
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
