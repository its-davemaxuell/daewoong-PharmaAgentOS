"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { WorkspaceCommands } from "./commands";

import type { AppRole } from "@/lib/auth-types";

const Scope = createContext("");
export function useWorkspaceScope() { return useContext(Scope); }
export function WorkspaceProvider({ subject, roles = [], linearWorkspace = true, children }: { subject: string; roles?: AppRole[]; linearWorkspace?: boolean; children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000, gcTime: 15 * 60_000, retry: 1, refetchOnReconnect: true,
  }, mutations: { retry: false } } }));
  useEffect(() => () => { client.clear(); }, [client]);
  return <Scope.Provider value={subject}><QueryClientProvider client={client}><WorkspaceCommands roles={roles} linearWorkspace={linearWorkspace}>{children}</WorkspaceCommands></QueryClientProvider></Scope.Provider>;
}
