import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { tableCells, isTableDivider } from "@/lib/chat-markdown";
import { MarkdownCitationText } from "@/components/chat-workspace";

vi.stubGlobal("React", React);
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/app/(portal)/ask/actions", () => ({}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ text: (en: string) => en }) }));

it("handles escaped pipes and code inside comparison cells", () => {
  expect(tableCells("| A \\| B | `x|y` | finding |")).toEqual(["A | B", "`x|y`", "finding"]);
  expect(isTableDivider("| :--- | ---: |", 2)).toBe(true);
  expect(isTableDivider("| normal | prose |", 2)).toBe(false);
});

it("renders semantic comparison tables without executing source HTML", () => {
  const html = renderToStaticMarkup(React.createElement(MarkdownCitationText, {
    text: "| Finding | Source |\n| --- | --- |\n| <script>alert(1)</script> | **FDA** |",
    citations: [], onSelect: () => {},
  }));
  expect(html).toContain('<th scope="col"><span>Finding</span></th>');
  expect(html).toContain("<strong>FDA</strong>");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});

it("keeps fenced code literal instead of interpreting tables or HTML", () => {
  const html = renderToStaticMarkup(React.createElement(MarkdownCitationText, {
    text: "```html\n<img src=x onerror=alert(1)>\n| A | B |\n| --- | --- |\n```",
    citations: [], onSelect: () => {},
  }));
  expect(html).toContain("<pre><code>");
  expect(html).not.toContain("<table>");
  expect(html).not.toContain("<img");
});
