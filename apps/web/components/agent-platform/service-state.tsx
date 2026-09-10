"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { RefreshCw } from "@/components/icons/RefreshCw";
import { Unplug } from "@/components/icons/Unplug";
import { useI18n } from "@/lib/i18n";
import { useTransition } from "react";
import { ReviewButton } from "@/components/review-button";
import type { ProblemKind } from "@/lib/api-problem";

const surfaces = {
  cases: [
    "Team review records",
    "팀 검토 기록",
    "Track a review from its objective through specialist work and the final human decision.",
    "검토 목표부터 전문가 작업, 최종 판단까지 하나의 흐름으로 살펴봅니다.",
  ],
  approvals: [
    "Human review",
    "사람의 검토",
    "Inspect agent plans and review packages at the points where a human decision is required.",
    "사람의 판단이 필요한 지점에서 에이전트 계획과 검토 자료를 확인합니다.",
  ],
  evaluations: [
    "Agent evaluations",
    "에이전트 평가",
    "Inspect evaluation definitions, trial records, and release evidence for each agent version.",
    "에이전트 버전별 평가 정의, 시험 기록, 릴리스 근거를 확인합니다.",
  ],
  operations: [
    "Agent operations",
    "에이전트 운영 현황",
    "Follow execution health, agent inventory, and controls for governed work.",
    "실행 상태, 에이전트 목록, 작업 통제를 함께 살펴봅니다.",
  ],
} as const;

export function ServiceState({
  surface,
  restricted = false,
  requestId,
  kind,
}: {
  surface: keyof typeof surfaces;
  restricted?: boolean;
  requestId?: string;
  kind?: ProblemKind;
}) {
  const { text } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  restricted = restricted || kind === "restricted";
  const problemCopy = kind === "not-found" ? ["This review resource was not found. Return to the review list or prepare a draft.", "검토 자료를 찾을 수 없습니다. 검토 목록으로 돌아가거나 초안을 작성하세요."]
    : kind === "rate-limited" ? ["Too many requests. Wait briefly, then check again. Your work is retained.", "요청이 많습니다. 잠시 후 다시 확인하세요. 작업은 유지됩니다."]
    : kind === "invalid-response" ? ["The service returned incomplete review data. Check again or share the request ID with support.", "서비스가 불완전한 검토 데이터를 반환했습니다. 다시 확인하거나 요청 ID를 담당자에게 전달하세요."]
    : kind === "not-configured" ? ["This review service is not configured. You can prepare a personal draft while setup is completed.", "검토 서비스가 설정되지 않았습니다. 설정이 완료될 때까지 개인 초안을 작성할 수 있습니다."] : undefined;
  const content = surfaces[surface];
  return (
    <section className="os-service-state">
      <header>
        <h1>{text(content[0], content[1])}</h1>
        <p>{text(content[2], content[3])}</p>
      </header>
      <div className="os-service-state__body">
        <Unplug size={30} aria-hidden="true" />
        <h2>
          {restricted
            ? text(
                "A reviewer needs to handle this step",
                "검토 담당자의 권한이 필요한 단계입니다",
              )
            : text(
                "We couldn’t load these review records",
                "검토 기록을 불러오지 못했어요",
              )}
        </h2>
        <p>
          {restricted
            ? text(
                "You can prepare a request without signing in. Approval and review actions are reserved for authorized staff.",
                "로그인 없이 검토 요청을 준비할 수 있습니다. 승인과 정식 검토는 권한이 있는 담당자가 진행합니다.",
              )
            : problemCopy ? text(problemCopy[0], problemCopy[1]) : text(
                "The review service is currently unavailable. You can still write, save, and download a review draft.",
                "현재 검토 기록 서비스에 연결할 수 없습니다. 검토 초안은 작성하고 저장하거나 다운로드할 수 있습니다.",
              )}
        </p>
        <div className="os-service-state__actions">
          <Link className="button button--primary" href="/requests">
            {text("Prepare a request", "검토 요청 작성하기")}
            <ArrowRight size={16} />
          </Link>
          <ReviewButton
            pending={pending}
            pendingLabel={text("Checking…", "확인 중…")}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw size={15} />
            {text("Check again", "다시 확인")}
          </ReviewButton>
        </div>
        <p><Link href="/help#availability">{text("See available features and next steps", "이용 가능한 기능과 다음 단계 보기")}</Link></p>
        {requestId ? <details><summary>{text("Support details", "문의 시 참고 정보")}</summary><small>Request ID: {requestId}</small></details> : null}
      </div>
    </section>
  );
}
