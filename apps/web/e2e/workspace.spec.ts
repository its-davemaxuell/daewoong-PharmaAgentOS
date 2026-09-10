import { test, expect } from "@playwright/test";
const id = "11111111-1111-4111-8111-111111111111";
const run = "22222222-2222-4222-8222-222222222222";

test("workspace remains usable on narrow screens and with enlarged Korean text", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/drug-letters", `/research?run=${run}`, "/saved-work", "/search", "/inbox"]) {
    await page.goto(route);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
  }
  await page.goto("/drug-letters");
  await page.locator(".letter-row__titleline a").first().click();
  await expect(page.locator(".workspace-inspector")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.locator(".workspace-inspector").evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: info.outputPath("mobile-inspector.png") });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().addCookies([{ name: "dli_locale", value: "ko", url: "http://127.0.0.1:3100" }]);
  await page.evaluate(() => localStorage.setItem("daewoong-fda-locale", "ko"));
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/api/portal/sidebar"),
    page.goto("/research"),
  ]);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  // Next may briefly retain a hidden streamed tree during the hydrated swap.
  const goal = page.locator("#research-goal").filter({ visible: true });
  await expect(goal).toHaveCount(1);
  await expect(goal).toHaveAttribute("placeholder", /품질팀/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("korean-enlarged.png"), fullPage: true });
});

test("saved view editing sends the displayed revision and retains edits after conflict", async ({ page }) => {
  const view = { id, name: "Validation sources", description: "A saved filter", view_kind: "source_view", source_id: null, open_url: "/drug-letters?q=validation", revision: 3, display: { sort: "posted-desc", pageSize: 20 }, criteria: { query: "validation" }, result_count: 12 };
  const writes: unknown[] = [];
  await page.route("**/api/workspace/saved-views**", route => {
    if (route.request().method() === "PATCH") { writes.push(route.request().postDataJSON()); return route.fulfill({ status: 409, json: { detail: "conflict" } }); }
    return route.fulfill({ json: { items: [view], has_more: false } });
  });
  await page.goto("/saved-work?tab=views");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("My retained edit");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("This view changed elsewhere");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("My retained edit");
  expect(writes).toEqual([{ name: "My retained edit", description: view.description, display: view.display, expected_revision: 3 }]);
});
test.beforeEach(async ({ context }) => { await context.addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]); });

test("source inspector retains filtered rows, focus, history and bounded rendering", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/drug-letters");
  await expect(page.locator(".letter-row")).toHaveCount(20);
  const row = page.locator(`.letter-row a[href="/drug-letters/${id}"]`).first();
  await page.locator(".archive-ledger").evaluate(node => node.setAttribute("data-retained", "yes"));
  await row.click();
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toBeVisible();
  await expect(page).toHaveURL(/selected=/);
  await expect(page.getByRole("heading", { name: "Fictional Pharma", exact: true })).toBeVisible();
  await expect(page.locator(".archive-ledger")).toHaveAttribute("data-retained", "yes");
  await page.screenshot({ path: info.outputPath("sources-inspector.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toHaveCount(0);
  await expect(row).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toHaveCount(0);
});

test("commands use the current view action and do not interrupt IME input", async ({ page }) => {
  await page.goto("/drug-letters");
  await page.locator(`.letter-row a[href="/drug-letters/${id}"]`).first().click();
  await page.getByRole("button", { name: "Actions and workspace search" }).click();
  await page.getByRole("button", { name: "Close inspector", exact: true }).last().click();
  await expect(page.locator(".workspace-inspector")).toHaveCount(0);
  const input = page.locator(".archive-search input");
  await input.focus();
  await input.dispatchEvent("keydown", { key: "k", ctrlKey: true, isComposing: true });
  await expect(page.locator(".workspace-command")).not.toHaveAttribute("open");
  await page.locator("main").focus();
  await page.keyboard.press("Control+k");
  await expect(page.locator(".workspace-command")).toHaveAttribute("open");
  await page.keyboard.press("Escape");
});

test("research selection retains history and opens cited evidence without scrolling the brief", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/research?run=${run}`);
  await expect(page.locator("#research-brief")).toBeVisible();
  await page.locator(".research-run-list").evaluate(node => node.setAttribute("data-retained", "yes"));
  await page.getByRole("button", { name: "New research", exact: true }).click();
  await expect(page.locator("#research-goal")).toBeVisible();
  await page.locator(".research-run-list .workspace-list button").first().click();
  await expect(page.locator("#research-brief")).toBeVisible();
  await expect(page.locator(".research-run-list")).toHaveAttribute("data-retained", "yes");
  const citation = page.locator('#research-brief a[href^="#source-"]').first();
  await citation.click();
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toBeVisible();
  await expect(page.getByText("Evidence retained with this research")).toBeVisible();
  await page.screenshot({ path: info.outputPath("research-evidence.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(citation).toBeFocused();
});

test("personal inbox saves explicit selections and reports stale writes", async ({ page }) => {
  const item = { id, letter_id: id, title: "Fictional arrival", subtitle: "Source updated", event_type: "UPDATED", version_id: "v1", detected_at: "2026-09-10", state: "new", revision: 0, reason: "" };
  const writes: unknown[] = [];
  await page.route("**/api/workspace/workspace/inbox**", async route => {
    if (route.request().method() === "PATCH") { writes.push(route.request().postDataJSON()); return route.fulfill({ status: 409, json: { detail: "conflict" } }); }
    return route.fulfill({ json: { items: [item], counts: { new: 1 }, page: 1, has_more: false, starts_at: "2026-08-11" } });
  });
  await page.goto("/inbox");
  await page.getByRole("checkbox", { name: "Select Fictional arrival" }).check();
  await page.locator(".workspace-bulk").getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".workspace-feedback[role=status]")).toContainText("Another edit changed an item");
  expect(writes).toEqual([{ state: "done", reason: "", expected_revision: 0 }]);
  await expect(page.getByRole("checkbox")).toBeChecked();
});

test("saved brief exports its exact snapshot and search rejects stale responses", async ({ page }) => {
  const brief = { id, title: "Retained draft", run_id: run, run_revision: 4, content_hash: "a".repeat(64), created_at: "2026-09-10", snapshot: { objective: "A research objective", language: "en", review_state: "draft", result: { findings: [{ statement: "Retained finding", citation_ids: ["S1"] }], sources: [], limitations: ["For review"] } } };
  await page.route("**/api/workspace/research/briefs**", route => route.fulfill({ json: route.request().url().includes(`/briefs/${id}`) ? brief : { items: [brief], has_more: false } }));
  await page.goto(`/saved-work?brief=${id}`);
  await expect(page.getByRole("dialog", { name: "Saved brief" })).toContainText("Retained finding");
  await expect(page.getByRole("link", { name: "Export JSON" })).toHaveAttribute("href", `/api/workspace/research/briefs/${id}/export`);
  await page.route("**/api/workspace/workspace/search**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "slow") await new Promise(resolve => setTimeout(resolve, 800));
    await route.fulfill({ json: { groups: [{ kind: "sources", items: [{ id, title: `${q} result`, subtitle: "FDA source", href: `/drug-letters?selected=${id}`, kind: "sources" }], has_more: false }], page: 1 } });
  });
  await page.goto("/search");
  const input = page.getByRole("textbox", { name: "Search workspace", exact: true });
  await Promise.all([page.waitForRequest("**/api/workspace/workspace/search*q=slow*"), input.fill("slow")]);
  await input.fill("latest");
  await expect(page.getByRole("link", { name: "latest result FDA source" })).toBeVisible();
  await expect(page.getByText("slow result", { exact: true })).toHaveCount(0);
});
