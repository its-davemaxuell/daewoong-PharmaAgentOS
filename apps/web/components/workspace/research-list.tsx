"use client";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import type { ResearchSummary } from "@/lib/research-types";
import type { WorkspacePage } from "@/lib/workspace-types";
import { setWorkspaceParams } from "@/lib/workspace-client";
import { useWorkspaceScope } from "./provider";
import { ActionButton } from "./commands";
import { WorkspaceErrorState, WorkspaceLoading } from "./primitives";

export function ResearchRunList({ selected }: { selected: string }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const params = useSearchParams();
  const q = params.get("q") || "";
  const status = params.get("status") || "all";
  const cursor = params.get("cursor") || "";
  const query = useQuery({ queryKey: [scope, "research-list", q, status, cursor], queryFn: async ({ signal }): Promise<WorkspacePage<ResearchSummary>> => {
    const response = await fetch(`/api/research?${new URLSearchParams({ q, status, cursor })}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Research list unavailable");
    return response.json();
  }, refetchInterval: data => data.state.data?.items.some(item => ["queued", "running"].includes(item.status)) ? 5000 : false });
  return <aside className="research-run-list" aria-label={text("Research history", "리서치 기록")}>
    <header><h2>{text("Research", "리서치")}</h2><ActionButton actionId="research.new" label={text("New research", "새 리서치")} onClick={() => setWorkspaceParams({ run: null, evidence: null })}>＋</ActionButton></header>
    <input aria-label={text("Search research objectives", "리서치 목표 검색")} placeholder={text("Find an objective…", "조사 목표 찾기…")} value={q} onChange={event => setWorkspaceParams({ q: event.target.value, cursor: null }, true)} />
    <select aria-label={text("Research status", "리서치 상태")} value={status} onChange={event => setWorkspaceParams({ status: event.target.value, cursor: null })}>{[["all", "All", "전체"], ["active", "Active", "진행 중"], ["completed", "Completed", "완료"], ["attention", "Needs attention", "확인 필요"]].map(([id, en, ko]) => <option key={id} value={id}>{text(en, ko)}</option>)}</select>
    {query.isPending ? <WorkspaceLoading /> : query.isError ? <WorkspaceErrorState retry={() => void query.refetch()} /> : <><ul className="workspace-list">{query.data.items.map(run => <li key={run.id}><button aria-current={run.id === selected ? "page" : undefined} onClick={() => setWorkspaceParams({ run: run.id, evidence: null })}><span><strong>{run.objective}</strong><small>{run.status} · {run.updated_at.slice(0, 10)}</small></span></button></li>)}</ul>{!query.data.items.length && <p className="workspace-empty">{text("No matching research tasks", "일치하는 리서치 작업이 없습니다")}</p>}<div className="workspace-pagination"><button disabled={!cursor} onClick={() => setWorkspaceParams({ cursor: null })}>{text("First", "처음")}</button><button disabled={!query.data.has_more} onClick={() => setWorkspaceParams({ cursor: query.data.next_cursor || null })}>{text("More", "더 보기")}</button></div></>}
  </aside>;
}
