"use client";
import { cancelViewFade, changeView } from "@/components/motion/view-fade";

import Link from "@/components/motion/workspace-link";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import { useContextArrival } from "@/components/motion/use-context-arrival";
import { useI18n } from "@/lib/i18n";
import type { PublicExample } from "@/lib/example-types";
import styles from "./examples.module.css";

export function ExampleDetail({ example }: { example: PublicExample }) {
  const { text } = useI18n();
  const [view, setView] = useState<"result" | "evidence" | "run">("result");
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [compare, setCompare] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const pendingSource = useRef<string | null>(null);
  const resultRef = useContextArrival<HTMLDivElement>(`${index}:${showAll}`, true);
  const reference = example.origin === "reference";
  const selectedSection = example.sections[index];
  const original = example.sources.find(source => selectedSection.sourceIds?.includes(source.id));
  const serviceHref = example.slug.startsWith("research-") ? "/research" : example.slug === "corpus-trends" ? "/trends" : example.slug === "source-search" ? "/search" : example.group === "sources" ? "/drug-letters" : reference ? "/requests" : "/ask";
  const inspectSource = (id: string) => {
    changeView(() => { pendingSource.current = id; setSourceQuery(""); setView("evidence"); });
  };
  useLayoutEffect(() => {
    if (view === "evidence" && pendingSource.current) {
      const target = document.getElementById(`source-${pendingSource.current}`);
      if (target instanceof HTMLDetailsElement) { target.open = true; target.querySelector("summary")?.focus(); }
      pendingSource.current = null;
    }
  }, [view, sourceQuery]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([
        example.title[0], reference ? "Synthetic demonstration · simulated reviewers · no human approval" : "Public FDA example · draft for human review",
        ...example.sections.map(section => [section.title, section.text, ...(section.items || [])].filter(Boolean).join("\n")),
        ...example.limitations, ...example.sources.map(source => `[${source.id}] ${source.label}\n${source.url || source.anchor || "Fictional source"}\n${source.excerpt}`),
      ].join("\n\n")); setCopyState("copied");
    } catch { setCopyState("failed"); }
  };
  return <article className={styles.page}>
    <Link className={styles.back} href="/examples">← {text("All examples", "전체 예시")}</Link>
    <header className={styles.detailHeader}>
      <span className={styles.origin} data-origin={example.origin}>{reference ? text("SYNTHETIC DEMONSTRATION", "합성 자료 시연") : text("PUBLIC FDA RESULT", "공개 FDA 자료 실행 결과")}</span><h1>{text(...example.title)}</h1>
      <div className={styles.metadata}><span>{example.language === "ko" ? "한국어" : "English"}</span><time dateTime={example.executedAt}>{example.executedAt.slice(0, 10)} UTC</time><span>{reference ? text("Simulated reviews · Unapproved draft", "검토 시뮬레이션 · 미승인 초안") : text("Draft for human review", "담당자 검토용 초안")}</span></div>
    </header>
    <div className={styles.readerToolbar}>
      <SelectionGroup><div className={styles.filters} aria-label={text("Result views", "결과 보기 방식")}>{([['result', text("Result", "결과")], ['evidence', `${text("Evidence", "근거")} ${example.sources.length}`], ['run', text("Run details", "실행 정보")]] as const).map(([key, label]) => <button className="ui-selection-control" type="button" key={key} aria-pressed={view === key} aria-controls={`example-${key}-view`} onClick={() => { if (view !== key) changeView(() => setView(key)); else cancelViewFade(); }}>{view === key && <SelectionIndicator />}{label}</button>)}</div></SelectionGroup>
      <a className={styles.downloadLink} href={example.download} download>{text("Download result JSON", "결과 JSON 다운로드")} ↓</a>
    </div>
    <div id="example-result-view" hidden={view !== "result"}>
      <details className={styles.inputDisclosure}><summary>{text("Show input", "입력 내용 보기")}</summary><p>{example.input}</p></details>
      <section className={styles.readerResult} aria-labelledby="example-result-heading">
        <div className={styles.resultHeading}><h2 id="example-result-heading">{text("The result", "실행 결과")}</h2><button type="button" onClick={copy}>{copyState === "copied" ? text("Copied", "복사됨") : text("Copy result", "결과 복사")}</button></div>
        <span role="status" className={copyState === "failed" ? styles.copyError : "sr-only"}>{copyState === "failed" ? text("Copy unavailable. Use Download JSON.", "복사할 수 없습니다. JSON 다운로드를 사용하세요.") : copyState === "copied" ? text("Result copied to clipboard.", "결과가 클립보드에 복사되었습니다.") : ""}</span>
        {example.sections.length > 1 && <div className={styles.sectionControls}>
          <label><span className="sr-only">{text("Result section", "결과 구간")}</span><select value={index} disabled={showAll} onChange={event => { const value = Number(event.target.value); changeView(() => setIndex(value), resultRef.current); }}>{example.sections.map((section, i) => <option key={i} value={i}>{i + 1}. {section.title}</option>)}</select></label>
          <div className={styles.paging}><button type="button" aria-label={text("Previous section", "이전 구간")} disabled={showAll || index === 0} onClick={() => changeView(() => setIndex(index - 1), resultRef.current)}>←</button><span aria-live="polite">{showAll ? text("All", "전체") : `${index + 1} / ${example.sections.length}`}</span><button type="button" aria-label={text("Next section", "다음 구간")} disabled={showAll || index === example.sections.length - 1} onClick={() => changeView(() => setIndex(index + 1), resultRef.current)}>→</button></div>
          <button type="button" aria-pressed={showAll} onClick={() => changeView(() => setShowAll(!showAll), resultRef.current)}>{text("Complete output", "전체 결과")}</button>
          {example.slug === "document-translation" && <button type="button" disabled={showAll} aria-pressed={compare} onClick={() => setCompare(!compare)}>{text("Compare original", "원문 대조")}</button>}
        </div>}
        <div ref={resultRef} className={compare && !showAll ? styles.comparison : undefined}>
          <div lang={example.language} className={styles.prose}>{(showAll ? example.sections : [selectedSection]).map((section, i) => <section key={i}><h3>{section.title}</h3>{section.text && <p>{section.text}</p>}{section.items && <ul>{section.items.map((item, n) => <li key={n}>{item}</li>)}</ul>}{section.sourceIds && <div className={styles.sourceRefs} aria-label={text("Source references", "근거 참조")}>{section.sourceIds.map(id => <a key={id} href={`#source-${id}`} onClick={event => { event.preventDefault(); inspectSource(id); }}>{text("Source", "근거")} {id}</a>)}</div>}</section>)}</div>
          {compare && !showAll && original && <aside className={styles.original}><h3>{text("FDA original", "FDA 원문")}</h3><blockquote lang="en">{original.excerpt}</blockquote></aside>}
        </div>
      </section>
    </div>
    <section id="example-evidence-view" className={styles.sources} hidden={view !== "evidence"} aria-labelledby="example-evidence-heading">
      <h2 id="example-evidence-heading">{text("Source evidence", "원문 근거")}</h2>
      {example.sources.length ? <label className={styles.search}><span className="sr-only">{text("Find in evidence", "근거 내 검색")}</span><input type="search" value={sourceQuery} onChange={event => setSourceQuery(event.target.value)} placeholder={text("Company, passage or source ID", "회사, 구절 또는 근거 ID")} /></label> : <p>{text("This service returned no source passages. Inspect its run details or download.", "이 서비스는 근거 구절을 반환하지 않았습니다. 실행 정보 또는 다운로드를 확인하세요.")}</p>}
      {example.sources.map((source, i) => <details key={`${source.id}-${i}`} id={`source-${source.id}`} hidden={![source.id, source.label, source.excerpt, source.anchor].join(" ").toLowerCase().includes(sourceQuery.toLowerCase())}><summary><span className={styles.sourceId}>{source.id}</span><span>{source.label}<small>{source.anchor}</small></span></summary><div className={styles.sourceBody}><blockquote>{source.excerpt}</blockquote>{source.url && <a href={source.url} target="_blank" rel="noreferrer">{text("Open FDA source", "FDA 원문 열기")} ↗</a>}{source.version && <p>{text("Source version", "원문 버전")}: {source.version}</p>}{source.hash && <details className={styles.hash}><summary>{text("Source fingerprint", "원문 해시")}</summary><code>{source.hash}</code></details>}</div></details>)}
      {example.sources.length > 0 && !example.sources.some(source => [source.id, source.label, source.excerpt, source.anchor].join(" ").toLowerCase().includes(sourceQuery.toLowerCase())) && <p role="status">{text("No matching passages", "일치하는 근거가 없습니다")} <button type="button" onClick={() => setSourceQuery("")}>{text("Clear search", "검색 지우기")}</button></p>}
    </section>
    <section id="example-run-view" className={styles.runView} hidden={view !== "run"}>
      <div><h2>{text("The input", "입력 내용")}</h2><p className={styles.runInput}>{example.input}</p><h2>{text("How it ran", "실행 과정")}</h2><ol className={styles.timeline}>{example.steps.map((step, i) => <li key={i}><strong>{step.label}</strong>{step.detail && <p>{step.detail}</p>}</li>)}</ol><p className={styles.caption}>{example.method}</p></div>
      <div><h2>{text("Reading this result", "결과를 읽는 방법")}</h2>{reference && <p className={styles.caption}>{text("Fictional documents and simulated reviewers. This run does not qualify production execution or constitute human approval.", "가상 문서와 시뮬레이션 검토자를 사용했습니다. 운영 적격성 평가나 실제 담당자 승인이 아닙니다.")}</p>}<ul className={styles.limits}>{example.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul><details className={styles.hash}><summary>{text("Run provenance", "실행 출처")}</summary>{example.recordId && <p>{text("Record", "기록")}: <code>{example.recordId}</code></p>}<p>SHA-256</p><code>{example.sha256}</code></details></div>
    </section>
    <footer className={styles.readerFooter}><Link className={styles.try} href={serviceHref}>{reference ? text("Prepare your review draft", "검토 초안 작성") : text("Open this service", "서비스 열기")}<ArrowRight size={17} /></Link><span className={styles.caption}>{text("Retained result · Check current sources before use", "보존된 결과 · 사용 전 최신 원문 확인")}</span></footer>
  </article>;
}
