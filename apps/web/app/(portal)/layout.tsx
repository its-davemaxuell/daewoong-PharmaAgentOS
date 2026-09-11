import { PortalShell } from "@/components/portal-shell";
import { ChatHistoryProvider } from "@/components/chat-history-context";
import { getPortalIdentity } from "@/lib/backend-auth";
import { WorkspaceProvider } from "@/components/workspace/provider";
import { StartupGate } from "@/components/workspace/startup-gate";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Identity is local to the signed browser session. Sidebar network reads must
  // not block every route or remount the conversation while an answer is streaming.
  const identity = await getPortalIdentity();
  const linearWorkspace = process.env.LINEAR_WORKSPACE_ENABLED !== "false";
  const shell = <PortalShell linearWorkspace={linearWorkspace} roles={identity.roles} newLetterNotification={{}}>{children}</PortalShell>;

  return (
    <WorkspaceProvider key={identity.subject} subject={identity.subject} roles={identity.roles} linearWorkspace={linearWorkspace}><ChatHistoryProvider
      key={identity.subject}
      initialThreads={[]}
      initialLoadState="loading"
    >
      {process.env.PORTAL_STARTUP_ENABLED !== "false" ? <StartupGate roles={identity.roles} linearWorkspace={linearWorkspace}>{shell}</StartupGate> : shell}
    </ChatHistoryProvider></WorkspaceProvider>
  );
}
