"use client";
import { useI18n } from "@/lib/i18n";

export function SessionNotice() {
  const { text } = useI18n();
  return <details className="session-notice"><summary>{text("30-day browser access · Export important work", "30일 브라우저 세션 · 중요한 작업은 내보내세요")}</summary>
    <p>{text("Conversations, research tasks and saved sources are associated with this browser’s 30-day session. The session is not renewed by activity. Clearing cookies or session expiry can remove access; it does not mean the records were deleted. Export important conversations and briefs before expiry. A new session cannot recover a previous session’s private work. Public sources remain available without an account.", "대화, 리서치 작업, 저장한 원문은 이 브라우저의 30일 세션에 연결됩니다. 사용하더라도 세션 기간은 연장되지 않습니다. 쿠키 삭제 또는 세션 만료 시 접근할 수 없게 될 수 있으며, 기록이 삭제되었다는 뜻은 아닙니다. 만료 전에 중요한 대화와 브리핑을 내보내세요. 새 세션에서는 이전 세션의 개인 작업을 복구할 수 없습니다. 공개 원문은 계정 없이 계속 이용할 수 있습니다.")}</p>
  </details>;
}
