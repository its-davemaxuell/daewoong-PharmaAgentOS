"use client";

import Link from "next/link";
import { Archive } from "@/components/icons/Archive";
import { ArchiveRestore } from "@/components/icons/ArchiveRestore";
import { MessageSquare } from "@/components/icons/MessageSquare";
import { Pin } from "@/components/icons/Pin";
import { Search } from "@/components/icons/Search";
import { X } from "@/components/icons/X";
import { useEffect, useRef, useState } from "react";
import { browseChatConversations, manageChatConversation } from "@/app/(portal)/ask/actions";
import { useChatHistory } from "@/components/chat-history-context";
import { useI18n } from "@/lib/i18n";
import type { ChatThreadPage, ChatThreadSummary } from "@/lib/types";
import { SelectionGroup, SelectionIndicator } from "./motion/selection";
import { SkeletonRows } from "./controls";

export function ChatLibrary({ open, onClose, onUpdated }: { open: boolean; onClose: () => void; onUpdated: (thread: ChatThreadSummary) => void }) {
  const { text, locale } = useI18n();
  const { upsertThread, removeThread } = useChatHistory();
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ChatThreadPage>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) { dialog.current?.showModal(); searchInput.current?.focus(); }
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      browseChatConversations(query, page, archived)
        .then((value) => { if (active) setResult(value); })
        .catch(() => { if (active) { setError(true); setResult(undefined); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, page, archived, revision]);

  const manage = async (thread: ChatThreadSummary, values: { pinned?: boolean; archived?: boolean }) => {
    setBusy(thread.id);
    setError(false);
    try {
      const updated = await manageChatConversation(thread.id, values);
      onUpdated(updated);
      if (updated.archivedAt) removeThread(updated.id);
      else upsertThread(updated);
      setRevision((value) => value + 1);
    } catch { setError(true); }
    finally { setBusy(undefined); }
  };

  return (
    <dialog ref={dialog} className="chat-library" inert={!open || undefined} aria-labelledby="chat-library-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => { if (!dialog.current?.open) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]")].filter((element) => element.getClientRects().length);
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="chat-library__inner">
        <header>
          <div><h2 id="chat-library-title">{text("Your conversations", "내 대화")}</h2>
            <p>{text("Saved for this browser session", "이 브라우저 세션에 저장된 대화")}</p></div>
          <button type="button" className="chat-icon-button" onClick={onClose} aria-label={text("Close conversations", "대화 목록 닫기")}><X size={20} /></button>
        </header>
        <label className="chat-library__search"><Search size={19} aria-hidden="true" />
          <input ref={searchInput} type="search" maxLength={200} value={query} aria-label={text("Search conversation titles and messages", "대화 제목 및 메시지 검색")}
            placeholder={text("Search titles and messages…", "제목과 메시지 검색…")}
            onChange={(event) => { setQuery(event.target.value); setPage(1); setLoading(true); }} />
        </label>
        <SelectionGroup><div className="chat-library__tabs" role="group" aria-label={text("Conversation view", "대화 보기")}>
          {[false, true].map((value) => <button key={String(value)} className="ui-selection-control" type="button" aria-pressed={archived === value}
            onClick={() => { setArchived(value); setPage(1); setLoading(true); }}>
            {archived === value && <SelectionIndicator />}
            {value ? <Archive size={16} /> : <MessageSquare size={16} />}
            {value ? text("Archived", "보관됨") : text("Recent & pinned", "최근·고정 대화")}
          </button>)}
        </div></SelectionGroup>
        <div className="chat-library__results" aria-busy={loading}>
          {error ? <div className="chat-library__empty" role="alert"><p>{text("Could not load or update conversations.", "대화를 불러오거나 변경하지 못했어요.")}</p><button type="button" onClick={() => setRevision((value) => value + 1)}>{text("Try again", "다시 시도")}</button></div>
            : loading ? <SkeletonRows rows={3} label={text("Loading conversations…", "대화를 불러오는 중…")} />
            : result?.items.length ? <ul>{result.items.map((thread) => <li key={thread.id}>
              <Link href={`/chat/${thread.id}`} prefetch={false} onClick={onClose}>
                {thread.pinnedAt ? <Pin size={17} aria-label={text("Pinned", "고정됨")} /> : <MessageSquare size={17} aria-hidden="true" />}
                <span><strong>{thread.title}</strong><small>{new Date(thread.lastMessageAt || thread.createdAt).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</small></span>
              </Link>
              {!archived && <button type="button" className="chat-icon-button" disabled={!!busy} aria-pressed={!!thread.pinnedAt}
                aria-label={text(thread.pinnedAt ? "Unpin conversation" : "Pin conversation", thread.pinnedAt ? "대화 고정 해제" : "대화 고정")}
                onClick={() => void manage(thread, { pinned: !thread.pinnedAt })}><Pin size={17} /></button>}
              <button type="button" className="chat-icon-button" disabled={!!busy} aria-label={text(archived ? "Restore conversation" : "Archive conversation", archived ? "대화 복원" : "대화 보관")}
                onClick={() => void manage(thread, { archived: !archived })}>{archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}</button>
            </li>)}</ul>
              : <p className="chat-library__empty">{query ? text("No matching conversations. Try another phrase.", "일치하는 대화가 없어요. 다른 검색어를 입력하세요.") : archived ? text("No archived conversations.", "보관된 대화가 없어요.") : text("Your first conversation will appear here.", "첫 대화를 시작하면 여기에 표시됩니다.")}</p>}
        </div>
        <footer>
          <span>{text("Private to this browser", "이 브라우저에서만 접근 가능")}</span>
          <div><button type="button" disabled={loading || page === 1} onClick={() => { setPage(page - 1); setLoading(true); }}>{text("Previous", "이전")}</button>
            <span>{page}</span><button type="button" disabled={loading || !result?.hasMore} onClick={() => { setPage(page + 1); setLoading(true); }}>{text("Next", "다음")}</button></div>
        </footer>
      </div>
    </dialog>
  );
}
