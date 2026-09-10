"use client";

import type { ComponentProps } from "react";
import { trustedFdaUrl } from "@/lib/evidence-state";
import { useI18n } from "@/lib/i18n";

export function SourceLink({ href, children, ...props }: ComponentProps<"a">) {
  const { text } = useI18n();
  const url = trustedFdaUrl(href);
  return url ? <a {...props} href={url} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span title={text("The original document URL is missing or invalid.", "원문 문서 주소가 없거나 올바르지 않습니다.")}>{text("Source link unavailable", "원문 링크 없음")}</span>;
}
