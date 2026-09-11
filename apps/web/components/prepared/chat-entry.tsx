"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChatWorkspace } from "../chat-workspace";
import { useWorkspaceScope } from "../workspace/provider";
import { WorkspaceLoading } from "../workspace/primitives";
import { sourcePageOptions } from "@/lib/source-queries";
import { letterQueryString, readLetterQuery } from "@/lib/letter-query";
import { fetchSource } from "../workspace/source-inspector";

export function ChatEntry() {
  const params = useSearchParams();
  const scope = useWorkspaceScope();
  const initialLetterId = params.get("letter") || undefined;
  const requestedSeed = params.get("new")?.slice(0, 128);
  const [seed, setSeed] = useState(requestedSeed);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (requestedSeed) { setSeed(requestedSeed); return; }
      const next = crypto.randomUUID();
      const url = new URL(window.location.href);
      url.searchParams.set("new", next);
      window.history.replaceState(null, "", url);
      setSeed(next);
    }, 0);
    return () => clearTimeout(timer);
  }, [requestedSeed]);
  const catalogue = useQuery(sourcePageOptions(scope, letterQueryString(readLetterQuery(new URLSearchParams()))));
  const selected = useQuery({ queryKey: [scope, "source", initialLetterId], queryFn: ({ signal }) => fetchSource(initialLetterId!, signal), enabled: Boolean(initialLetterId) });
  if (!seed || catalogue.isPending || (initialLetterId && selected.isPending)) return <WorkspaceLoading />;
  const letters = [...(catalogue.data?.data.items ?? [])];
  if (selected.data && !letters.some(letter => letter.id === selected.data.id)) letters.push(selected.data);
  return <ChatWorkspace key={seed} letters={letters} facets={catalogue.data?.data.facets ?? {}} dataMode={catalogue.data?.mode ?? "seeded"} initialLetterId={initialLetterId} initialCompany={params.get("company") || undefined} initialStarter={params.get("starter") || undefined} landingSeed={seed} />;
}
