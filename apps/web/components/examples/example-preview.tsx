"use client";

import Link from "@/components/motion/workspace-link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { useI18n } from "@/lib/i18n";
import type { ExampleSummary } from "@/lib/example-types";
import styles from "./examples.module.css";

/** A visible excerpt of a retained result, never a simulated active run. */
export function ExamplePreview({ example }: { example: ExampleSummary }) {
  const { text } = useI18n();
  return <div className={styles.preview} data-example-preview={example.slug}>
    <div className={styles.previewMeta}><span className={styles.origin} data-origin={example.origin}>{example.origin === "reference" ? text("Synthetic run · Simulated reviews · Unapproved", "합성 자료 실행 · 검토 시뮬레이션 · 미승인") : text("FDA result · Review draft", "FDA 실행 결과 · 검토용 초안")}</span><span>{example.language === "ko" ? "한국어" : "English"}</span></div>
    <h2>{text(...example.title)}</h2>
    <div className={styles.previewPaper} lang={example.language}>
      <strong>{example.preview.title}</strong>
      <div className={styles.previewExcerpt}>{example.preview.text && <p>{example.preview.text}</p>}{example.preview.items && <ul>{example.preview.items.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul>}</div>
    </div>
    <div className={styles.previewActions}><span>{text("Result preview", "실행 결과 미리보기")}{example.sourceCount ? ` · ${example.sourceCount} ${text("sources", "개 근거")}` : ""}</span><Link href={`/examples/${example.slug}`}>{text("Open full result", "전체 결과 열기")}<ArrowRight size={17} /></Link></div>
  </div>;
}
