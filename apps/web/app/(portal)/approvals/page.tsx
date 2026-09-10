import type { Metadata } from "next";
import { ServiceState } from "@/components/agent-platform/service-state";
import { ApprovalsWorkspace } from "@/components/agent-platform/approvals-workspace";
import { listApprovals, GovernanceApiError, type ApprovalCenterItem } from "@/lib/governance-api-client";
import { problemKind } from "@/lib/api-problem";
export const metadata: Metadata = { title: "검토 요청 | Review requests" };
export default async function ApprovalCenterPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const raw = (await searchParams).status;
  const status = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(raw ?? "") ? raw as ApprovalCenterItem["status"] : undefined;
  let items: ApprovalCenterItem[];
  try { items = await listApprovals(status); }
  catch (error) { return <ServiceState surface="approvals" kind={error instanceof GovernanceApiError ? error.kind : problemKind(0)} requestId={error instanceof GovernanceApiError ? error.requestId : undefined} />; }
  return <ApprovalsWorkspace items={items} status={status} />;
}
