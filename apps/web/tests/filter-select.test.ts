import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { SelectFilter } from "@/components/letters-explorer";
vi.stubGlobal("React", React);
vi.mock("@/app/(portal)/saved-views/actions", () => ({}));
function render(values: string[], value = "") {
  return renderToStaticMarkup(React.createElement(I18nProvider, null, React.createElement(SelectFilter, { label: "Documents", values, value, onChange: () => {}, allLabel: "All", unavailableLabel: "Unavailable" })));
}
it("keeps one meaningful option selectable and explains an unavailable filter", () => {
  expect(render(["response"])).not.toContain('disabled=""');
  expect(render([])).toContain('disabled=""');
  expect(render([])).toContain("Unavailable");
});
it("retains a stale selection visibly and allows clearing it", () => {
  const html = render([], "response");
  expect(html).toContain('value="response" selected=""');
  expect(html).not.toContain('disabled=""');
  expect(html).toContain('value=""');
});
