import type { RagAnswer } from "./types";
import { trustedFdaUrl } from "./evidence-state";

/** Copy only a finalized answer, preserving the numbered evidence references. */
export function answerWithSources(answer: RagAnswer, locale: "en" | "ko") {
  const sources = answer.citations.map((citation, index) =>
    `[${index + 1}] ${citation.company} — ${citation.title}\n${trustedFdaUrl(citation.sourceUrl) ?? (locale === "ko" ? "원문 링크 없음" : "Source link unavailable")}\n${citation.anchor}${citation.documentVersionId ? ` · ${citation.documentVersionId}` : ""}`,
  );
  return [answer.answer, ...(sources.length ? [locale === "ko" ? "출처" : "Sources", sources.join("\n\n")] : []),
    locale === "ko" ? "AI 답변 · 공식 원문 대조 및 담당자 검토 필요" : "AI answer · Verify against official sources and obtain human review",
  ].join("\n\n");
}
