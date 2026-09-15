"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { useI18n } from "@/lib/i18n";
import type { PublicExample } from "@/lib/example-types";
import styles from "./examples.module.css";

export function ExampleDetail({ example }: { example: PublicExample }) {
  const { text } = useI18n();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const reference = example.origin === "reference";
  const serviceHref = example.slug.startsWith("research-") ? "/research" : example.slug === "corpus-trends" ? "/trends" : example.slug === "source-search" ? "/search" : example.group === "sources" ? "/drug-letters" : reference ? "/requests" : "/ask";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([
        example.title[0],
        reference ? "Synthetic demonstration · simulated reviewers · no human approval" : "Public FDA example · draft for human review",
        ...example.sections.map(section => [section.title, section.text, ...(section.items || [])].filter(Boolean).join("\n")),
        ...example.limitations,
        ...example.sources.map(source => `[${source.id}] ${source.label}\n${source.url || source.anchor || "Fictional source"}\n${source.excerpt}`),
      ].join("\n\n"));
      setCopyState("copied");
    } catch { setCopyState("failed"); }
  };
  return <article className={styles.page}>
    <Link className={styles.back} href="/examples">← {text("All examples", "전체 예시")}</Link>
    <header className={styles.detailHeader}>
      <span className={styles.origin} data-origin={example.origin}>{reference ? text("SYNTHETIC DEMONSTRATION", "합성 자료 시연") : text("LIVE FDA PIPELINE RESULT", "실제 FDA 파이프라인 결과")}</span>
      <h1>{text(...example.title)}</h1>
      <p>{text(...example.description)}</p>
      <div className={styles.metadata}><span>{text("Output language", "결과 언어")}: {example.language === "ko" ? "한국어" : "English"}</span><time dateTime={example.executedAt}>{example.executedAt.slice(0, 10)} UTC</time><span>{example.status}</span></div>
    </header>
    <div className={styles.notice}>{reference ? text("Fictional source and internal documents. Real application services executed in an isolated demonstration. Reviewer actions were simulated; this is not independent human approval or production qualification.", "가상의 원문과 내부 문서를 사용해 격리된 환경에서 실제 서비스를 실행했습니다. 검토자 동작은 시뮬레이션이며 실제 독립 검토자의 승인이나 운영 적격성 평가가 아닙니다.") : text("Generated from public FDA evidence. This retained result is a draft for human review and may not reflect later source changes.", "공개 FDA 근거로 생성한 검토용 초안입니다. 보존된 결과이므로 이후 원문 변경 사항이 반영되지 않을 수 있습니다.")}</div>
    <div className={styles.detailGrid}>
      <div className={styles.resultColumn}>
        <section className={styles.input}><h2>{text("The input", "입력 내용")}</h2><p lang={example.language}>{example.input}</p></section>
        <section className={styles.result} aria-labelledby="example-result-heading">
          <div className={styles.resultHeading}><h2 id="example-result-heading">{text("The result", "실행 결과")}</h2><button type="button" onClick={copy}>{copyState === "copied" ? text("Copied", "복사됨") : text("Copy result", "결과 복사")}</button></div>
          <span role="status" className={copyState === "failed" ? styles.copyError : "sr-only"}>{copyState === "failed" ? text("Copy unavailable. Use Download JSON below.", "복사할 수 없습니다. 아래 JSON 다운로드를 사용하세요.") : copyState === "copied" ? text("Result copied to clipboard.", "결과가 클립보드에 복사되었습니다.") : ""}</span>
          <div lang={example.language} className={styles.prose}>{example.sections.map((section, index) => <section key={index}><h3>{section.title}</h3>{section.text && <p>{section.text}</p>}{section.items && <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul>}{section.sourceIds && <div className={styles.sourceRefs} aria-label={text("Source references", "근거 참조")}>{section.sourceIds.map(id => <a key={id} href={`#source-${id}`} onClick={() => { const target = document.getElementById(`source-${id}`); if (target instanceof HTMLDetailsElement) target.open = true; }}>{text("Source", "근거")} {id}</a>)}</div>}</section>)}</div>
        </section>
        {example.sources.length > 0 && <section className={styles.sources} aria-labelledby="example-evidence-heading"><h2 id="example-evidence-heading">{text("Source evidence", "원문 근거")}</h2><p className={styles.caption}>{text("Citation identifiers correspond to the retained output. Open a passage to inspect its exact text and version.", "인용 식별자는 보존된 결과와 대응합니다. 구절을 열어 정확한 원문과 버전을 확인하세요.")}</p>{example.sources.map((source, i) => <details key={`${source.id}-${i}`} id={`source-${source.id}`}><summary><span className={styles.sourceId}>{source.id}</span><span>{source.label}<small>{source.anchor}</small></span></summary><div className={styles.sourceBody}><blockquote>{source.excerpt}</blockquote>{source.url && <a href={source.url} target="_blank" rel="noreferrer">{text("Open FDA source", "FDA 원문 열기")} ↗</a>}{source.version && <p>{text("Source version", "원문 버전")}: {source.version}</p>}{source.hash && <details className={styles.hash}><summary>{text("Source fingerprint", "원문 해시")}</summary><code>{source.hash}</code></details>}</div></details>)}</section>}
      </div>
      <aside className={styles.aside}>
        <section><h2>{text("How it ran", "실행 과정")}</h2><ol className={styles.timeline}>{example.steps.map((step, i) => <li key={i}><strong>{step.label}</strong>{step.detail && <p>{step.detail}</p>}</li>)}</ol><p className={styles.caption}>{example.method}</p></section>
        <section><h2>{text("Reading this result", "결과를 읽는 방법")}</h2><ul className={styles.limits}>{example.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul></section>
        <section className={styles.download}><a href={example.download} download>{text("Download result JSON", "결과 JSON 다운로드")} ↓</a><details className={styles.hash}><summary>{text("Run provenance", "실행 출처")}</summary>{example.recordId && <p>{text("Record", "기록")}: <code>{example.recordId}</code></p>}<p>SHA-256</p><code>{example.sha256}</code></details></section>
        <Link className={styles.try} href={serviceHref}>{reference ? text("Prepare your review draft", "검토 초안 작성") : text("Open this service", "서비스 열기")}<ArrowRight size={17} /></Link>
      </aside>
    </div>
  </article>;
}
