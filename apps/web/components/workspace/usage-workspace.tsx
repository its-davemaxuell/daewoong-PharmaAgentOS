"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useWorkspaceScope } from "./provider";
import { WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";

import { personalUsageOptions, usageMetrics as metrics } from "@/lib/usage-queries";

export function UsageWorkspace() {
  const { text, locale } = useI18n();
  const scope = useWorkspaceScope();
  const query = useQuery(personalUsageOptions(scope));
  const names = [text("Conversations created", "생성한 대화"), text("Recorded chat requests", "기록된 챗봇 요청"), text("Research tasks created", "생성한 리서치 작업"), text("Research model calls", "리서치 모델 호출"), text("Research tokens", "리서치 토큰")];
  const download = () => {
    if (!query.data) return;
    const content = ["metric,value,scope,since,as_of", ...metrics.map(key => `${key},${query.data![key]},personal,${query.data!.since},${query.data!.as_of}`)].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "pharmaagent-personal-usage.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="workspace-page">
    <WorkspaceHeading title={text("Usage", "사용량")} subtitle={text("Your browser session · Last 30 days", "현재 브라우저 세션 · 최근 30일")}>
      <button className="button button--secondary" disabled={!query.data || query.isError} onClick={download}>{text("Export CSV", "CSV 내보내기")}</button>
    </WorkspaceHeading>
    {query.isPending ? <WorkspaceLoading /> : query.isError ? <WorkspaceErrorState retry={() => void query.refetch()} /> : <>
      <table className="continuity-table"><thead><tr><th>{text("Activity", "활동")}</th><th>{text("Recorded total", "기록된 합계")}</th></tr></thead><tbody>{metrics.map((key, index) => <tr key={key}><td>{names[index]}</td><td>{query.data[key].toLocaleString(locale)}</td></tr>)}</tbody></table>
      <p className="continuity-footnote">{text("As of", "집계 시각")} {new Date(query.data.as_of).toLocaleString(locale)}</p>
    </>}
    <p>{text("Research usage includes the accumulated calls and tokens of tasks created in this period. Chat token usage and billing costs are not currently recorded in this report.", "이 기간에 생성한 리서치 작업의 누적 호출 및 토큰 사용량입니다. 챗봇 토큰 사용량과 청구 비용은 이 보고서에 집계되지 않습니다.")}</p>
    <p className="continuity-footnote">{text("Only your session's activity is included. Team reporting requires company sign-in and an authorized team scope.", "현재 세션의 활동만 포함됩니다. 팀 보고서에는 회사 로그인과 권한이 부여된 팀 범위가 필요합니다.")}</p>
  </section>;
}
