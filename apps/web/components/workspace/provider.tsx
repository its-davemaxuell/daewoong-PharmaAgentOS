"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { WorkspaceCommands } from "./commands";

const Scope = createContext("");
export function useWorkspaceScope() { return useContext(Scope); }
export function WorkspaceProvider({ subject, children }: { subject: string; children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000, gcTime: 15 * 60_000, retry: 1, refetchOnReconnect: true,
  }, mutations: { retry: false } } }));
  useEffect(() => () => { client.clear(); }, [client]);
  return <Scope.Provider value={subject}><QueryClientProvider client={client}><WorkspaceCommands>{children}</WorkspaceCommands></QueryClientProvider></Scope.Provider>;
}
