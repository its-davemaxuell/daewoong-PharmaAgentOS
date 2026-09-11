import type { getAdminData, getReviewQueue } from "./api-client";
import type { listAgentCases } from "./case-api-client";
import type { getControlTower, listGovernanceInventory, listRuntimeControls, listEvaluationRuns, listEvaluationSuites, listApprovals } from "./governance-api-client";
import type { getTrendsSummary } from "./trends-summary";
import type { getSavedMenuData } from "./saved-menu-data";

export type MenuData = {
  cases: { page: Awaited<ReturnType<typeof listAgentCases>>; canCreate: boolean };
  approvals: { items: Awaited<ReturnType<typeof listApprovals>> };
  evaluations: { suites: Awaited<ReturnType<typeof listEvaluationSuites>>; runs: Awaited<ReturnType<typeof listEvaluationRuns>>; inventory: Awaited<ReturnType<typeof listGovernanceInventory>>; canDevelop: boolean; canRelease: boolean };
  "control-tower": { tower: Awaited<ReturnType<typeof getControlTower>>; inventory: Awaited<ReturnType<typeof listGovernanceInventory>>; controls: Awaited<ReturnType<typeof listRuntimeControls>>; canReadControls: boolean; canOperateControls: boolean };
  trends: Awaited<ReturnType<typeof getTrendsSummary>>;
  admin: Awaited<ReturnType<typeof getAdminData>>;
  review: Awaited<ReturnType<typeof getReviewQueue>>;
  "saved-views": Awaited<ReturnType<typeof getSavedMenuData>>;
};
export type MenuResource = keyof MenuData;
export type MenuResult<K extends MenuResource> = { status: "ready"; data: MenuData[K] } | { status: "restricted"; requestId?: string };
