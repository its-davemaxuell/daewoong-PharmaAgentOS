"use client";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { setWorkspaceParams, workspaceJson, WorkspaceError } from "@/lib/workspace-client";
import type { InboxPage, TriageState } from "@/lib/workspace-types";
import { useWorkspaceScope } from "./provider";
import { ActionButton } from "./commands";
import { Pagination, WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";
import { SourceInspector } from "./source-inspector";

export function InboxWorkspace() {
  const params = useSearchParams();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const { text } = useI18n();
  const state = params.get("state") || "new";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const source = params.get("source");
  const [selection, setSelection] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingState, setPendingState] = useState<TriageState>();
  const [reason, setReason] = useState("");
  const [dismiss, setDismiss] = useState(false);
  const [feedback, setFeedback] = useState("");
  const result = useQuery({ queryKey: [scope, "inbox", state, page], queryFn: ({ signal }) => workspaceJson<InboxPage>(`workspace/inbox?state=${encodeURIComponent(state)}&page=${page}`, { signal }) });
  const labels: Record<string, string> = { new: text("New", "신규"), later: text("Later", "나중에"), done: text("Done", "완료"), dismissed: text("Dismissed", "제외됨"), all: text("All", "전체") };
  const selected = (result.data?.items ?? []).filter(item => selection.includes(item.id));
  async function apply(next: TriageState) {
    if (pending || !selected.length) return;
    if (next === "dismissed" && (!dismiss || reason.trim().length < 3)) { setDismiss(true); return; }
    setPending(true); setPendingState(next); setFeedback("");
    let count = 0;
    try {
      for (const item of selected) {
        await workspaceJson(`workspace/inbox/${item.id}`, { method: "PATCH", body: JSON.stringify({ state: next, reason: next === "dismissed" ? reason : "", expected_revision: item.revision }) });
        count += 1;
      }
      setFeedback(text(`${count} personal triage decisions saved.`, `개인 분류 ${count}건이 저장되었습니다.`));
      setSelection([]); setDismiss(false); setReason("");
    } catch (error) { setFeedback(error instanceof WorkspaceError && error.status === 409 ? text(`${count} saved. Another edit changed an item; refresh and select it again.`, `${count}건 저장됨. 다른 수정으로 항목이 변경되었습니다. 새로 선택하세요.`) : text(`${count} saved. The remaining changes could not be saved. Retry after refreshing.`, `${count}건 저장됨. 나머지 변경을 저장하지 못했습니다. 새로고침 후 다시 시도하세요.`)); }
    finally { await client.invalidateQueries({ queryKey: [scope, "inbox"] }); setPending(false); }
  }
  return <section className="workspace-page"><WorkspaceHeading title={text("Inbox", "수신함")} subtitle={text("Personal source triage · Separate from formal review and approval", "개인 원문 분류 · 공식 검토 및 승인과 별도")} />
    <div className="workspace-viewbar" aria-label={text("Inbox views", "수신함 보기")}>{Object.entries(labels).map(([id, label]) => <button key={id} aria-pressed={state === id} disabled={pending} onClick={() => { setSelection([]); setWorkspaceParams({ state: id, page: null }); }}>{label}{id !== "all" && result.data ? ` ${result.data.counts[id as TriageState] ?? 0}` : ""}</button>)}</div>
    {selected.length > 0 && <div className="workspace-bulk"><span>{text(`${selected.length} selected on this page`, `현재 페이지에서 ${selected.length}건 선택`)}</span>{(["new", "later", "done", "dismissed"] as const).map(next => <ActionButton key={next} actionId={`inbox.${next}`} label={labels[next]} disabled={pending} onClick={() => void apply(next)}>{labels[next]}</ActionButton>)}{pending && <span role="status">{text("Saving…", "저장 중…")}</span>}{dismiss && <label>{text("Dismissal reason", "제외 사유")}<input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /><button disabled={reason.trim().length < 3 || pending} onClick={() => void apply("dismissed")}>{text("Confirm dismissal", "제외 확인")}</button></label>}</div>}
    {feedback && <p className="workspace-feedback" role="status">{feedback}</p>}
    {result.isPending ? <WorkspaceLoading /> : result.isError ? <WorkspaceErrorState retry={() => void result.refetch()} /> : <>
      {!result.data.items.length ? <div className="workspace-empty">{text("No source changes in this view. Older sources remain in the library.", "이 보기에 원문 변경이 없습니다. 이전 자료는 자료실에서 확인하세요.")}</div> : <ul className="workspace-list">{result.data.items.map(item => <li key={item.id} className="workspace-selectable"><input type="checkbox" disabled={pending} aria-label={text(`Select ${item.title}`, `${item.title} 선택`)} checked={selection.includes(item.id)} onChange={event => setSelection(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><button onClick={event => { event.currentTarget.focus({ preventScroll: true }); setWorkspaceParams({ source: item.letter_id }); }}><span><strong>{item.title}</strong><small>{item.event_type} · {item.subtitle}</small>{item.reason && <small>{item.reason}</small>}</span><span className="workspace-state">{pending && selection.includes(item.id) && pendingState ? `${text("Saving", "저장 중")} · ${labels[pendingState]}` : labels[item.state]}</span></button></li>)}</ul>}
      <Pagination page={page} hasMore={result.data.has_more} onChange={next => { setSelection([]); setWorkspaceParams({ page: String(next) }); }} />
    </>}
    {source && <SourceInspector id={source} onClose={() => setWorkspaceParams({ source: null })} />}
  </section>;
}
