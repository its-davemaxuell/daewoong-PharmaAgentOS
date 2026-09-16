"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Search } from "@/components/icons/Search";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import { useContextArrival } from "@/components/motion/use-context-arrival";
import { useI18n } from "@/lib/i18n";
import type { ExampleGroup, ExampleSummary } from "@/lib/example-types";
import { ExamplePreview } from "./example-preview";
import styles from "./examples.module.css";

const groups = [
  ["all", "All examples", "전체 예시"], ["workspace", "Chat & research", "대화 및 리서치"],
  ["sources", "Source tools", "원문 도구"], ["specialists", "Specialists", "전문 에이전트"],
  ["governance", "Review & operations", "검토 및 운영"],
] as const;

export function ExamplesGallery({ examples }: { examples: ExampleSummary[] }) {
  const { text } = useI18n();
  const [group, setGroup] = useState<ExampleGroup | "all">("all");
  const [origin, setOrigin] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(examples[0]?.slug);
  const filtered = examples.filter(example => (group === "all" || example.group === group) && (origin === "all" || example.origin === origin) && [...example.title, ...example.description].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const active = filtered.find(example => example.slug === selected) ?? filtered[0];
  const previewRef = useContextArrival<HTMLDivElement>(active?.slug ?? "", true);
  return <div className={styles.page}>
    <header className={styles.galleryHeader}><div><span className={styles.eyebrow}>{text("PUBLIC EXAMPLES", "공개 실행 예시")}</span><h1>{text("Explore real results.", "실제 결과를 살펴보세요.")}</h1><p className={styles.caption}>{text("Shared examples · Separate from private history · Unapproved drafts", "공개 예시 · 개인 기록과 별도 · 미승인 초안")}</p></div><Link className={styles.try} href="/research">{text("Start your research", "새 리서치")}<ArrowRight size={17} /></Link></header>
    <SelectionGroup><div className={styles.filters} aria-label={text("Example categories", "예시 분류")}>{groups.map(([key, en, ko]) => <button key={key} type="button" className="ui-selection-control" aria-pressed={group === key} onClick={() => setGroup(key)}>{group === key && <SelectionIndicator />}{text(en, ko)}</button>)}</div></SelectionGroup>
    <div className={styles.browseTools}>
      <label className={styles.search}><Search size={17} /><span className="sr-only">{text("Search examples", "예시 검색")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Find an example", "예시 찾기")} /></label>
      <label className={styles.originSelect}><span className="sr-only">{text("Example origin", "실행 자료 유형")}</span><select value={origin} onChange={event => setOrigin(event.target.value)}><option value="all">{text("All runs", "모든 실행")}</option><option value="live">{text("Public FDA sources", "공개 FDA 자료")}</option><option value="reference">{text("Synthetic demonstrations", "합성 자료 시연")}</option></select></label>
      <span className={styles.caption} role="status">{filtered.length} {text("examples", "개 예시")}</span>
    </div>
    {active ? <div className={styles.browseGrid}>
      <nav className={styles.resultList} aria-label={text("Choose a result", "실행 결과 선택")}>
        {filtered.map(example => <div className={styles.resultRow} data-selected={active.slug === example.slug} key={example.slug}>
          <button type="button" aria-pressed={active.slug === example.slug} aria-controls="example-preview" onClick={() => setSelected(example.slug)}><span className={styles.origin} data-origin={example.origin}>{example.origin === "live" ? text("FDA", "FDA 자료") : text("Synthetic", "합성 자료")} · {example.language === "ko" ? "한국어" : "English"}</span><strong>{text(...example.title)}</strong></button>
          <Link href={`/examples/${example.slug}`} aria-label={`${text("Open", "열기")}: ${text(...example.title)}`}><ArrowRight size={18} /></Link>
        </div>)}
      </nav>
      <div id="example-preview" ref={previewRef}><ExamplePreview example={active} /></div>
    </div> : <div className={styles.empty}><h2>{text("No matching examples", "일치하는 예시가 없습니다")}</h2><button type="button" onClick={() => { setQuery(""); setGroup("all"); setOrigin("all"); }}>{text("Show all examples", "전체 예시 보기")}</button></div>}
  </div>;
}
