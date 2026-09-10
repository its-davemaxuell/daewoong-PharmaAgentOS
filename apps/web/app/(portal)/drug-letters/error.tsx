"use client";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n";
import { ReviewButton } from "@/components/review-button";
export default function LibraryError({ reset }: { reset: () => void }) {
  const { text } = useI18n();
  const [pending, startTransition] = useTransition();
  return <section className="os-service-state"><h1>{text("Could not load the library", "자료를 불러오지 못했습니다")}</h1><p>{text("Your filters remain in the page address. Retry without entering them again.", "검색 조건은 페이지 주소에 유지됩니다. 다시 입력하지 않고 재시도할 수 있습니다.")}</p><ReviewButton pending={pending} pendingLabel={text("Retrying…", "다시 불러오는 중…")} onClick={() => startTransition(reset)}>{text("Retry", "다시 시도")}</ReviewButton></section>;
}
