"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { letterQueryString, readLetterQuery } from "@/lib/letter-query";
import { sourcePageOptions } from "@/lib/source-queries";
import { useI18n } from "@/lib/i18n";
import { LettersExplorer } from "../letters-explorer";
import { useWorkspaceScope } from "./provider";
import { WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";

export function SourcesWorkspace() {
  const params = useSearchParams();
  // The explorer owns subsequent filter/history changes without remounting.
  const [initialQuery] = useState(() => readLetterQuery(new URLSearchParams(params.toString())));
  const scope = useWorkspaceScope();
  const { text } = useI18n();
  const page = useQuery(sourcePageOptions(scope, letterQueryString(initialQuery)));
  if (page.data) return <LettersExplorer initialPage={page.data.data} mode={page.data.mode} initialState={initialQuery} />;
  return <section className="workspace-page">
    <WorkspaceHeading title={text("Drug Letter Explorer", "의약품 경고서한 탐색기")} />
    {page.isError ? <WorkspaceErrorState retry={() => void page.refetch()} /> : <WorkspaceLoading />}
  </section>;
}
