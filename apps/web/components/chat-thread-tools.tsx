"use client";

import { Archive } from "@/components/icons/Archive";
import { ArchiveRestore } from "@/components/icons/ArchiveRestore";
import { Check } from "@/components/icons/Check";
import { Download } from "@/components/icons/Download";
import { MoreHorizontal } from "@/components/icons/MoreHorizontal";
import { Pencil } from "@/components/icons/Pencil";
import { Pin } from "@/components/icons/Pin";
import { useEffect, useRef, useState } from "react";
import { downloadChatConversation, manageChatConversation } from "@/app/(portal)/ask/actions";
import { useChatHistory } from "@/components/chat-history-context";
import { useI18n } from "@/lib/i18n";
import type { ChatThreadSummary } from "@/lib/types";

export function ChatThreadTools({ thread, disabled, onChange }: {
  thread: ChatThreadSummary; disabled: boolean; onChange: (thread: ChatThreadSummary) => void;
}) {
  const { text } = useI18n();
  const { upsertThread, removeThread } = useChatHistory();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const update = async (values: { title?: string; pinned?: boolean; archived?: boolean }) => {
    setPending(true); setError(false);
    try {
      const updated = await manageChatConversation(thread.id, values);
      onChange(updated);
      if (updated.archivedAt) removeThread(updated.id); else upsertThread(updated);
      setEditing(false);
      if (menu.current) menu.current.open = false;
    } catch { setError(true); }
    finally { setPending(false); }
  };
  const download = async (format: "markdown" | "json") => {
    setPending(true); setError(false);
    try {
      const result = await downloadChatConversation(thread.id, format);
      const url = URL.createObjectURL(new Blob([result.content], { type: `${result.mediaType};charset=utf-8` }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = result.filename; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (menu.current) menu.current.open = false;
    } catch { setError(true); }
    finally { setPending(false); }
  };
  return <div className="chat-thread-tools">
    {editing ? <form onSubmit={(event) => { event.preventDefault(); void update({ title: title.trim() }); }}>
      <input autoFocus aria-label={text("Conversation title", "대화 제목")} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }} />
      <button type="submit" disabled={pending || !title.trim()} aria-label={text("Save title", "제목 저장")}><Check size={17} /></button>
      <button type="button" onClick={() => setEditing(false)}>{text("Cancel", "취소")}</button>
    </form> : <strong className="chat-thread-tools__title" title={thread.title}>{thread.pinnedAt && <Pin size={14} />}{thread.title}</strong>}
    <details ref={menu} className="chat-thread-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary aria-label={text("Conversation actions", "대화 작업")}><MoreHorizontal size={21} /></summary>
      <div>
        {!thread.archivedAt && <>
          <button disabled={pending || disabled} onClick={() => { setEditing(true); if (menu.current) menu.current.open = false; }}><Pencil size={16} />{text("Rename", "이름 변경")}</button>
          <button disabled={pending || disabled} onClick={() => void update({ pinned: !thread.pinnedAt })}><Pin size={16} />{thread.pinnedAt ? text("Unpin", "고정 해제") : text("Pin conversation", "대화 고정")}</button>
        </>}
        <button disabled={pending || disabled} onClick={() => void download("markdown")}><Download size={16} />{text("Download Markdown", "Markdown 다운로드")}</button>
        <button disabled={pending || disabled} onClick={() => void download("json")}><Download size={16} />{text("Download JSON", "JSON 다운로드")}</button>
        <button disabled={pending || disabled} onClick={() => void update({ archived: !thread.archivedAt })}>
          {thread.archivedAt ? <ArchiveRestore size={16} /> : <Archive size={16} />}{thread.archivedAt ? text("Restore conversation", "대화 복원") : text("Archive conversation", "대화 보관")}
        </button>
      </div>
    </details>
    {error && <span role="alert">{text("Could not save. Try again.", "저장하지 못했어요. 다시 시도하세요.")}</span>}
  </div>;
}
