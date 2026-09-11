"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResearchSource } from "@/lib/research-types";
import { isContextSource } from "@/lib/research-validation";
export type ContextSource = Omit<ResearchSource, "id">;
export function ContextPicker({ selected, onChange, disabled }: {
  selected: ContextSource[]; onChange: (sources: ContextSource[]) => void; disabled: boolean;
}) {
  const { text } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContextSource[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  async function search() {
    if (query.trim().length < 2 || status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch(`/api/research/context?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Context unavailable");
      const body = await response.json();
      if (!Array.isArray(body.items) || !body.items.every(isContextSource)) throw new Error("Invalid context");
      setResults(body.items); setStatus("ready");
    } catch { setStatus("error"); }
  }
  return <fieldset disabled={disabled} className="research-context">
    <legend>{text("Evidence context", "근거 범위")}</legend>
    <p>{selected.length ? text("Only selected passages will be used. Selection is fixed when research starts.", "선택한 문단만 사용합니다. 리서치 시작 시 선택 내용이 고정됩니다.") : text("Search all accessible FDA sources, or select up to 12 passages.", "접근 가능한 모든 FDA 자료를 검색하거나 문단을 최대 12개 선택하세요.")}</p>
    {!!selected.length && <ul>{selected.map(source => <li key={source.chunk_id}><span>{source.company} · v{source.version} · {source.anchor}</span><button type="button" onClick={() => onChange(selected.filter(item => item.chunk_id !== source.chunk_id))} aria-label={text(`Remove ${source.company} ${source.anchor}`, `${source.company} ${source.anchor} 제외`)}>{text("Remove", "제외")}</button></li>)}</ul>}
    <details><summary>{text("Select source passages", "원문 문단 선택")}</summary>
      <label htmlFor="research-context-search">{text("Find evidence", "근거 검색")}</label>
      <div className="workspace-viewbar"><input id="research-context-search" value={query} maxLength={180} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void search(); } }} /><button type="button" disabled={query.trim().length < 2 || status === "loading"} onClick={() => void search()}>{text("Search", "검색")}</button></div>
      {status === "loading" && <p role="status">{text("Finding passages…", "문단 검색 중…")}</p>}
      {status === "error" && <p role="alert">{text("Search failed. Your selection is retained; try again.", "검색하지 못했습니다. 선택 내용은 유지됩니다. 다시 시도하세요.")}</p>}
      {status === "ready" && !results.length && <p role="status">{text("No matching passages. Try another term.", "일치하는 문단이 없습니다. 다른 검색어를 사용하세요.")}</p>}
      {results.map(source => <article key={source.chunk_id}><strong>{source.company}</strong><small> · v{source.version} · {source.anchor}</small><p>{source.excerpt}</p><button type="button" disabled={selected.length >= 12 || selected.some(item => item.chunk_id === source.chunk_id)} onClick={() => onChange([...selected, source])}>{selected.some(item => item.chunk_id === source.chunk_id) ? text("Selected", "선택됨") : text("Include passage", "문단 포함")}</button></article>)}
    </details>
  </fieldset>;
}
