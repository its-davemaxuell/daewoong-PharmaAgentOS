"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useChatHistory } from "@/components/chat-history-context";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/components/ui";
import type { ResearchSummary } from "@/lib/research-types";
import { readRequests, REQUESTS_KEY, type ReviewRequest } from "@/lib/review-requests";

const researchStates: Record<string, [string, string]> = { queued: ["Queued", "대기 중"], running: ["Running", "진행 중"], completed: ["Brief ready", "브리핑 완료"], stopped: ["Stopped", "중지됨"], failed: ["Failed", "실패"], limit_reached: ["Limit reached", "한도 도달"], insufficient_evidence: ["Insufficient evidence", "근거 부족"] };
export function ContinueWork() {
  const { threads, historyLoadState } = useChatHistory();
  const { text, locale } = useI18n();
  const [research, setResearch] = useState<ResearchSummary[]>([]);
  const [drafts, setDrafts] = useState<ReviewRequest[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const task = setTimeout(() => {
      try { setDrafts(readRequests(localStorage.getItem(REQUESTS_KEY)).slice(0, 2)); } catch { /* A malformed local archive is never presented as saved work. */ }
    }, 0);
    fetch("/api/research", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const payload = await response.json();
      if (!controller.signal.aborted && Array.isArray(payload.items)) setResearch(payload.items.filter((item: ResearchSummary) => typeof item.id === "string" && typeof item.objective === "string" && typeof item.updated_at === "string" && researchStates[item.status]).slice(0, 3));
    }).catch(() => undefined);
    return () => { clearTimeout(task); controller.abort(); };
  }, []);
  const chats = historyLoadState === "ready" ? threads.filter(item => !item.archivedAt).slice(0, 2) : [];
  if (!chats.length && !research.length && !drafts.length) return null;
  return <section className="continue-work" aria-labelledby="continue-heading"><h2 id="continue-heading">{text("Continue working", "이어서 작업하기")}</h2><ul>
    {research.map(item => <li key={item.id}><Link href={`/research?run=${encodeURIComponent(item.id)}`}><strong>{item.objective}</strong><span>{text("Research task", "리서치 작업")} · {text(...researchStates[item.status])} · {formatDate(item.updated_at, undefined, locale)}</span></Link></li>)}
    {chats.map(item => <li key={item.id}><Link href={`/chat/${encodeURIComponent(item.id)}`}><strong>{item.title}</strong><span>{text("Conversation", "대화")} · {text("Saved", "저장됨")} · {formatDate(item.updatedAt, undefined, locale)}</span></Link></li>)}
    {drafts.map(item => <li key={item.id}><Link href="/requests#saved-requests"><strong>{item.objective}</strong><span>{text("Personal draft · Not submitted", "개인 초안 · 미제출")} · {formatDate(item.updatedAt, undefined, locale)}</span></Link></li>)}
  </ul></section>;
}
