import { expect, test, type Page } from "@playwright/test";
import { retainFixtureSession } from "./session-fixture";

async function fixture(page: Page) {
  await page.context().addCookies([{ name: "dli_locale", value: "en", url: "http://127.0.0.1:3100" }]);
  await retainFixtureSession(page);
  await page.route("**/api/workspace/workspace/inbox?**", route => route.fulfill({ json: { items: [], counts: {}, has_more: false, page: 1, starts_at: "2026-08-12T00:00:00Z" } }));
}

test("shell and commands remain available while activity is loading",async({page})=>{
 await fixture(page);
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/drug-letters?*',async route=>{await held;await route.continue();});
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await expect(page.locator('[data-startup-overlay]')).toHaveCount(0);
 await expect(page.locator('.continuity-skeleton').first()).toBeVisible();
 await page.keyboard.press('Control+k');
 await expect(page.locator('.workspace-command')).toBeVisible();
 await page.keyboard.press('Escape');
 release();
 await expect(page.locator('.continuity-activity tbody button')).toHaveCount(9);
});
test("independent overview errors retain navigation and recover locally",async({page})=>{
 await fixture(page);let failed=true;
 await page.route('**/api/drug-letters?*',route=>failed?route.fulfill({status:502,json:{error:'fixture failure'}}):route.continue());
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Your work',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
 failed=false;await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.locator('.continuity-activity tbody button')).toHaveCount(9);
});
test("mobile reduced-motion shell opens without a startup gate",async({page})=>{
 await fixture(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await expect(page.locator('[data-startup-overlay]')).toHaveCount(0);
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await expect(page.locator('dialog.continuity-mobile-nav:modal')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
