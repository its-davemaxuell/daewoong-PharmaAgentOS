"use client";
import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { researchListOptions } from "@/lib/workspace-queries";
import { setWorkspaceParams } from "@/lib/workspace-client";
import { useWorkspaceScope } from "./provider";
import { ActionButton } from "./commands";
import { WorkspaceErrorState, WorkspaceLoading } from "./primitives";

import { researchStatusLabel } from "@/lib/research-labels";

export function ResearchRunList({ selected }: { selected: string }) {
  const { text } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const historyId = useId();
  const scope = useWorkspaceScope();
  const params = useSearchParams();
  const q = params.get("q") || "";
  const status = params.get("status") || "all";
  const cursor = params.get("cursor") || "";
  const query = useQuery({ ...researchListOptions(scope, q, status, cursor), refetchInterval: data => data.state.data?.items.some(item => ["queued", "running"].includes(item.status)) ? 5000 : false });
  return <aside className="research-run-list" data-expanded={expanded} aria-label={text("Research history", "리서치 기록")}>
    <header><h2>{text("Research history", "리서치 기록")}</h2><button className="research-history-toggle" aria-expanded={expanded} aria-controls={historyId} onClick={() => setExpanded(value => !value)}>{expanded ? text("Hide history", "기록 접기") : text("Show history", "기록 펼치기")}</button><ActionButton actionId="research.new" label={text("New research", "새 리서치")} onClick={() => setWorkspaceParams({ run: null, evidence: null })}>＋</ActionButton></header>
    <div className="research-history-body" id={historyId}>
    <input aria-label={text("Search research objectives", "리서치 목표 검색")} placeholder={text("Find an objective…", "조사 목표 찾기…")} value={q} onChange={event => setWorkspaceParams({ q: event.target.value, cursor: null }, true)} />
    <select aria-label={text("Research status", "리서치 상태")} value={status} onChange={event => setWorkspaceParams({ status: event.target.value, cursor: null })}>{[["all", "All", "전체"], ["active", "Active", "진행 중"], ["completed", "Completed", "완료"], ["attention", "Needs attention", "확인 필요"]].map(([id, en, ko]) => <option key={id} value={id}>{text(en, ko)}</option>)}</select>
    {query.isPending ? <WorkspaceLoading /> : !query.data ? <WorkspaceErrorState retry={() => void query.refetch()} /> : <>{query.isError && <WorkspaceErrorState retry={() => void query.refetch()} />}<ul className="workspace-list">{query.data.items.map(run => <li key={run.id}><button aria-current={run.id === selected ? "page" : undefined} onClick={() => setWorkspaceParams({ run: run.id, evidence: null })}><span><strong>{run.objective}</strong><small>{text(...researchStatusLabel(run.status))} · {run.updated_at.slice(0, 10)}</small></span></button></li>)}</ul>{!query.data.items.length && <p className="workspace-empty">{text("No matching research tasks", "일치하는 리서치 작업이 없습니다")}</p>}<div className="workspace-pagination"><button disabled={!cursor} onClick={() => setWorkspaceParams({ cursor: null })}>{text("First", "처음")}</button><button disabled={!query.data.has_more} onClick={() => setWorkspaceParams({ cursor: query.data.next_cursor || null })}>{text("More", "더 보기")}</button></div></>}
    </div>
  </aside>;
}
