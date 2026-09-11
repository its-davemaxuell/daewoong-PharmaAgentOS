"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useWorkspaceScope } from "../workspace/provider";
import { WorkspaceErrorState, WorkspaceLoading } from "../workspace/primitives";
import { MenuReadError, menuParameters, menuQueryOptions } from "@/lib/menu-queries";
import type { MenuData, MenuResource } from "@/lib/menu-data-types";
import type { CaseStatus } from "@/lib/case-types";
import type { ApprovalCenterItem } from "@/lib/governance-api-client";
import { CaseAccessState, CaseIndex } from "../agent-platform/case-index";
import { AgentHome } from "../agent-platform/agent-home";
import { ApprovalsWorkspace } from "../agent-platform/approvals-workspace";
import { ServiceState } from "../agent-platform/service-state";
import { AdminConsole } from "../admin-console";
import { ReviewConsole } from "../review-console";
import { TrendsView } from "./trends-view";
import { EvaluationsView } from "./evaluations-view";
import { OperationsView } from "./control-tower-view";
import { SavedLettersWorkspace } from "../saved-views-workspace";

function Resource<K extends MenuResource>({ name, revision, children, restricted, unavailable, defaultView = false }: { name: K; revision: string; children: (data: MenuData[K]) => ReactNode; restricted?: ReactNode; unavailable?: ReactNode; defaultView?: boolean }) {
  const scope = useWorkspaceScope();
  const params = useSearchParams();
  const client = useQueryClient();
  const options = menuQueryOptions(scope, name, defaultView ? new URLSearchParams() : new URLSearchParams(params));
  const result = useQuery(options);
  const previousRevision = useRef(revision);
  useEffect(() => {
    // Server actions revalidate these routes. Refresh the client data too while
    // retaining the current screen and action state.
    if (previousRevision.current !== revision) {
      previousRevision.current = revision;
      // A governed action can also update another menu (for example, an
      // evaluation changes operations metrics). Mark inactive menu reads stale.
      void client.invalidateQueries({ queryKey: [scope, "menu"] });
    }
  }, [client, scope, name, revision]);
  if (result.isPending) return <WorkspaceLoading />;
  if (!result.data) {
    if (!unavailable && ["cases", "approvals", "evaluations", "control-tower"].includes(name)) return <ServiceState surface={name === "cases" ? "cases" : name === "approvals" ? "approvals" : name === "evaluations" ? "evaluations" : "operations"} kind={result.error instanceof MenuReadError ? result.error.kind : "unavailable"} requestId={result.error instanceof MenuReadError ? result.error.requestId : undefined} />;
    return <><WorkspaceErrorState retry={() => void result.refetch()} />{unavailable}</>;
  }
  if (result.data.status === "restricted") return restricted ?? (name === "cases" ? <CaseAccessState kind="forbidden" requestId={result.data.requestId} /> : <ServiceState surface={name === "approvals" ? "approvals" : name === "evaluations" ? "evaluations" : "operations"} restricted requestId={result.data.requestId} />);
  return <>{result.isError && <WorkspaceErrorState retry={() => void result.refetch()} />}{children(result.data.data)}</>;
}

function CasesView({ data, status }: { data: MenuData["cases"]; status?: CaseStatus }) {
  const [intentId, setIntentId] = useState("");
  useEffect(() => { const timer = setTimeout(() => setIntentId(crypto.randomUUID()), 0); return () => clearTimeout(timer); }, []);
  return <CaseIndex page={data.page} activeStatus={status} intentId={intentId} canCreate={data.canCreate && Boolean(intentId)} />;
}
export function MenuWorkspace({ name, revision }: { name: MenuResource | "requests"; revision: string }) {
  const params = useSearchParams();
  const status = new URLSearchParams(menuParameters(name === "requests" ? "cases" : name, new URLSearchParams(params))).get("status") || undefined;
  switch (name) {
    case "requests": return <Resource name="cases" revision={revision} defaultView restricted={<AgentHome cases={null} access="restricted" />} unavailable={<AgentHome cases={null} access="unavailable" />}>{data => <AgentHome cases={data.page.items} access="ready" />}</Resource>;
    case "cases": return <Resource name={name} revision={revision}>{data => <CasesView data={data} status={status as CaseStatus | undefined} />}</Resource>;
    case "approvals": return <Resource name={name} revision={revision}>{data => <ApprovalsWorkspace items={data.items} status={status as ApprovalCenterItem["status"] | undefined} />}</Resource>;
    case "evaluations": return <Resource name={name} revision={revision}>{data => <EvaluationsView value={data} />}</Resource>;
    case "control-tower": return <Resource name={name} revision={revision}>{data => <OperationsView value={data} />}</Resource>;
    case "trends": return <Resource name={name} revision={revision}>{data => <TrendsView value={data} />}</Resource>;
    case "admin": return <Resource name={name} revision={revision}>{data => <AdminConsole data={data.data} mode={data.mode} />}</Resource>;
    case "review": return <Resource name={name} revision={revision}>{data => <ReviewConsole initialQueue={data.data} mode={data.mode} />}</Resource>;
    case "saved-views": return <Resource name={name} revision={revision}>{data => <SavedLettersWorkspace initialEntries={data.entries} mode={data.mode} />}</Resource>;
  }
}
