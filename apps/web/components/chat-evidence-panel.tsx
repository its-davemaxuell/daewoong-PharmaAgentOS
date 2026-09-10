"use client";

import { useIsPresent } from "motion/react";
import Link from "next/link";
import { SourceLink } from "@/components/source-link";
import { ExternalLink, FileText, Pin, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { IconButton } from "./controls";
import { PresenceSurface } from "./motion/presence";
import { SelectionGroup, SelectionIndicator } from "./motion/selection";
import type { RagCitation } from "@/lib/types";

export function ChatEvidencePanel({ citations, selected, onSelect, onClose, onFocus, disabled, focusedLetterId }: {
  citations: RagCitation[]; selected: number; onSelect: (index: number) => void;
  onClose: () => void; onFocus: (citation: RagCitation) => void; disabled: boolean; focusedLetterId?: string;
}) {
  const { text, locale } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const present = useIsPresent();
  useEffect(() => { if (present) heading.current?.focus(); }, [present]);
  const citation = citations[selected] ?? citations[0];
  if (!citation) return null;
  return <PresenceSurface as="aside" direction="side" className="chat-evidence-panel" aria-labelledby="evidence-panel-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header><div><span>{text("Evidence", "근거 자료")}</span><h2 id="evidence-panel-title" ref={heading} tabIndex={-1}>{text("Read the source", "원문 확인")}</h2></div>
      <IconButton onClick={onClose} label={text("Close evidence panel", "근거 패널 닫기")}><X size={20} /></IconButton></header>
    <SelectionGroup><nav className="chat-evidence-panel__tabs" aria-label={text("Answer sources", "답변 출처")}>
      {citations.map((source, index) => <button key={source.id} className="ui-selection-control" type="button" aria-pressed={index === selected} onClick={() => onSelect(index)} aria-label={text(`Source ${index + 1}: ${source.company}`, `출처 ${index + 1}: ${source.company}`)}>{index === selected && <SelectionIndicator />}{index + 1}</button>)}
    </nav></SelectionGroup>
    <div className="chat-evidence-panel__body">
      <span className="chat-evidence-panel__label">FDA · {text("Warning letter", "경고서한")}</span>
      <h3>{citation.title || citation.company}</h3>
      <p>{citation.company}{citation.issueDate ? ` · ${new Date(citation.issueDate).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")}` : ""}</p>
      <div className="chat-evidence-panel__passage"><h4>{text("Cited passage", "인용 원문")}</h4><blockquote lang="en">{citation.excerpt}</blockquote></div>
      <dl><div><dt>{text("Location", "위치")}</dt><dd>{citation.anchor}</dd></div>
        <div><dt>{text("Source version", "원문 버전")}</dt><dd>{citation.sourceVersion || citation.documentVersionId || text("Version metadata unavailable", "버전 정보 없음")}</dd></div>
        {citation.sourceHash && <div><dt>SHA-256</dt><dd><code>{citation.sourceHash}</code></dd></div>}
      </dl>
    </div>
    <footer>
      <button className="chat-evidence-panel__focus" type="button" disabled={disabled || focusedLetterId === citation.letterId} onClick={() => onFocus(citation)}><Pin size={17} />{focusedLetterId === citation.letterId ? text("Main document selected", "기준 문서로 선택됨") : text("Use as main document", "대화 기준 문서로 사용")}</button>
      <div><Link href={`/drug-letters/${citation.letterId}`}><FileText size={16} />{text("Letter details", "서한 상세")}</Link><SourceLink href={citation.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />FDA.gov</SourceLink></div>
    </footer>
  </PresenceSurface>;
}
