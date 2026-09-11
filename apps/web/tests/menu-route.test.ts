import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ identity: vi.fn(), admin: vi.fn(), review: vi.fn(), cases: vi.fn(), tower: vi.fn(), inventory: vi.fn(), controls: vi.fn() }));
vi.mock("@/lib/backend-auth", () => ({ getPortalIdentity: mocks.identity }));
vi.mock("@/lib/api-client", () => ({ getAdminData: mocks.admin, getReviewQueue: mocks.review }));
vi.mock("@/lib/case-api-client", async original => ({ ...await original<typeof import("@/lib/case-api-client")>(), listAgentCases: mocks.cases }));
vi.mock("@/lib/governance-api-client", async original => ({ ...await original<typeof import("@/lib/governance-api-client")>(), getControlTower: mocks.tower, listGovernanceInventory: mocks.inventory, listRuntimeControls: mocks.controls }));
import { GET } from "@/app/api/portal/menus/[menu]/route";
import { CaseApiError } from "@/lib/case-api-client";

const read = (menu: string) => GET(new Request(`https://portal.example/api/portal/menus/${menu}`), { params: Promise.resolve({ menu }) });
beforeEach(() => { vi.resetAllMocks(); mocks.identity.mockResolvedValue({ subject: "one", roles: ["viewer"] }); });
it("does not expose role-protected menu reads or arbitrary server resources", async () => {
  expect((await read("secrets")).status).toBe(404);
  expect(await (await read("admin")).json()).toEqual({ status: "restricted" });
  expect(await (await read("review")).json()).toEqual({ status: "restricted" });
  expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
});
it("treats an authoritative permission denial as a prepared access state, not an empty list", async () => {
  mocks.cases.mockRejectedValue(new CaseApiError(403, "Restricted", "request-1"));
  const response = await read("cases");
  expect(await response.json()).toEqual({ status: "restricted", requestId: "request-1" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("fails unavailable reads instead of reporting successful preparation", async () => {
  mocks.cases.mockRejectedValue(new CaseApiError(503, "Unavailable"));
  expect((await read("cases")).status).toBe(502);
});
it("excludes privileged runtime controls from the viewer's operational data", async () => {
  mocks.tower.mockResolvedValue({}); mocks.inventory.mockResolvedValue([]);
  const response = await read("control-tower");
  expect((await response.json()).data).toMatchObject({ controls: [], canReadControls: false, canOperateControls: false });
  expect(mocks.controls).not.toHaveBeenCalled();
});
