"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { setWorkspaceParams, workspaceJson } from "@/lib/workspace-client";
import type { SearchPage } from "@/lib/workspace-types";
import { useWorkspaceScope } from "./provider";
import { Pagination, WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";

export function SearchWorkspace() {
  const params = useSearchParams();
  const scope = useWorkspaceScope();
  const { text } = useI18n();
  const q = params.get("q") || "";
  const kind = params.get("kind") || "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [input, setInput] = useState(q);
  const [previousQ, setPreviousQ] = useState(q);
  if (previousQ !== q) { setPreviousQ(q); setInput(q); }
  useEffect(() => {
    const restore = () => setInput(new URLSearchParams(window.location.search).get("q") || "");
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => { const timer = setTimeout(() => { if (input !== q) setWorkspaceParams({ q: input, page: null }, true); }, 250); return () => clearTimeout(timer); }, [input, q]);
  const result = useQuery({ queryKey: [scope, "search", q, kind, page], queryFn: ({ signal }) => workspaceJson<SearchPage>(`workspace/search?${new URLSearchParams({ q, kind, page: String(page) })}`, { signal }), enabled: Boolean(q.trim()) });
  const labels: Record<string, string> = { all: text("All", "전체"), sources: text("Sources", "자료"), research: text("Research", "리서치"), briefs: text("Briefs", "브리핑"), views: text("Saved views", "저장한 보기"), chats: text("Chats", "대화") };
  return <section className="workspace-page"><WorkspaceHeading title={text("Search workspace", "워크스페이스 검색")} subtitle={text("Find titles and metadata across your work.", "작업의 제목과 메타데이터를 검색하세요.")} />
    <div className="workspace-viewbar"><input aria-label={text("Search workspace", "워크스페이스 검색")} placeholder={text("Company, objective, brief, or conversation…", "회사, 조사 목표, 브리핑 또는 대화…")} value={input} maxLength={500} onChange={event => setInput(event.target.value)} /><select aria-label={text("Search scope", "검색 범위")} value={kind} onChange={event => setWorkspaceParams({ kind: event.target.value, page: null })}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
    {!q.trim() ? <div className="workspace-empty">{text("Enter a title or keyword to find your work.", "제목이나 키워드로 작업을 찾아보세요.")}</div> : result.isPending ? <WorkspaceLoading /> : result.isError ? <WorkspaceErrorState retry={() => void result.refetch()} /> : <>
      {result.data.groups.every(group => !group.items.length) && <div className="workspace-empty">{text("No matching titles. Try a different keyword.", "일치하는 제목이 없습니다. 다른 키워드를 입력하세요.")}</div>}
      {result.data.groups.filter(group => group.items.length).map(group => <section key={group.kind} className="workspace-collection"><header><h2>{labels[group.kind]}</h2>{kind === "all" && group.has_more && <Link href={`/search?${new URLSearchParams({ q, kind: group.kind })}`}>{text("View all", "전체 보기")}</Link>}</header><ul className="workspace-list">{group.items.map(item => <li key={item.id}><Link href={item.href} prefetch={false}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><span aria-hidden>↗</span></Link></li>)}</ul></section>)}
      {kind !== "all" && <Pagination page={page} hasMore={result.data.groups.some(group => group.has_more)} onChange={next => setWorkspaceParams({ page: String(next) })} />}
    </>}
  </section>;
}
