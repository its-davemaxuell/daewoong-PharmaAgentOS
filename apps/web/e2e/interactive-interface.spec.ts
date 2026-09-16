import { test, expect, type Page, type TestInfo } from "@playwright/test";
import rawCatalog from "../content/examples/catalog.json";
import type { PublicExample } from "../lib/example-types";
const catalog = rawCatalog as PublicExample[];
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath(name), fullPage: true, animations: "disabled" });
}

for (const locale of ["en", "ko"] as const) {
  test.describe(locale, () => {
  const t = (en: string, ko: string) => locale === "en" ? en : ko;
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "dli_locale", value: locale, url: "http://127.0.0.1:3100" }]);
    await context.addInitScript(value => localStorage.setItem("daewoong-fda-locale", value), locale);
  });

  test(`${locale}: gallery previews retained output and filters by provenance`, async ({ page }, info) => {
    await page.goto("/examples");
    const list = page.getByRole("navigation", { name: t("Choose a result", "실행 결과 선택") });
    await expect(list.getByRole("link")).toHaveCount(18);
    await page.getByRole("combobox", { name: t("Example origin", "실행 자료 유형") }).selectOption("reference");
    await expect(list.getByRole("link")).toHaveCount(9);
    const item = catalog.find(example => example.slug === "internal-knowledge")!;
    const choice = list.getByRole("button", { name: new RegExp(item.title[locale === "en" ? 0 : 1]) });
    await choice.focus();
    await choice.press("Space");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    const preview = page.locator('[data-example-preview="internal-knowledge"]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(item.sections[0].title);
    await expect(preview).toContainText(t("Unapproved", "미승인"));
    await expect(choice).toBeFocused();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `width ${width}`).toBe(true);
      if (width === 1440 || width === 390) await capture(page, info, `gallery-${locale}-${width}.png`);
    }
    await page.getByRole("searchbox", { name: t("Search examples", "예시 검색") }).fill("zz-no-example");
    await expect(page.getByRole("heading", { name: t("No matching examples", "일치하는 예시가 없습니다") })).toBeVisible();
    await page.getByRole("button", { name: t("Show all examples", "전체 예시 보기") }).click();
    await expect(list.getByRole("link")).toHaveCount(18);
  });

  test(`${locale}: translation controls keep output and exact original evidence aligned`, async ({ page }, info) => {
    const item = catalog.find(example => example.slug === "document-translation")!;
    await page.goto(`/examples/${item.slug}`);
    const previous = page.getByRole("button", { name: t("Previous section", "이전 구간") });
    const next = page.getByRole("button", { name: t("Next section", "다음 구간") });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(page.getByRole("combobox", { name: t("Result section", "결과 구간") })).toHaveValue("1");
    await page.getByRole("button", { name: t("Compare original", "원문 대조") }).click();
    const section = item.sections[1];
    const source = item.sources.find(source => section.sourceIds?.includes(source.id))!;
    await expect(page.locator("#example-result-view blockquote")).toHaveText(source.excerpt);
    for (const passage of [section.text, ...(section.items || [])].filter((value): value is string => Boolean(value))) {
      await expect(page.locator("#example-result-view")).toContainText(passage);
    }
    await capture(page, info, `translation-${locale}-compare.png`);
    const citation = page.getByRole("link", { name: `${t("Source", "근거")} ${source.id}`, exact: true });
    await citation.click();
    const evidence = page.locator(`#source-${source.id}`);
    await expect(evidence).toHaveAttribute("open", "");
    await expect(evidence.locator("summary").first()).toBeFocused();
    await expect(evidence.locator("blockquote")).toHaveText(source.excerpt);
    const search = page.getByRole("searchbox", { name: t("Find in evidence", "근거 내 검색") });
    await search.fill("zz-no-passage");
    await expect(page.locator("#example-evidence-view details:visible")).toHaveCount(0);
    await page.getByRole("button", { name: t("Clear search", "검색 지우기") }).click();
    await expect(evidence).toBeVisible();
    await page.getByRole("button", { name: t("Result", "결과"), exact: true }).click();
    await page.getByRole("button", { name: t("Complete output", "전체 결과"), exact: true }).click();
    await expect(page.locator("#example-result-view h3")).toHaveCount(item.sections.length);
    await expect(next).toBeDisabled();
    await page.getByRole("button", { name: t("Run details", "실행 정보"), exact: true }).click();
    await expect(page.locator("#example-run-view")).toContainText(item.input);
  });

  test(`${locale}: Help preserves edits, transfers only a draft and previews real specialist output`, async ({ page }, info) => {
    const submissions: string[] = [];
    page.on("request", request => { if (request.method() === "POST" && /\/api\/(chat|research)/.test(request.url())) submissions.push(request.url()); });
    await page.goto("/help");
    const question = page.getByRole("textbox", { name: t("Your question", "질문 내용"), exact: true });
    const custom = t("Compare the two retained letters and list questions for my quality review.", "보존된 두 경고서한을 비교하고 품질 검토를 위한 질문을 정리하세요.");
    await question.fill(custom);
    await page.getByRole("button", { name: t("Laboratory investigations", "시험실 조사"), exact: true }).click();
    await expect(page.locator('[data-example-preview="research-laboratory-ko"]')).toBeVisible();
    await page.getByRole("button", { name: t("Contamination control", "오염 관리"), exact: true }).click();
    await expect(question).toHaveValue(custom);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `help width ${width}`).toBe(true);
      if (width === 1440 || width === 390) await capture(page, info, `help-${locale}-${width}.png`);
    }
    await question.fill("");
    await expect(page.getByRole("button", { name: t("Use in Research", "리서치에서 사용"), exact: true })).toBeDisabled();
    await question.fill(custom);
    await page.getByRole("button", { name: t("Use in Research", "리서치에서 사용"), exact: true }).click();
    await expect(page.locator("#research-goal").filter({ visible: true })).toHaveValue(custom);
    await page.getByRole("button", { name: t("Edit question", "질문 편집"), exact: true }).click();
    await expect(page.locator("#research-goal").filter({ visible: true })).toBeFocused();
    expect(submissions).toEqual([]);
    await page.goto("/agents");
    const choice = page.getByRole("navigation", { name: t("Agent definitions", "에이전트 정의") }).getByRole("button", { name: /Internal knowledge|내부 지식 에이전트/ });
    await choice.click();
    await expect(page.locator('[data-example-preview="internal-knowledge"]')).toBeVisible();
    await expect(page.locator("main")).toContainText(t("Automatic specialist execution is unavailable.", "전문 에이전트 자동 실행은 아직 제공하지 않습니다."));
    await page.locator("main").getByText(t("Role, input & tools", "역할, 입력 및 도구"), { exact: true }).click();
    await expect(page.locator("main #agent-detail dl")).toBeVisible();
    await capture(page, info, `agents-${locale}-320.png`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(submissions).toEqual([]);
  });
  });
}

test("Overview inbox shortcuts open the selected triage state", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("daewoong-fda-locale", "en"));
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Inbox states" }).getByRole("link", { name: /^Done/ }).click();
  await expect(page).toHaveURL(/\/inbox\?state=done/);
  await expect(page.getByRole("button", { name: /^Done \d/ })).toHaveAttribute("aria-pressed", "true");
});
