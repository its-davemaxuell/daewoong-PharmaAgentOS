"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useWorkspaceScope } from "./provider";
import { sourcePageOptions } from "@/lib/source-queries";
import { letterQueryString, readLetterQuery } from "@/lib/letter-query";
import {
  inboxOptions,
  researchListOptions,
  savedViewsOptions,
} from "@/lib/workspace-queries";
import { SourceInspector } from "./source-inspector";
import { useState } from "react";
import { openAssistant } from "./assistant-panel";
import { ArrowUpRight } from "../icons/ArrowUpRight";
import { Search } from "../icons/Search";
import { formatDate } from "../ui";
import { WorkspaceErrorState, WorkspaceHeading, WorkspaceLoading } from "./primitives";
import { RESEARCH_DRAFT_KEY } from "@/lib/research-draft";
import { researchStatusLabel } from "@/lib/research-labels";

export function OperationalOverview() {
  const { text, locale } = useI18n();
  const scope = useWorkspaceScope();
  const [selected, setSelected] = useState<string>();
  const sources = useQuery(
    sourcePageOptions(
      scope,
      letterQueryString(readLetterQuery(new URLSearchParams())),
    ),
  );
  const inbox = useQuery(inboxOptions(scope, "new", 1, true));
  const research = useQuery(researchListOptions(scope, "", "active"));
  const saved = useQuery(savedViewsOptions(scope));
  const items = sources.data?.data.items ?? [];
  const topics =
    sources.data?.data.facets.category
      ?.slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) ?? [];
  const metric = (value: number | undefined, more = false) =>
    value === undefined ? "—" : `${value}${more ? "+" : ""}`;
  return (
    <div
      className={`continuity-overview ${selected ? "workspace-has-inspector" : ""}`}
    >
      <WorkspaceHeading title={text("Overview", "개요")} subtitle={text("Start a question, continue your research, or explore FDA sources.", "새 질문을 시작하고, 진행 중인 리서치를 이어가고, FDA 원문을 살펴보세요.")}>
        <Link className="continuity-primary" href="/research">{text("New research", "새 리서치")}<ArrowUpRight size={15} /></Link>
      </WorkspaceHeading>
      <section className="continuity-continue" aria-labelledby="continue-work-title">
        <header><div><h2 id="continue-work-title">{text("Continue your work", "작업 이어가기")}</h2><p>{text("Research is saved as it runs in this browser session.", "이 브라우저 세션에서 실행한 리서치는 진행 중 자동 저장됩니다.")}</p></div><Link href="/research">{text("All research", "전체 리서치")} →</Link></header>
        {research.isPending && <WorkspaceLoading />}
        {research.isError && <WorkspaceErrorState retry={() => void research.refetch()} />}
        <ul className="workspace-list">
          {research.data?.items.slice(0, 3).map(run => <li key={run.id}><Link href={`/research?run=${encodeURIComponent(run.id)}`}><span><strong>{run.objective}</strong><small>{text("Last updated", "최근 업데이트")} · {formatDate(run.updated_at, undefined, locale)}</small></span><span className="workspace-status" data-tone={run.status === "running" ? "active" : "neutral"}>{text(...researchStatusLabel(run.status))}</span><ArrowUpRight size={16} /></Link></li>)}
        </ul>
        {!research.isPending && !research.isError && !research.data?.items.length && <div className="continuity-start"><p>{text("No research in progress. Start with a question about FDA findings.", "진행 중인 리서치가 없습니다. FDA 지적사항에 대한 질문으로 시작하세요.")}</p><div>{[
          ["What do FDA letters say about cleaning validation?", "FDA 경고서한은 세척 밸리데이션에 대해 무엇을 지적하나요?"],
          ["Find recurring data integrity findings.", "반복되는 데이터 완전성 지적사항을 찾아주세요."],
        ].map(([en, ko]) => <Link key={en} href="/research" onClick={() => { try { sessionStorage.setItem(RESEARCH_DRAFT_KEY, text(en, ko)); } catch { /* Research examples remain available if storage is disabled. */ } }}>{text(en, ko)}<ArrowUpRight size={14} /></Link>)}</div></div>}
      </section>
      <div className="continuity-overview-grid">
        <section className="continuity-activity">
          <header>
            <div>
              <h2>{text("New FDA sources", "새 FDA 원문")}</h2>
              <p>
                {text(
                  "Latest retained FDA warning letters",
                  "최근 보존된 FDA 경고서한",
                )}
              </p>
            </div>
            <Link href="/drug-letters">
              {text("All FDA sources", "전체 FDA 원문")} →
            </Link>
          </header>
          {sources.isError && (
            <WorkspaceErrorState retry={() => void sources.refetch()} />
          )}
          {
            <div className="continuity-table-scroll">
              <table className="continuity-table">
                <thead>
                  <tr>
                    <th>{text("Company", "회사")}</th>
                    <th>{text("Topic", "주제")}</th>
                    <th>{text("Issued", "발행일")}</th>
                    <th>{text("Source", "출처")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.isPending
                    ? Array.from({ length: 9 }, (_, i) => (
                        <tr key={i}>
                          <td colSpan={4}>
                            <span className="continuity-skeleton" />
                          </td>
                        </tr>
                      ))
                    : items.slice(0, 9).map((letter) => (
                        <tr
                          key={letter.id}
                          data-selected={selected === letter.id}
                        >
                          <td>
                    <button onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setSelected(letter.id); }}>
                              <strong>{letter.company}</strong>
                            </button>
                          </td>
                          <td>
                            <span className="continuity-topic">
                              {letter.categories[0] ??
                                text("Not classified", "미분류")}
                            </span>
                          </td>
                          <td>
                            {formatDate(
                              letter.issueDate,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                              locale,
                            )}
                          </td>
                          <td>
                            <span className="continuity-source-label">FDA</span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
              {!sources.isPending && !sources.isError && !items.length && (
                <p className="workspace-empty">
                  {text(
                    "No retained letters are available.",
                    "보존된 경고서한이 없습니다.",
                  )}
                </p>
              )}
            </div>
          }
        </section>
        <aside className="continuity-work">
          <section>
            <header><div><h2>{text("Inbox", "받은 자료")}</h2><p>{text("Personal source updates", "나의 원문 업데이트")}</p></div></header>
            <Link className="continuity-work-row" href="/inbox"><span><strong>{text("New to organize", "정리할 새 자료")}</strong><small>{text("Sort updates into New, Later, or Done.", "업데이트를 새 자료, 나중에, 완료로 분류하세요.")}</small></span><b>{metric(inbox.data?.counts.new)}</b></Link>
            <p className="continuity-inbox-note">{text("Organizing your inbox does not approve evidence.", "받은 자료 정리는 근거 승인이 아닙니다.")}</p>
            {inbox.isError && <WorkspaceErrorState retry={() => void inbox.refetch()} />}
          </section>
          <section className="continuity-signals">
            <header>
              <div>
                <h2>
                  {text("Topics in the evidence", "근거 자료의 주요 주제")}
                </h2>
                <p>
                  {text(
                    "Counts across the retained collection",
                    "보존된 자료 전체의 주제별 건수",
                  )}
                </p>
              </div>
            </header>
            {sources.isPending && (
              <p role="status">
                {text("Loading topic counts…", "주제별 건수를 불러오는 중…")}
              </p>
            )}
            {!sources.isPending && !topics.length && (
              <p>
                {sources.isError
                  ? text(
                      "Topic counts are unavailable. Retry the evidence request.",
                      "주제별 건수를 불러오지 못했습니다. 근거 조회를 다시 시도하세요.",
                    )
                  : text(
                      "No topic classifications have been retained yet.",
                      "보존된 주제 분류가 아직 없습니다.",
                    )}
              </p>
            )}
            {topics.map((topic) => (
              <Link
                key={topic.value}
                href={`/drug-letters?category=${encodeURIComponent(topic.value)}`}
              >
                <span>{topic.value}</span>
                <strong>{topic.count}</strong>
                <span
                  className="continuity-signal-bar"
                  style={{
                    width: `${Math.max(4, (topic.count / (topics[0]?.count || 1)) * 100)}%`,
                  }}
                />
              </Link>
            ))}
            <Link className="continuity-text-link" href="/trends">
              {text("Explore regulatory trends", "규제 동향 분석")} →
            </Link>
          </section>
        </aside>
      </div>
      <section
        className="continuity-metrics"
        aria-label={text("Workspace summary", "워크스페이스 요약")}
      >
        {[
          {
            name: text("FDA source records", "FDA 원문 기록"),
            value: metric(sources.data?.data.collectionTotal),
            caption: text("Retained evidence library", "보존된 근거 자료실"),
            href: "/drug-letters",
          },
          {
            name: text("Needs triage", "분류 대기"),
            value: metric(inbox.data?.counts.new),
            caption: text(
              "New source updates to organize",
              "정리할 새 원문 업데이트",
            ),
            href: "/inbox",
          },
          {
            name: text("Active research", "진행 중인 리서치"),
            value: metric(research.data?.items.length, research.data?.has_more),
            caption: text(
              "Continue while research runs",
              "리서치 중에도 다른 작업 가능",
            ),
            href: "/research",
          },
          {
            name: text("Saved sources", "저장한 원문"),
            value: metric(saved.data?.items.length, saved.data?.has_more),
            caption: text("In this browser session", "이 브라우저 세션 기준"),
            href: "/saved-work?tab=sources",
          },
        ].map((item) => (
          <Link href={item.href} key={item.href}>
            <span>
              {item.name}
              <ArrowUpRight size={14} />
            </span>
            <strong>{item.value}</strong>
            <small>{item.caption}</small>
          </Link>
        ))}
      </section>
      {saved.isError && <WorkspaceErrorState retry={() => void saved.refetch()} />}
      <button className="continuity-ask-bar" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); openAssistant(); }}>
        <Search size={18} />
        <span>
          {text(
            "Ask about a company, finding, CFR, or inspection topic…",
            "회사, 지적사항, CFR 또는 실사 주제에 대해 질문하세요…",
          )}
        </span>
        <kbd>⌘ J</kbd>
      </button>
      <p className="continuity-footnote">
        {text(
          "FDA Product: Drugs · AI outputs are drafts for human review.",
          "FDA 제품 분류: 의약품 · AI 결과는 사람이 검토할 초안입니다.",
        )}
      </p>
      {selected && (
        <SourceInspector id={selected} onClose={() => setSelected(undefined)} />
      )}
    </div>
  );
}
