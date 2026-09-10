import { expect, it } from "vitest";
import { validateWorkspaceResponse } from "@/lib/workspace-contract";

it("distinguishes valid empty search from malformed results and unsafe links", () => {
  expect(validateWorkspaceResponse("workspace/search", { groups: [], page: 1 })).toEqual({ groups: [], page: 1 });
  for (const value of [null, {}, { groups: null }, { groups: [{ kind: "sources", has_more: false, items: [{ id: "id", title: "title", kind: "sources", href: "javascript:alert(1)" }] }] }]) expect(() => validateWorkspaceResponse("workspace/search", value)).toThrow();
});
it("requires exact revision and state on triage acknowledgments", () => {
  expect(() => validateWorkspaceResponse("workspace/inbox/id", { id: "a", state: "approved", reason: "", revision: 1 })).toThrow();
  expect(validateWorkspaceResponse("workspace/inbox/id", { id: "a", state: "done", reason: "", revision: 1 })).toMatchObject({ revision: 1 });
});
it("rejects a malformed brief that would otherwise appear successfully saved", () => {
  expect(() => validateWorkspaceResponse("research/briefs", { id: "a", title: "Brief", run_id: "a" })).toThrow();
});
