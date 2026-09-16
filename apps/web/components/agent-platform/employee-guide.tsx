"use client";
import { cancelViewFade, changeView } from "@/components/motion/view-fade";

import Link from "@/components/motion/workspace-link";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { BookOpen } from "@/components/icons/BookOpen";
import { Download } from "@/components/icons/Download";
import { MessageSquareText } from "@/components/icons/MessageSquareText";
import { Settings } from "@/components/icons/Settings";
import { ExamplePreview } from "@/components/examples/example-preview";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import type { ExampleSummary } from "@/lib/example-types";
import { RESEARCH_DRAFT_KEY } from "@/lib/research-draft";
import { useI18n } from "@/lib/i18n";
import { ServiceScope } from "./service-scope";
import styles from "./employee-guide.module.css";

const topics = [
  { slug: "research-contamination", title: ["Contamination control", "오염 관리"], prompt: ["Compare contamination-control observations in at least two companies' saved FDA warning letters. Cite the evidence and suggest conditional review questions for a sterile-products team.", "저장된 FDA 경고서한에서 최소 두 회사의 오염 관리 관찰사항을 비교하세요. 근거를 인용하고 무균 제품 담당 팀이 검토할 조건부 질문을 제시하세요."] },
  { slug: "research-laboratory-ko", title: ["Laboratory investigations", "시험실 조사"], prompt: ["Compare laboratory investigations and out-of-specification results in at least two companies' FDA warning letters. Identify supported findings, differences and questions for a human reviewer.", "FDA 경고서한에서 최소 두 회사의 시험실 조사와 규격 일탈 결과 처리를 비교하세요. 근거가 있는 발견사항, 차이점, 담당자가 검토할 질문을 정리하세요."] },
] as const;
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverHydrationSnapshot = () => false;

export function EmployeeGuide({ examples }: { examples: ExampleSummary[] }) {
  const { text, locale } = useI18n();
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverHydrationSnapshot);
  const [selected, setSelected] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const topic = topics[selected];
  const draftKey = `${selected}:${locale}`;
  const question = drafts[draftKey] ?? text(topic.prompt[0], topic.prompt[1]);
  const example = examples.find(item => item.slug === topic.slug);
  const useQuestion = () => {
    try { sessionStorage.setItem(RESEARCH_DRAFT_KEY, question); changeView(() => router.push("/research"), undefined, true); }
    catch { setError(true); }
  };
  const destinations = [
    { icon: BookOpen, href: "/drug-letters", title: text("Find FDA sources", "FDA 원문 찾기") },
    { icon: Download, href: "/saved-work", title: text("Open saved work", "저장한 작업 열기") },
    { icon: MessageSquareText, href: "/inbox", title: text("Organize inbox", "받은 자료 정리") },
    { icon: Settings, href: "/settings", title: text("Change preferences", "환경설정 변경") },
  ];
  const questions = [
    ["Will research continue after I close the page?", "페이지를 닫아도 계속 진행되나요?", "Yes. Reopen Research in the same browser session to continue.", "네. 같은 브라우저 세션에서 리서치를 다시 열어 이어가세요."],
    ["Do I need AI settings or an account?", "AI 설정이나 계정이 필요한가요?", "No. Edit a question and open Research.", "필요하지 않습니다. 질문을 편집하고 리서치를 여세요."],
    ["How do I ask about a particular letter?", "특정 경고서한을 질문하려면?", "FDA sources → find a company → open its letter → Ask AI.", "FDA 원문 → 회사 검색 → 경고서한 열기 → AI 질문."],
    ["Where is my previous work?", "이전 작업은 어디에 있나요?", "Research: tasks. Saved work: briefs and sources. Sidebar: chats. Local drafts: unsubmitted device-only notes.", "리서치: 작업. 저장한 작업: 브리핑과 원문. 사이드바: 대화. 기기 내 초안: 제출되지 않은 메모."],
    ["What if a task or source fails?", "작업이나 자료를 불러오지 못하면?", "Retry. For insufficient evidence, narrow the topic or company. Contact your service administrator if the problem continues.", "다시 시도하세요. 근거가 부족하면 주제나 회사를 좁혀 주세요. 계속 실패하면 서비스 담당자에게 알려주세요."],
  ];
  return <article className={styles.guide}>
    <header><h1>{text("Help", "도움말")}</h1><p>{text("Try a question. Inspect a real result.", "질문을 만들고 실제 결과를 확인하세요.")}</p></header>
    <div className={styles.tryGrid}>
      <section className={styles.builder} aria-labelledby="guide-draft-heading"><h2 id="guide-draft-heading">{text("Build a question", "질문 만들기")}</h2>
        <SelectionGroup><div className={styles.topics} aria-label={text("Research topic", "리서치 주제")}>{topics.map((item, i) => <button className="ui-selection-control" type="button" key={item.slug} disabled={!hydrated} aria-pressed={selected === i} onClick={() => { if (selected !== i) changeView(() => { setSelected(i); setError(false); }); else cancelViewFade(); }}>{selected === i && <SelectionIndicator />}{text(item.title[0], item.title[1])}</button>)}</div></SelectionGroup>
        <label htmlFor="guide-question">{text("Your question", "질문 내용")}</label><textarea id="guide-question" rows={7} maxLength={2000} value={question} disabled={!hydrated} onChange={event => { const value = event.target.value; setDrafts(current => ({ ...current, [draftKey]: value })); }} />
        <div className={styles.useQuestion}><span>{text("Editable draft", "편집 가능한 초안")}</span><button type="button" className="button button--primary" disabled={!hydrated || question.trim().length < 8} onClick={useQuestion}>{text("Use in Research", "리서치에서 사용")}<ArrowRight size={17} /></button></div>
        {error && <p role="alert">{text("Could not transfer the draft. Copy your question into Research.", "초안을 전달하지 못했습니다. 질문을 복사해 리서치에 붙여 넣으세요.")} <Link href="/research">{text("Open Research", "리서치 열기")}</Link></p>}
      </section>
      {example && <ExamplePreview example={example} />}
    </div>
    <nav className={styles.destinations} aria-label={text("Workspace shortcuts", "워크스페이스 바로가기")}>{destinations.map(({ icon: Icon, href, title }) => <Link key={href} href={href}><Icon size={21} /><span>{title}</span><ArrowRight size={17} /></Link>)}</nav>
    <section id="availability" className={styles.availability}><ServiceScope /></section>
    <section className={styles.faq}><h2>{text("Common questions", "자주 묻는 질문")}</h2>{questions.map(([en, ko, bodyEn, bodyKo]) => <details key={en}><summary>{text(en, ko)}</summary><p>{text(bodyEn, bodyKo)}</p></details>)}</section>
    <details id="credits" className={styles.credits}><summary>{text("Design credits", "디자인 출처")}</summary><p>Ultimate Light · <a href="https://www.streamlinehq.com/">Streamline</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. {text("Colors, weight and selected symbols adapted for this workspace.", "색상, 선 굵기와 일부 기호를 이 워크스페이스에 맞게 조정했습니다.")}</p><p>{text("Loading motion inspired by", "로딩 모션 참고")} <a href="https://dribbble.com/shots/27695417-Loading-Animation-Concept">Rifayet · Loading Animation Concept</a>.</p></details>
  </article>;
}
