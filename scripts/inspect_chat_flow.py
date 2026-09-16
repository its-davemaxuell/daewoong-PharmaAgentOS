"""Exercise real chat controls in an isolated browser session and retain visual evidence."""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(ROOT / ".artifacts/playwright-browsers")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://pharmaagent-os-ochre.vercel.app")
    parser.add_argument("--browser", default="chromium", choices=["chromium", "firefox", "webkit"])
    parser.add_argument("--locale", default="en", choices=["en", "ko"])
    parser.add_argument("--output", default=".artifacts/chat-metadata/ui-before")
    args = parser.parse_args()
    out = (ROOT / args.output / f"{args.browser}-{args.locale}").resolve()
    out.relative_to(ROOT)
    out.mkdir(parents=True, exist_ok=True)
    errors, responses, checks = [], [], []
    with sync_playwright() as p:
        browser = getattr(p, args.browser).launch(headless=True)
        try:
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            context.add_cookies([{"name": "dli_locale", "value": args.locale, "url": args.base}])
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("response", lambda response: responses.append({"url": response.url.split("?")[0], "status": response.status}) if response.status >= 400 else None)
            page.goto(args.base + "/ask")
            page.wait_for_load_state("networkidle")
            if page.locator("[data-startup-gate]").count():
                page.wait_for_function("['entered','attention'].includes(document.querySelector('[data-startup-gate]').dataset.state)", timeout=45000)
                if page.locator("[data-startup-gate]").get_attribute("data-state") == "attention":
                    checks.append("Startup needed Retry")
                    page.locator("[data-startup-overlay] button").first.click()
                page.wait_for_function("document.querySelector('[data-startup-gate]').dataset.state === 'entered'", timeout=45000)
            question = page.locator("#ai-question")
            expect(question).to_be_enabled(timeout=30000)
            expect(page.get_by_role("button", name="Ask AI" if args.locale == "en" else "AI에게 질문", exact=True)).to_be_disabled()
            question.fill("Review FDA dates")
            question.press("Shift+Enter")
            expect(question).to_have_value("Review FDA dates\n")
            checks.append("Empty-submit guard and Shift+Enter")
            page.get_by_role("button", name="Search & answer options" if args.locale == "en" else "검색·답변 설정", exact=True).click()
            page.get_by_role("button", name="Filters" if args.locale == "en" else "필터", exact=True).click()
            page.screenshot(path=str(out / "filters-desktop.png"), full_page=True)
            page.get_by_role("button", name="Close filters" if args.locale == "en" else "필터 닫기", exact=True).click()
            expect(question).to_be_focused()
            checks.append("Filter panel closes to composer without losing draft")
            question.fill("Show FDA warning-letter issue dates and source links." if args.locale == "en" else "FDA 경고서한 발행일과 원문 링크를 보여주세요.")
            start = time.monotonic()
            with page.expect_response(lambda r: r.url.endswith("/api/chat/query") and r.request.method == "POST", timeout=120000) as pending:
                question.press("Enter")
            response = pending.value
            try:
                body = response.text()
                (out / "stream.txt").write_text(body, encoding="utf-8")
            except Exception:
                checks.append("Browser discarded stream network body during conversation routing")
            checks.append(f"Answer transport {response.status}, {time.monotonic() - start:.1f}s")
            expect(page.locator(".chat-turn .chat-provenance")).to_be_visible(timeout=120000)
            page.screenshot(path=str(out / "answer-desktop.png"), full_page=True)
            if page.locator(".chat-source-strip__open").count():
                page.locator(".chat-source-strip__open").last.click()
                expect(page.locator("#evidence-panel-title")).to_be_focused()
                page.screenshot(path=str(out / "evidence-desktop.png"), full_page=True)
                page.locator(".chat-evidence-panel").press("Escape")
                checks.append("Citations open, receive keyboard focus and close with Escape")
            for width in [768, 390, 320]:
                page.set_viewport_size({"width": width, "height": 844})
                overflow = page.evaluate("document.documentElement.scrollWidth - innerWidth")
                checks.append(f"Width {width}: overflow {overflow}px")
                page.screenshot(path=str(out / f"answer-{width}.png"), full_page=True)
            checks.append("Conversation URL " + page.url)
        except Exception as error:
            errors.append(str(error))
            page.screenshot(path=str(out / "failure.png"), full_page=True)
            (out / "failure.txt").write_text(page.locator("body").inner_text(), encoding="utf-8")
        finally:
            (out / "results.json").write_text(json.dumps({"checks": checks, "errors": errors, "http_errors": responses}, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps({"checks": checks, "errors": errors}, ensure_ascii=True), flush=True)
            browser.close()


if __name__ == "__main__":
    main()
