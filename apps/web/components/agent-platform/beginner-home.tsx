"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, SkeletonRows } from "@/components/controls";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ArrowUpRight } from "@/components/icons/ArrowUpRight";
import { BookOpen } from "@/components/icons/BookOpen";
import { FileSearch } from "@/components/icons/FileSearch";
import { FolderOpen } from "@/components/icons/FolderOpen";
import { MessageSquareText } from "@/components/icons/MessageSquareText";
import { Network } from "@/components/icons/Network";
import { Search } from "@/components/icons/Search";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import { ContinueWork } from "./continue-work";
import { ResearchJourney } from "./research-journey";
import { ServiceScope } from "./service-scope";
import { useI18n } from "@/lib/i18n";
import { beginnerPrompts } from "@/lib/beginner-prompts";
import { formatDate } from "@/components/ui";
import { RESEARCH_DRAFT_KEY } from "@/lib/research-draft";
import { useQuery } from "@tanstack/react-query";
import { sourcePageOptions } from "@/lib/source-queries";
import { letterQueryString, readLetterQuery } from "@/lib/letter-query";
import { useWorkspaceScope } from "../workspace/provider";
import styles from "./beginner-home.module.css";

export function BeginnerHome() {
  const { text, locale } = useI18n();
  const router = useRouter();
  const [objective, setObjective] = useState("");
  const [handoffFailed, setHandoffFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [preparing, startPreparation] = useTransition();
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 0);
    if (window.location.hash === "#saved-requests") router.replace("/requests#saved-requests");
    return () => clearTimeout(timer);
  }, [router]);

  function prepareResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing || objective.trim().length < 8) return;
    try {
      sessionStorage.setItem(RESEARCH_DRAFT_KEY, objective.trim());
      setHandoffFailed(false);
      startPreparation(() => router.push("/research"));
    } catch { setHandoffFailed(true); }
  }

  return <div className={styles.home}>
    <header className={styles.pageHeading}>
      <p>{text("Your evidence workspace", "근거와 함께하는 워크스페이스")}</p>
      <Link prefetch={false} href="/help"><BookOpen size={16} />{text("Workspace guide", "워크스페이스 가이드")}<ArrowUpRight size={15} /></Link>
    </header>
    <div className={styles.desk}>
      <div className={styles.mainColumn}>
        <section className={styles.objective} aria-labelledby="home-objective-title">
          <div className={styles.trayLabel}><span><Network size={16} />{text("Research objective", "리서치 목표")}</span><span className={styles.scopeLabel}>FDA · {text("Warning letters", "경고서한")}</span></div>
          <h1 id="home-objective-title">{text("What would you like to investigate?", "어떤 내용을 조사할까요?")}</h1>
          <p className={styles.intro}>{text("Explore retained FDA evidence and prepare a brief for team review.", "저장된 FDA 근거로, 팀이 검토할 브리핑을 준비합니다.")}</p>
          <form onSubmit={prepareResearch} aria-busy={!ready}>
            <label htmlFor="home-objective">{text("Your research question", "조사할 질문")}</label>
            <div className={styles.inputTray}>
              <textarea id="home-objective" disabled={!ready} value={objective} onChange={event => setObjective(event.target.value)} rows={4} minLength={8} maxLength={1000} required placeholder={text("e.g. Compare cleaning-validation findings in FDA warning letters and prepare questions for our quality team.", "예: FDA 경고서한의 세척 밸리데이션 지적 사항을 비교하고, 품질팀의 검토 질문을 정리해 주세요.")} aria-describedby="home-objective-hint" />
              <div className={styles.composerFoot}><span id="home-objective-hint">{text("Korean or English", "한국어 또는 영어")}<span aria-hidden="true"> · </span>{objective.length}/1,000</span><Button type="submit" variant="primary" pending={preparing} pendingLabel={text("Preparing…", "준비 중…")} disabled={objective.trim().length < 8}>{text("Prepare research", "리서치 준비")}<ArrowRight size={17} /></Button></div>
            </div>
          </form>
          <div className={styles.objectiveFoot}><span><ShieldCheck size={14} />{text("Source evidence first", "원문 근거부터 확인")}</span><Link href="/research" prefetch={false}>{text("Open research workspace", "리서치 워크스페이스 열기")}<ArrowUpRight size={14} /></Link></div>
          {handoffFailed ? <p role="alert">{text("Your browser could not carry this draft over. Copy your question and open Research.", "브라우저에서 질문을 전달하지 못했습니다. 질문을 복사한 후 리서치를 열어 주세요.")}</p> : null}
        </section>
        <SourcePreview />
      </div>
      <aside className={styles.sideColumn} aria-label={text("Research guidance and work", "리서치 안내와 내 작업")}>
        <section className={styles.panel} aria-labelledby="home-workflow-title">
          <div className={styles.sectionHeading}><h2 id="home-workflow-title">{text("Your workflow", "리서치 진행 순서")}</h2><Link href="/help" aria-label={text("Read the workflow guide", "리서치 이용 안내 읽기")}><ArrowUpRight size={17} /></Link></div>
          <p className={styles.panelIntro}>{text("A clear path from question to review.", "질문에서 검토까지, 한눈에.")}</p>
          <ResearchJourney compact />
          <div className={styles.reviewNote}><ShieldCheck size={15} /><span>{text("AI draft · Human review required", "AI 초안 · 담당자 검토 필요")}</span></div>
        </section>
        <section className={styles.panel} aria-labelledby="examples-heading">
          <div className={styles.sectionHeading}><h2 id="examples-heading">{text("Quick questions", "간단한 질문")}</h2><MessageSquareText size={17} /></div>
          <div className={styles.tasks}>{beginnerPrompts.map(task => <Link prefetch={false} key={task.id} href={`/ask?starter=${task.id}`}><Search size={16} /><span>{task.title[locale]}</span><ArrowRight size={15} /></Link>)}</div>
        </section>
        <section className={styles.panel} aria-label={text("My work", "내 작업")}>
          <div className={styles.sectionHeading}><h2>{text("My work", "내 작업")}</h2><FolderOpen size={17} /></div>
          <ContinueWork compact />
          <nav className={styles.workLinks} aria-label={text("Saved work destinations", "저장된 작업 바로가기")}>
            <Link prefetch={false} href="/research"><Network size={15} />{text("Research tasks", "리서치 작업")}<ArrowUpRight size={14} /></Link>
            <Link prefetch={false} href="/ask"><MessageSquareText size={15} />{text("Conversations", "대화 기록")}<ArrowUpRight size={14} /></Link>
            <Link prefetch={false} href="/requests#saved-requests"><FolderOpen size={15} />{text("Review drafts", "검토 초안")}<ArrowUpRight size={14} /></Link>
          </nav>
        </section>
      </aside>
    </div>
    <ServiceScope />
  </div>;
}

