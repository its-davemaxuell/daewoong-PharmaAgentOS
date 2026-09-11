"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Search } from "./icons/Search";
import { ArrowUp } from "./icons/ArrowUp";
import { ArrowDown } from "./icons/ArrowDown";
import { X } from "./icons/X";

export function ChatFind({ entries }: { entries: Array<{ id: string; text: string }> }) {
  const { text } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim().toLocaleLowerCase();
  const matches = term ? entries.filter(entry => entry.text.toLocaleLowerCase().includes(term)) : [];
  const position = matches.length ? index % matches.length : 0;
  const selected = open ? matches[position]?.id : undefined;
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!selected) return;
    const node = document.getElementById(`chat-turn-${selected}`);
    if (!node) return;
    node.dataset.findMatch = "true";
    // Keep keyboard focus in the find field while moving the conversation only.
    const conversation = node.closest<HTMLElement>(".chat-page__conversation");
    if (conversation) conversation.scrollTo({
      top: conversation.scrollTop + node.getBoundingClientRect().top - conversation.getBoundingClientRect().top - 16,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    return () => { delete node.dataset.findMatch; };
  }, [selected]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const move = (direction: number) => setIndex((position + direction + matches.length) % Math.max(1, matches.length));
  return <div className="chat-find">
    <button ref={trigger} type="button" className="chat-tool-button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Search size={16} />{text("Find in chat", "대화 내 검색")}
    </button>
    {open && <div className="chat-find__bar" role="search" aria-label={text("Find in this conversation", "현재 대화에서 찾기")}>
      <input ref={input} type="search" maxLength={200} value={query} aria-label={text("Find in this chat", "이 대화에서 검색")} placeholder={text("Find a word or phrase…", "단어나 문구 찾기…")}
        onChange={event => { setQuery(event.target.value); setIndex(0); }}
        onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } else if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); move(event.shiftKey ? -1 : 1); } }} />
      <span role="status">{term ? matches.length ? `${position + 1} / ${matches.length}` : text("No matches", "일치 없음") : text("Search messages", "메시지 검색")}</span>
      <button type="button" disabled={!matches.length} onClick={() => move(-1)} aria-label={text("Previous match", "이전 검색 결과")}><ArrowUp size={16} /></button>
      <button type="button" disabled={!matches.length} onClick={() => move(1)} aria-label={text("Next match", "다음 검색 결과")}><ArrowDown size={16} /></button>
      <button type="button" onClick={close} aria-label={text("Close find", "대화 검색 닫기")}><X size={16} /></button>
    </div>}
  </div>;
}
