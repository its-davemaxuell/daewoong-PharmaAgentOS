"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Search } from "@/components/icons/Search";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import { useI18n } from "@/lib/i18n";
import type { ExampleGroup, ExampleSummary } from "@/lib/example-types";
import styles from "./examples.module.css";

const groups = [
  ["all", "All examples", "전체 예시"],
  ["workspace", "Chat & research", "대화 및 리서치"],
  ["sources", "Source tools", "원문 도구"],
  ["specialists", "Specialists", "전문 에이전트"],
  ["governance", "Review & operations", "검토 및 운영"],
] as const;

export function ExamplesGallery({ examples }: { examples: ExampleSummary[] }) {
  const { text } = useI18n();
  const [group, setGroup] = useState<ExampleGroup | "all">("all");
  const [query, setQuery] = useState("");
  const filtered = examples.filter(example => (group === "all" || example.group === group) && [...example.title, ...example.description].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <div className={styles.page}>
    <header className={styles.header}>
      <span className={styles.eyebrow}>{text("PUBLIC EXAMPLES", "공개 실행 예시")}</span>
      <h1>{text("See the work, from input to result.", "입력부터 결과까지 확인하세요.")}</h1>
      <p>{text("Explore results produced by the actual service pipelines. Open an example to read its output, follow its evidence, and see how it ran.", "실제 서비스 파이프라인으로 생성한 결과입니다. 예시를 열어 결과, 근거, 실행 과정을 확인하세요.")}</p>
      <div className={styles.legend}>
        <span><i className={styles.liveDot} />{text("Live FDA runs", "실제 FDA 자료 실행")}</span>
        <span><i className={styles.referenceDot} />{text("Synthetic reference runs", "합성 자료 참조 실행")}</span>
      </div>
      <p className={styles.caption}>{text("These shared examples are separate from your private history. Generated drafts have not been approved by a human reviewer.", "공개 예시는 개인 작업 기록과 별도로 제공됩니다. 생성된 초안은 실제 검토자의 승인을 받지 않았습니다.")}</p>
    </header>
    <div className={styles.toolbar}>
      <SelectionGroup><div className={styles.filters} aria-label={text("Example categories", "예시 분류")}>
        {groups.map(([key, en, ko]) => <button key={key} type="button" className="ui-selection-control" aria-pressed={group === key} onClick={() => setGroup(key)}>{group === key && <SelectionIndicator />}{text(en, ko)}</button>)}
      </div></SelectionGroup>
      <label className={styles.search}><Search size={17} /><span className="sr-only">{text("Search examples", "예시 검색")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Find an example", "예시 찾기")} /></label>
    </div>
    <p className={styles.count} aria-live="polite">{filtered.length} {text("examples", "개 예시")}</p>
    <div className={styles.list}>
      {filtered.map((example, index) => <Link className={styles.card} key={example.slug} href={`/examples/${example.slug}`}>
        <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
        <div className={styles.cardBody}>
          <span className={styles.origin} data-origin={example.origin}>{example.origin === "live" ? text("Live FDA run", "실제 FDA 자료 실행") : text("Synthetic demonstration", "합성 자료 시연")}<span> · {example.language === "ko" ? "한국어" : "English"}</span></span>
          <h2>{text(...example.title)}</h2>
          <p>{text(...example.description)}</p>
          <span className={styles.cardMeta}>{example.sourceCount > 0 ? `${example.sourceCount} ${text("source passages", "개 근거 구절")} · ` : ""}{text("View result", "결과 보기")}</span>
        </div>
        <ArrowRight className={styles.arrow} size={20} />
      </Link>)}
    </div>
    {!filtered.length && <div className={styles.empty}><h2>{text("No matching examples", "일치하는 예시가 없습니다")}</h2><p>{text("Try a topic such as quality, research, or verification.", "품질, 리서치, 검증 등의 주제로 검색하세요.")}</p><button type="button" onClick={() => { setQuery(""); setGroup("all"); }}>{text("Show all examples", "전체 예시 보기")}</button></div>}
    <footer className={styles.footer}><p>{text("Your work appears in Overview, Inbox and Saved work after you run and save a task. This area lets you explore the output first.", "작업을 실행하고 저장하면 개요, 받은 자료, 저장한 작업에서 확인할 수 있습니다. 여기에서 결과 형식을 먼저 살펴보세요.")}</p><Link href="/ask">{text("Start your own chat", "새 대화 시작")} <ArrowRight size={16} /></Link></footer>
  </div>;
}
