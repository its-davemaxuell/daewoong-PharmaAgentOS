"use client";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import Link from "next/link";
import type { ApprovalCenterItem } from "@/lib/governance-api-client";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/components/ui";
import styles from "./governance.module.css";

export const reviewLabels = {
  PENDING: ["Awaiting review", "검토 대기"], APPROVED: ["Approved", "승인됨"], REJECTED: ["Rejected", "반려됨"],
  CANCELLED: ["Cancelled", "취소됨"], EXPIRED: ["Expired", "만료됨"],
  PLAN_APPROVAL: ["Review research plan", "리서치 계획 검토"], STEP_APPROVAL: ["Review execution step", "실행 단계 검토"],
  ARTIFACT_APPROVAL: ["Review draft version", "초안 버전 검토"],
} as const;

export function ApprovalsWorkspace({ items, status }: { items: ApprovalCenterItem[]; status?: string }) {
  const { text, locale } = useI18n();
  const label = (value: string) => {
    const pair = reviewLabels[value as keyof typeof reviewLabels];
    return pair ? text(pair[0], pair[1]) : text("Status unavailable", "상태 정보 없음");
  };
  return <div className={styles.page}>
    <header><h1>{text("Approvals", "승인")}</h1><p>{text("Open a request to inspect its sources and the exact version before recording a decision. Authorized reviewers complete decisions in the case workspace.", "판단을 기록하기 전에 요청을 열어 근거와 정확한 버전을 확인하세요. 권한이 있는 검토자가 검토 기록 화면에서 판단을 완료합니다.")}</p></header>
    <SelectionGroup><nav className={styles.filters} aria-label={text("Review filters", "검토 필터")}>
      {[undefined, "PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].map(value => <Link className="ui-selection-control" prefetch={false} key={value ?? "all"} href={value ? `/approvals?status=${value}` : "/approvals"} data-active={status === value} aria-current={status === value ? "page" : undefined}>{status === value && <SelectionIndicator />}{value ? label(value) : text("All requests", "모든 요청")}</Link>)}
    </nav></SelectionGroup>
    <section className={styles.section} aria-labelledby="review-count"><h2 id="review-count">{text(`${items.length} review requests`, `검토 요청 ${items.length}건`)}</h2>
      {!items.length ? <div className={styles.card}><h3>{status ? text("No requests match this filter", "이 조건에 맞는 요청이 없습니다") : text("No review requests yet", "아직 검토 요청이 없습니다")}</h3><p>{text("Saved personal drafts do not enter this queue until an authorized team review is created.", "저장한 개인 초안은 권한이 있는 팀 검토가 생성되기 전까지 이 목록에 표시되지 않습니다.")}</p><Link prefetch={false} className="button button--secondary" href={status ? "/approvals" : "/requests"}>{status ? text("View all requests", "모든 요청 보기") : text("Prepare a review draft", "검토 초안 작성")}</Link></div> :
      <div className={styles.approvalList}>{items.map(item => <article key={item.id} className={styles.approvalCard} data-status={(item.expired ? "EXPIRED" : item.status).toLowerCase()}>
        <div><span>{label(item.approvalType)}</span><h3>{item.caseTitle}</h3><p>{text("Requested by", "요청자")} {item.requestedBy}</p><p>{text("Requested", "요청일")} {formatDate(item.createdAt, undefined, locale)} · {text("Expires", "만료일")} {formatDate(item.expiresAt, undefined, locale)}</p></div>
        <strong>{label(item.expired ? "EXPIRED" : item.status)}</strong>
        <Link prefetch={false} className="button button--secondary" href={`/cases/${encodeURIComponent(item.caseId)}?view=${item.approvalType === "STEP_APPROVAL" ? "execution" : item.approvalType === "ARTIFACT_APPROVAL" ? "review" : "plan"}`}>{text("Open review", "검토 열기")}</Link>
        <details className={styles.approvalDetails}><summary>{text("Source and plan details", "원문 및 계획 상세 정보")}</summary><dl><dt>{text("Plan version", "계획 버전")}</dt><dd>{item.planVersion}</dd><dt>{text("Plan hash", "계획 해시")}</dt><dd><code>{item.planSha256}</code></dd><dt>{text("Bound state", "검토 대상 상태")}</dt><dd><code>{item.boundStateHash}</code></dd>{item.artifactVersionId ? <><dt>{text("Draft version", "초안 버전")}</dt><dd><code>{item.artifactVersionId}</code></dd></> : null}</dl></details>
      </article>)}</div>}
    </section>
  </div>;
}
