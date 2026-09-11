"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { BookOpen } from "@/components/icons/BookOpen";
import { Download } from "@/components/icons/Download";
import { MessageSquareText } from "@/components/icons/MessageSquareText";
import { Network } from "@/components/icons/Network";
import { Play } from "@/components/icons/Play";
import { Settings } from "@/components/icons/Settings";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import { Square } from "@/components/icons/Square";
import { useI18n } from "@/lib/i18n";
import { ResearchJourney } from "./research-journey";
import { ServiceScope } from "./service-scope";
import styles from "./employee-guide.module.css";

export function EmployeeGuide() {
  const { text } = useI18n();
  const destinations = [
    { icon: Network, href: "/research", title: text("Research", "리서치"), detail: text("Start a question or continue a saved research task.", "새 질문을 시작하거나 저장된 리서치를 이어가세요.") },
    { icon: BookOpen, href: "/drug-letters", title: text("FDA sources", "FDA 원문"), detail: text("Find warning letters and inspect the original evidence.", "경고서한을 찾고 원문 근거를 확인하세요.") },
    { icon: Download, href: "/saved-work", title: text("Saved work", "저장한 작업"), detail: text("Find brief snapshots, bookmarked sources, saved views, and local drafts.", "브리핑 스냅샷, 저장한 원문, 저장한 보기와 기기 내 초안을 찾으세요.") },
    { icon: MessageSquareText, href: "/inbox", title: text("Inbox", "받은 자료"), detail: text("Organize source updates. Personal triage does not approve evidence.", "원문 업데이트를 정리하세요. 개인 자료 분류는 근거 승인이 아닙니다.") },
    { icon: Settings, href: "/settings", title: text("Settings", "설정"), detail: text("Language and workspace preferences.", "언어 및 워크스페이스 환경설정입니다.") },
  ];
  const controls = [
    { icon: Square, title: text("Stop research", "리서치 중지"), detail: text("Stop further work; retain progress.", "추가 작업 중지 · 진행 내용 보관") },
    { icon: Play, title: text("Resume research", "리서치 이어서 진행"), detail: text("Continue from saved progress.", "저장한 단계부터 다시 진행") },
    { icon: BookOpen, title: text("Source references", "출처 번호"), detail: text("Select S1, S2… to open evidence.", "S1, S2… 선택으로 원문 열기") },
    { icon: Download, title: text("Download", "다운로드"), detail: text("Keep the brief and its sources.", "브리핑과 출처를 파일로 보관") },
  ];
  const questions = [
    ["Will research continue after I close the page?", "페이지를 닫아도 계속 진행되나요?", "Yes. Reopen Research agent in the same browser session to see saved progress and results.", "네. 같은 브라우저 세션에서 리서치 에이전트를 다시 열면 진행 상황과 결과를 확인할 수 있습니다."],
    ["Do I need AI settings or an account?", "AI 설정이나 계정이 필요한가요?", "No. Choose an example or write your goal in Korean or English.", "필요하지 않습니다. 예시를 고르거나 한국어·영어로 목표를 적어 주세요."],
    ["How do I ask about a particular letter?", "특정 경고서한을 질문하려면?", "Find the company in the FDA library, open its letter, then choose the AI question action.", "FDA 자료실에서 회사명 검색 → 경고서한 열기 → AI 질문을 선택하세요."],
    ["Where is my previous work?", "이전 작업은 어디에 있나요?", "Continue tasks in Research. Open brief snapshots and bookmarks in Saved work. Recent conversations are in the sidebar. Local drafts are separate device-only notes that have not been submitted.", "진행 중인 작업은 리서치에서, 브리핑 스냅샷과 원문 즐겨찾기는 저장한 작업에서 찾으세요. 최근 대화는 사이드바에 있습니다. 기기 내 초안은 제출되지 않은 별도 메모입니다."],
    ["What if a task or source fails?", "작업이나 자료를 불러오지 못하면?", "Retry or reload. If evidence is insufficient, narrow the topic or select a specific company. Contact your service administrator if the problem continues.", "다시 시도하거나 새로고침하세요. 근거가 부족하면 주제나 회사를 구체적으로 지정하세요. 문제가 계속되면 서비스 담당자에게 알려주세요."],
  ];
  return <article className={styles.guide}>
    <header><h1>{text("Help", "도움말")}</h1><ResearchJourney /><Link className="button button--primary" href="/research">{text("Start agent research", "에이전트 리서치 시작")}<ArrowRight size={18} aria-hidden="true" /></Link></header>
    <section aria-labelledby="guide-destinations"><h2 id="guide-destinations">{text("Choose your task", "필요한 작업 선택")}</h2><div className={styles.destinations}>{destinations.map(({icon: Icon, href, title, detail}) => <Link key={href} href={href}><Icon size={25} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={19} aria-hidden="true" /></Link>)}</div></section>
    <section aria-labelledby="guide-controls"><h2 id="guide-controls">{text("Controls at a glance", "주요 기능 한눈에 보기")}</h2><dl className={styles.controls}>{controls.map(({icon: Icon, title, detail}) => <div key={title}><dt><Icon size={21} aria-hidden="true" />{title}</dt><dd>{detail}</dd></div>)}</dl></section>
    <section id="availability"><h2>{text("Scope & storage", "이용 범위와 저장")}</h2><ServiceScope /></section>
    <section className={styles.faq}><h2>{text("Common questions", "자주 묻는 질문")}</h2>{questions.map(([en, ko, bodyEn, bodyKo]) => <details key={en}><summary>{text(en, ko)}</summary><p>{text(bodyEn, bodyKo)}</p></details>)}</section>
    <section id="credits" aria-labelledby="guide-credits"><h2 id="guide-credits">{text("Icon credits", "아이콘 출처")}</h2><p>{text("Ultimate Light icons by ", "Ultimate Light 아이콘 제작: ")}<a href="https://www.streamlinehq.com/">Streamline</a>{text(". Used under ", ". 이용 라이선스: ")}<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{text("; colors, weight and selected symbols adapted for this workspace.", ". 이 워크스페이스에 맞게 색상, 선 굵기와 일부 기호를 조정했습니다.")}</p></section>
    <footer><ShieldCheck size={20} aria-hidden="true" /><p>{text("AI drafts can be wrong. Check the FDA originals before use.", "AI 초안에는 오류가 있을 수 있습니다. 사용 전 FDA 원문을 확인하세요.")}</p></footer>
  </article>;
}
