"use client";
import { SelectionGroup, SelectionIndicator } from "../motion/selection";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { briefListOptions, savedViewsOptions } from "@/lib/workspace-queries";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { setWorkspaceParams, workspaceJson, WorkspaceError } from "@/lib/workspace-client";
import type { BriefSnapshot, SavedWorkspaceView } from "@/lib/workspace-types";
import { FindingSupport } from "../research/finding";
import { SourceLink } from "../source-link";
import { useWorkspaceScope } from "./provider";
import { ActionButton } from "./commands";
import { Inspector, Pagination, WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";

export function SavedWorkspace() {
  const params = useSearchParams();
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const tab = params.get("tab") || "briefs";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const cursor = params.get("cursor") || "";
  const brief = params.get("brief");
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<SavedWorkspaceView>();
  const [busy, setBusy] = useState<string>();
  const briefs = useQuery({ ...briefListOptions(scope, page), enabled: tab === "briefs" });
  const views = useQuery({ ...savedViewsOptions(scope, tab, cursor), enabled: tab === "sources" || tab === "views" });
  async function remove(id: string) {
    setBusy(id); setError(false);
    try { await workspaceJson(`saved-views/${id}`, { method: "DELETE" }); await client.invalidateQueries({ queryKey: [scope, "views"] }); await client.invalidateQueries({ queryKey: [scope, "menu", "saved-views"] }); await client.invalidateQueries({ queryKey: [scope, "bookmark"] }); await client.invalidateQueries({ queryKey: [scope, "bookmark-page"] }); }
    catch { setError(true); } finally { setBusy(undefined); }
  }
  const tabs = [["briefs", text("Briefs", "브리핑")], ["sources", text("Sources", "자료")], ["views", text("Saved views", "저장한 보기")], ["drafts", text("Local drafts", "기기 내 초안")]];
  return <section className="workspace-page"><WorkspaceHeading title={text("Saved work", "저장한 작업")} subtitle={text("Brief snapshots, sources, and reusable views in this browser session.", "이 브라우저 세션의 브리핑 스냅샷, 원문 및 저장한 보기입니다.")} />
    <SelectionGroup><div className="workspace-viewbar">{tabs.map(([id, label]) => <button className="ui-selection-control" key={id} aria-pressed={tab === id} onClick={() => setWorkspaceParams({ tab: id, page: null, cursor: null, brief: null })}>{tab === id && <SelectionIndicator tone="tinted" />}{label}</button>)}</div></SelectionGroup>
    {error && <p className="workspace-feedback" role="alert">{text("Could not remove the saved item. Please try again.", "저장 항목을 제거하지 못했습니다. 다시 시도하세요.")}</p>}
    {tab === "drafts" ? <div className="workspace-empty"><p>{text("Review drafts remain stored on this device. They are separate from server-saved brief snapshots.", "검토 초안은 이 기기에 저장되며 서버의 브리핑 스냅샷과 별도입니다.")}</p><Link href="/requests">{text("Open local drafts", "기기 내 초안 열기")}</Link></div> : tab === "briefs" ? briefs.isPending ? <WorkspaceLoading /> : !briefs.data ? <WorkspaceErrorState retry={() => void briefs.refetch()} /> : <>{briefs.isError && <WorkspaceErrorState retry={() => void briefs.refetch()} />}
      {!briefs.data.items.length && <div className="workspace-empty">{text("Save a completed research brief to retain its exact evidence and content.", "완료된 리서치 브리핑을 저장하여 근거와 내용을 그대로 보존하세요.")} <Link href="/research">{text("Open Research", "리서치 열기")}</Link></div>}
      <ul className="workspace-list">{briefs.data.items.map(item => <li key={item.id}><button onClick={event => { event.currentTarget.focus({ preventScroll: true }); setWorkspaceParams({ brief: item.id }); }}><span><strong>{item.title}</strong><small>{text("Draft snapshot", "초안 스냅샷")} · {item.created_at.slice(0, 10)}</small></span><span>↗</span></button></li>)}</ul><Pagination page={page} hasMore={briefs.data.has_more} onChange={next => setWorkspaceParams({ page: String(next) })} />
    </> : views.isPending ? <WorkspaceLoading /> : !views.data ? <WorkspaceErrorState retry={() => void views.refetch()} /> : <>{views.isError && <WorkspaceErrorState retry={() => void views.refetch()} />}
      <ul className="workspace-list">{views.data.items.filter(item => (item.view_kind === "source_bookmark" || item.name.startsWith("Drug letter bookmark:")) === (tab === "sources")).map(item => <li key={item.id}><Link href={item.open_url} prefetch={false}><span><strong>{tab === "sources" ? item.description || item.name : item.name}</strong><small>{tab === "views" ? text(`${item.result_count} matching sources`, `일치하는 원문 ${item.result_count}건`) : text("Saved source", "저장한 원문")}</small></span></Link>{tab === "views" && <button onClick={event => { event.currentTarget.focus({ preventScroll: true }); setEditing(item); }}>{text("Edit", "편집")}</button>}<button disabled={Boolean(busy)} onClick={() => void remove(item.id)}>{busy === item.id ? text("Removing…", "제거 중…") : text("Remove", "제거")}</button></li>)}</ul>
      {!views.data.items.some(item => (item.view_kind === "source_bookmark" || item.name.startsWith("Drug letter bookmark:")) === (tab === "sources")) && <div className="workspace-empty">{text("No saved items on this page. Save a source or a filter view in Sources.", "이 페이지에 저장 항목이 없습니다. 자료 화면에서 원문이나 필터 보기를 저장하세요.")}</div>}
      <div className="workspace-pagination"><button disabled={!cursor} onClick={() => setWorkspaceParams({ cursor: null })}>{text("First page", "첫 페이지")}</button><button disabled={!views.data.has_more} onClick={() => setWorkspaceParams({ cursor: views.data.next_cursor || null })}>{text("Next page", "다음 페이지")}</button></div>
    </>}
    {editing && <ViewEditor key={editing.id} view={editing} onClose={() => setEditing(undefined)} />}
    {brief && <BriefInspector id={brief} onClose={() => setWorkspaceParams({ brief: null })} />}
  </section>;
}
function BriefInspector({ id, onClose }: { id: string; onClose: () => void }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const [feedback, setFeedback] = useState("");
  const result = useQuery({ queryKey: [scope, "brief", id], queryFn: ({ signal }) => workspaceJson<BriefSnapshot>(`research/briefs/${id}`, { signal }) });
  return <Inspector title={text("Saved brief", "저장한 브리핑")} onClose={onClose}>
    {result.isPending ? <WorkspaceLoading /> : result.isError ? <WorkspaceErrorState retry={() => void result.refetch()} /> : <>
      <p className="workspace-eyebrow">{text("Immutable snapshot · Draft for human review", "변경 불가 스냅샷 · 사람 검토용 초안")}</p><h3>{result.data.title}</h3>
      <div className="workspace-viewbar"><ActionButton actionId="brief.copy" label={text("Copy brief", "브리핑 복사")} onClick={() => { void navigator.clipboard.writeText(JSON.stringify(result.data.snapshot, null, 2)).then(() => setFeedback(text("Copied", "복사됨"))).catch(() => setFeedback(text("Copy failed. Use Export.", "복사 실패. 내보내기를 사용하세요."))); }} /><a href={`/api/workspace/research/briefs/${id}/export`}>{text("Export JSON", "JSON 내보내기")}</a><Link href={`/research?run=${result.data.run_id}`}>{text("Original run", "원래 작업")}</Link></div>
      <p role="status">{feedback}</p><ol>{result.data.snapshot.result.findings?.map((finding, index) => <li key={index}><FindingSupport finding={finding} /><p>{finding.statement}</p><small>{finding.citation_ids.join(", ")}</small></li>)}</ol>
      <h3>{text("Review questions", "검토 질문")}</h3><ul>{result.data.snapshot.result.review_questions?.map(item => <li key={item}>{item}</li>)}</ul>
      <h3>{text("Limitations", "한계")}</h3><ul>{result.data.snapshot.result.limitations?.map(item => <li key={item}>{item}</li>)}</ul>
      <h3>{text("Retained evidence", "보존된 근거")}</h3>{result.data.snapshot.result.sources?.map(source => <details key={source.id}><summary>{source.id} · {source.company}</summary><blockquote>{source.excerpt}</blockquote><p>{source.version_id} · {source.anchor}</p><code>{source.source_hash}</code><p><SourceLink href={source.source_url}>{text("FDA original", "FDA 원문")}</SourceLink></p></details>)}
      <details className="workspace-provenance"><summary>{text("Snapshot provenance", "스냅샷 출처 정보")}</summary><p>{text("Snapshot hash", "스냅샷 해시")}</p><code>{result.data.content_hash}</code></details>
    </>}
  </Inspector>;
}

function ViewEditor({ view, onClose }: { view: SavedWorkspaceView; onClose: () => void }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const [name, setName] = useState(view.name);
  const [description, setDescription] = useState(view.description);
  const [sort, setSort] = useState(view.display?.sort || "posted-desc");
  const [pageSize, setPageSize] = useState(view.display?.pageSize || 20);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try {
      await workspaceJson(`saved-views/${view.id}`, { method: "PATCH", body: JSON.stringify({ name, description, display: { sort, pageSize }, expected_revision: view.revision }) });
      await client.invalidateQueries({ queryKey: [scope, "views"] });
      onClose();
    } catch (error) {
      setMessage(error instanceof WorkspaceError && error.status === 409 ? text("This view changed elsewhere. Your edits are retained here. Close and reopen the editor to load its latest version.", "다른 곳에서 보기가 변경되었습니다. 입력한 내용은 유지됩니다. 편집기를 닫고 다시 열어 최신 버전을 확인하세요.") : text("Could not save. Check the name and try again.", "저장하지 못했습니다. 이름을 확인하고 다시 시도하세요."));
      await client.invalidateQueries({ queryKey: [scope, "views"] });
    } finally { setBusy(false); }
  }
  return <Inspector title={text("Edit saved view", "저장한 보기 편집")} onClose={onClose}>
    <form className="workspace-view-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>{text("Name", "이름")}<input required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>{text("Description", "설명")}<input maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>{text("Sort", "정렬")}<select value={sort} onChange={event => setSort(event.target.value)}><option value="posted-desc">{text("Posted · newest", "게시일 · 최신순")}</option><option value="posted-asc">{text("Posted · oldest", "게시일 · 오래된순")}</option><option value="issued-desc">{text("Issued · newest", "발행일 · 최신순")}</option><option value="company-asc">{text("Company · A–Z", "회사명 · 가나다/A–Z")}</option></select></label>
      <label>{text("Rows per page", "페이지당 행")}<select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>{[20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <p>{text("Filters are retained. Open this view in Sources to adjust its filters and save a new view.", "필터는 유지됩니다. 자료에서 이 보기를 열어 필터를 조정하고 새 보기로 저장할 수 있습니다.")}</p>
      <ActionButton actionId="view.update" label={busy ? text("Saving…", "저장 중…") : text("Save changes", "변경 내용 저장")} disabled={busy || !name.trim()} onClick={() => void save()} />
      {message && <p role="alert">{message}</p>}
    </form>
  </Inspector>;
}
