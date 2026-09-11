"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Letter } from "@/lib/types";
import type { ResearchSource } from "@/lib/research-types";
import { SourceLink } from "../source-link";
import { useI18n } from "@/lib/i18n";
import { useWorkspaceScope } from "./provider";
import { Inspector, WorkspaceErrorState, WorkspaceLoading } from "./primitives";
import { addComparison } from "./comparison-panel";

export async function fetchSource(id: string, signal?: AbortSignal): Promise<Letter> {
  const response = await fetch(`/api/source-preview/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Source unavailable");
  return response.json();
}
export function SourceInspector({ id, source, onClose }: { id: string; source?: ResearchSource; onClose: () => void }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const query = useQuery({ queryKey: [scope, "source", id], queryFn: ({ signal }) => fetchSource(id, signal), enabled: !source });
  const letter = source ? undefined : query.data;
  return <Inspector title={text("Source evidence", "원문 근거")} onClose={onClose}>
    {!source && query.isPending ? <WorkspaceLoading /> : !source && query.isError ? <WorkspaceErrorState retry={() => void query.refetch()} /> : <>
      <p className="workspace-eyebrow">{source ? text("Evidence retained with this research", "리서치에 보존된 근거") : text("Current source record", "현재 원문 기록")}</p>
      <h3>{source?.company ?? letter?.company}</h3>
      <button onClick={() => { onClose(); requestAnimationFrame(() => addComparison(source?.letter_id ?? id)); }}>{text("Compare record", "기록 비교")}</button>
      <p>{letter?.subject}</p>
      <dl className="workspace-metadata"><dt>{text("Version", "버전")}</dt><dd>{source?.version_id ?? letter?.documentVersionId ?? text("Unknown", "알 수 없음")}</dd><dt>{text("Source hash", "원문 해시")}</dt><dd><code>{source?.source_hash ?? letter?.sourceHash ?? text("Unknown", "알 수 없음")}</code></dd>{source && <><dt>{text("Anchor", "원문 위치")}</dt><dd>{source.anchor}</dd></>}</dl>
      {source && <blockquote>{source.excerpt}</blockquote>}
      {!source && letter?.originalSections.slice(0, 2).map(section => <section key={section.anchor}><h3>{section.heading}</h3><p>{section.paragraphs.join("\n").slice(0, 1500)}</p></section>)}
      <div className="workspace-viewbar"><SourceLink href={source?.source_url ?? letter?.sourceUrl}>{text("FDA original", "FDA 원문")}</SourceLink><Link href={`/drug-letters/${id}`} prefetch={false}>{text("Open current full reader", "현재 원문 전체 보기")}</Link></div>
    </>}
  </Inspector>;
}
