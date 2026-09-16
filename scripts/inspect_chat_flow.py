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
    parser.add_argument("--followups", action="store_true")
    parser.add_argument("--settled-reload", action="store_true", help="Wait for background navigation requests before reloading (diagnostic control).")
    args = parser.parse_args()
    out = (ROOT / args.output / f"{args.browser}-{args.locale}").resolve()
    out.relative_to(ROOT)
    out.mkdir(parents=True, exist_ok=True)
    errors, responses, checks, diagnostics = [], [], [], []
    phase = "opening"
    with sync_playwright() as p:
        browser = getattr(p, args.browser).launch(headless=True)
        try:
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            context.add_cookies([{"name": "dli_locale", "value": args.locale, "url": args.base}])
            page = context.new_page()
            def record_error(error):
                errors.append(str(error))
                diagnostics.append({"event": "pageerror", "phase": phase, "message": str(error), "time": time.monotonic()})
            page.on("pageerror", record_error)
            page.on("requestfailed", lambda request: diagnostics.append({"event": "requestfailed", "phase": phase, "url": request.url, "failure": request.failure, "time": time.monotonic()}))
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
            phase = "chat"
            expect(question).to_be_enabled(timeout=30000)
            expect(page.get_by_role("button", name="Ask AI" if args.locale == "en" else "질문 보내기", exact=True)).to_be_disabled()
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
            send = page.get_by_role("button", name="Ask AI" if args.locale == "en" else "질문 보내기", exact=True)
            expect(send).to_be_enabled(timeout=30000)
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
            if args.followups:
                for index, prompt in enumerate([
                    "How many FDA warning letters were issued in 2025?" if args.locale == "en" else "2025년에 발행된 FDA 경고서한은 몇 건인가요?",
                    "And in 2024?" if args.locale == "en" else "그럼 2024년에는요?",
                ], start=2):
                    expect(question).to_be_enabled(timeout=30000)
                    question.fill(prompt)
                    expect(send).to_be_enabled(timeout=30000)
                    expect(question).to_have_value(prompt)
                    question.press("Enter")
                    expect(page.locator(".chat-turn .chat-provenance")).to_have_count(index, timeout=120000)
                    expect(page.locator(".chat-turn").last).to_contain_text("2025-01-01" if index == 2 else "2024-01-01")
                    expect(page.locator(".chat-turn").last).to_contain_text("315" if index == 2 else "172")
                checks.append("Date count and year follow-up both complete in the same conversation")
                if args.settled_reload:
                    page.wait_for_load_state("networkidle", timeout=60000)
                    checks.append("Background requests settled before reload")
                phase = "reload"
                page.reload()
                expect(page.locator(".chat-turn .chat-provenance")).to_have_count(3, timeout=60000)
                checks.append("Three completed turns survive reload")
                phase = "source inspection"
            if page.locator(".chat-source-strip__open").count():
                page.locator(".chat-source-strip__open").last.click()
                expect(page.locator("#evidence-panel-title")).to_be_focused()
                expect(page.locator(".chat-evidence-panel")).to_contain_text("FDA posting date" if args.locale == "en" else "FDA 게시일")
                expect(page.locator(".chat-evidence-panel")).to_have_css("opacity", "1")
                page.screenshot(path=str(out / "evidence-desktop.png"), full_page=True)
                page.locator(".chat-evidence-panel").press("Escape")
                expect(page.locator(".chat-evidence-panel")).to_have_count(0)
                checks.append("Citations open, receive keyboard focus and close with Escape")
            for width in [768, 390, 320]:
                page.set_viewport_size({"width": width, "height": 844})
                page.locator(".chat-turn .chat-answer__copy").last.scroll_into_view_if_needed()
                overflow = page.evaluate("document.documentElement.scrollWidth - innerWidth")
                assert overflow <= 1, f"Overflow at {width}px: {overflow}"
                checks.append(f"Width {width}: overflow {overflow}px")
                page.screenshot(path=str(out / f"answer-{width}.png"), full_page=True)
            checks.append("Conversation URL " + page.url)
        except Exception as error:
            errors.append(str(error))
            page.screenshot(path=str(out / "failure.png"), full_page=True)
            (out / "failure.txt").write_text(page.locator("body").inner_text(), encoding="utf-8")
        finally:
            (out / "results.json").write_text(json.dumps({"checks": checks, "errors": errors, "http_errors": responses, "diagnostics": diagnostics}, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps({"checks": checks, "errors": [e[:500] for e in errors]}, ensure_ascii=True), flush=True)
            browser.close()
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
