import { getPortalIdentity } from "@/lib/backend-auth";
import { getAdminData, getReviewQueue } from "@/lib/api-client";
import { CaseApiError, listAgentCases } from "@/lib/case-api-client";
import { GovernanceApiError, getControlTower, listGovernanceInventory, listRuntimeControls, listEvaluationRuns, listEvaluationSuites, listApprovals, type ApprovalCenterItem } from "@/lib/governance-api-client";
import { getTrendsSummary } from "@/lib/trends-summary";
import { menuParameters } from "@/lib/menu-queries";
import type { MenuResource } from "@/lib/menu-data-types";
import type { CaseStatus } from "@/lib/case-types";
import { getSavedMenuData } from "@/lib/saved-menu-data";
import { problemKind } from "@/lib/api-problem";

const resources = new Set(["cases", "approvals", "evaluations", "control-tower", "trends", "admin", "review", "saved-views"]);
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request, context: { params: Promise<{ menu: string }> }) {
  const { menu } = await context.params;
  if (!resources.has(menu)) return Response.json({ detail: "Not found" }, { status: 404, headers });
  const identity = await getPortalIdentity();
  const has = (...roles: string[]) => roles.some(role => identity.roles.includes(role as typeof identity.roles[number]));
  if ((menu === "admin" && !has("admin")) || (menu === "review" && !has("reviewer"))) return Response.json({ status: "restricted" }, { headers });
  const params = new URLSearchParams(menuParameters(menu as MenuResource, new URL(request.url).searchParams));
  try {
    let data;
    switch (menu) {
      case "cases": data = { page: await listAgentCases(params.get("status") as CaseStatus || undefined), canCreate: has("analyst", "system_owner") }; break;
      case "approvals": data = { items: await listApprovals(params.get("status") as ApprovalCenterItem["status"] || undefined) }; break;
      case "evaluations": {
        const [suites, runs, inventory] = await Promise.all([listEvaluationSuites(), listEvaluationRuns(), listGovernanceInventory()]);
        data = { suites, runs, inventory, canDevelop: has("agent_developer", "system_owner"), canRelease: has("system_owner") }; break;
      }
      case "control-tower": {
        const canReadControls = has("platform_admin", "system_owner", "auditor");
        const [tower, inventory, controls] = await Promise.all([getControlTower(), listGovernanceInventory(), canReadControls ? listRuntimeControls() : Promise.resolve([])]);
        data = { tower, inventory, controls, canReadControls, canOperateControls: has("platform_admin", "system_owner") }; break;
      }
      case "trends": data = await getTrendsSummary(Number(params.get("days"))); break;
      case "admin": data = await getAdminData(); break;
      case "review": data = await getReviewQueue({ view: "open", pageSize: 10 }); break;
      case "saved-views": data = await getSavedMenuData(); break;
    }
    return Response.json({ status: "ready", data }, { headers });
  } catch (error) {
    if ((error instanceof CaseApiError || error instanceof GovernanceApiError) && error.status === 403) return Response.json({ status: "restricted", requestId: error.requestId }, { headers });
    const known = error instanceof CaseApiError || error instanceof GovernanceApiError;
    return Response.json({ detail: "Menu temporarily unavailable", kind: error instanceof GovernanceApiError ? error.kind : problemKind(known ? error.status : 0), requestId: known ? error.requestId : undefined }, { status: 502, headers });
  }
}