function SourcePreview() {
  const { text, locale } = useI18n();
  const scope = useWorkspaceScope();
  const page = useQuery(sourcePageOptions(scope, letterQueryString(readLetterQuery(new URLSearchParams()))));
  const sources = page.data?.data.items.slice(0, 5);
  const failed = page.isError;
  const preview = page.data?.mode === "seeded";
  return <section className={styles.panel} aria-labelledby="home-sources-title">
    <div className={styles.sectionHeading}><h2 id="home-sources-title">{text("Source library", "원문 자료실")}</h2><Link prefetch={false} href="/drug-letters">{text("View library", "자료실 보기")}<ArrowUpRight size={15} /></Link></div>
    <p className={styles.panelIntro}>{preview ? text("Isolated preview records", "격리된 미리보기 레코드") : text("Recently posted letters in the retained collection.", "저장된 자료 중 최근 게시된 경고서한입니다.")}</p>
    <form className={styles.sourceSearch} action="/drug-letters" method="get"><Search size={16} /><label className="sr-only" htmlFor="home-source-search">{text("Search source library", "원문 자료실 검색")}</label><input id="home-source-search" name="q" placeholder={text("Search by company or topic", "회사명이나 주제로 검색")} /><button type="submit" aria-label={text("Search sources", "원문 검색")}><ArrowRight size={17} /></button></form>
    <div className={styles.sourceHead} aria-hidden="true"><span>{text("Company / topic", "회사 / 주제")}</span><span>{text("Posted", "게시일")}</span><span /></div>
    {!sources && !failed ? <SkeletonRows rows={5} label={text("Loading retained sources…", "저장된 원문을 불러오는 중…")} /> : sources?.length ? <ul className={styles.sourceList}>{sources.map(letter => <li key={letter.id}><Link href={`/drug-letters/${encodeURIComponent(letter.id)}`} prefetch={false}><span className={styles.documentMark}><FileSearch size={18} /></span><span className={styles.sourceIdentity}><strong lang="en">{letter.company}</strong><small lang="en">{letter.subject}</small></span><time dateTime={letter.postedDate || letter.issueDate}>{formatDate(letter.postedDate || letter.issueDate, { month: "short", day: "numeric" }, locale)}</time><ArrowUpRight size={15} /></Link></li>)}</ul> : <div className={styles.sourceState} role="status"><FileSearch size={24} /><p>{failed ? text("The source preview is unavailable. Open the library to try again.", "원문 미리보기를 불러오지 못했습니다. 자료실에서 다시 시도해 주세요.") : sources ? text("No source records yet.", "아직 원문 자료가 없습니다.") : text("Loading retained sources…", "저장된 원문을 불러오는 중…")}</p></div>}
    <div className={styles.sourceFooter}><span><BookOpen size={14} />{text("Official source text stays in English", "공식 원문은 영문으로 표시됩니다")}</span><Link prefetch={false} href="/saved-views">{text("Saved sources", "저장한 자료")}<ArrowRight size={14} /></Link></div>
  </section>;
}
