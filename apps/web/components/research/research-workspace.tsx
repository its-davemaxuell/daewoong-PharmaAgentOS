"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ResearchRunList } from "../workspace/research-list";
import { SaveBriefButton } from "../workspace/save-brief-button";
import { SourceInspector } from "../workspace/source-inspector";
import { useWorkspaceScope } from "../workspace/provider";
import { setWorkspaceParams } from "@/lib/workspace-client";
import { ActionButton } from "../workspace/commands";
import { RESEARCH_DRAFT_KEY } from "@/lib/research-draft";
import { trustedFdaUrl } from "@/lib/evidence-state";
import { SessionNotice } from "@/components/session-notice";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { BookOpen } from "@/components/icons/BookOpen";
import { Check } from "@/components/icons/Check";
import { ChevronRight } from "@/components/icons/ChevronRight";
import { Circle } from "@/components/icons/Circle";
import { CircleAlert } from "@/components/icons/CircleAlert";
import { Clock3 } from "@/components/icons/Clock3";
import { CloudCheck } from "@/components/icons/CloudCheck";
import { Copy } from "@/components/icons/Copy";
import { Download } from "@/components/icons/Download";
import { ExternalLink } from "@/components/icons/ExternalLink";
import { FileCheck2 } from "@/components/icons/FileCheck2";
import { FileText } from "@/components/icons/FileText";
import { LoaderCircle } from "@/components/icons/LoaderCircle";
import { Network } from "@/components/icons/Network";
import { Play } from "@/components/icons/Play";
import { Plus } from "@/components/icons/Plus";
import { RotateCcw } from "@/components/icons/RotateCcw";
import { Search } from "@/components/icons/Search";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import { Square } from "@/components/icons/Square";
import { Target } from "@/components/icons/Target";
import { useI18n } from "@/lib/i18n";
import { mergeResearchRun, researchActive, researchText, type ResearchEvent, type ResearchRun, type ResearchSource, type ResearchStatus } from "@/lib/research-types";
import { ResearchJourney } from "@/components/agent-platform/research-journey";
import { ServiceScope } from "@/components/agent-platform/service-scope";
import { Button, SkeletonRows, InlineFeedback } from "../controls";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import styles from "./research-workspace.module.css";

const labels: Record<ResearchStatus, [string, string]> = {
  queued: ["Waiting to start", "시작 대기 중"], running: ["Working", "작업 중"],
  completed: ["Brief ready", "브리핑 준비 완료"], stopped: ["Stopped", "중지됨"],
  failed: ["Needs a retry", "다시 시도 필요"], limit_reached: ["Research limit reached", "리서치 한도 도달"],
  insufficient_evidence: ["More evidence needed", "추가 근거 필요"],
};
const activities: Record<string, [string, string]> = {
  queued: ["Waiting to start", "시작 대기"],
  started: ["Research started", "조사 시작"],
  recovered: ["Saved work restored", "저장된 작업 복구"],
  choosing_action: ["Choosing the next action", "다음 단계 준비"],
  plan_saved: ["Plan ready", "계획 준비 완료"],
  search_started: ["Searching FDA sources", "FDA 자료 검색 중"],
  search_completed: ["Search complete", "검색 완료"],
  read_started: ["Reading source passages", "원문 확인 중"],
  read_completed: ["Sources read", "원문 확인 완료"],
  draft_prepared: ["Draft ready for checking", "초안 작성 완료"],
  check_started: ["Checking claims & citations", "내용과 출처 검토 중"],
  check_completed: ["Evidence check passed", "근거 검토 통과"],
  check_needs_revision: ["Revising the draft", "초안 보완 중"],
  action_needs_revision: ["Adjusting the approach", "조사 방법 조정"],
  checkpoint_saved: ["Progress saved", "진행 상황 저장"],
  completed: ["Brief ready", "브리핑 준비 완료"],
  stopped: ["Stopped · Work saved", "중지됨 · 작업 저장 완료"],
  resumed: ["Resuming research", "조사 이어서 진행"],
  failed: ["Request failed · Retry available", "요청 실패 · 다시 시도 가능"],
  limit_reached: ["Research limit reached", "리서치 한도 도달"],
  insufficient_evidence: ["More evidence needed", "추가 근거 필요"],
};
function ActivityIcon({ kind, size }: { kind: string; size: number }) {
  const props = { size, "aria-hidden": true as const };
  if (kind.startsWith("search")) return <Search {...props} />;
  if (kind.startsWith("check")) return <ShieldCheck {...props} />;
  if (kind.startsWith("read")) return <BookOpen {...props} />;
  if (["failed", "limit_reached", "insufficient_evidence"].includes(kind)) return <CircleAlert {...props} />;
  if (kind === "stopped") return <Square {...props} />;
  if (kind === "queued") return <Clock3 {...props} />;
  if (kind === "completed" || kind === "draft_prepared") return <FileCheck2 {...props} />;
  if (kind === "action_needs_revision" || kind === "resumed") return <RotateCcw {...props} />;
  return <Network {...props} />;
}
const stages = [
  { id: "planning", icon: Target, en: "Plan", ko: "계획", done: "plan_saved" },
  { id: "searching", icon: Search, en: "Search", ko: "검색", done: "search_completed" },
  { id: "reading", icon: BookOpen, en: "Read", ko: "원문 확인", done: "read_completed" },
  { id: "checking", icon: ShieldCheck, en: "Check", ko: "근거 검토", done: "check_completed" },
  { id: "complete", icon: FileText, en: "Brief", ko: "브리핑", done: "completed" },
];

function activityLabel(event?: ResearchEvent): [string, string] {
  if (event?.kind === "search_completed" && event.data.count === 0) return ["No matching passages", "일치하는 문단 없음"];
  return activities[event?.kind || "queued"] || activities.choosing_action;
}

class RequestFailure extends Error { constructor(readonly status: number) { super("Research request failed"); } }
async function requestJson(url: string, options?: RequestInit) {
  const timeout = AbortSignal.timeout(20_000);
  const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(url, { ...options, signal, cache: "no-store" });
  if (!response.ok) throw new RequestFailure(response.status);
  return response.json();
}
function isRun(value: unknown): value is ResearchRun {
  if (!value || typeof value !== "object") return false;
  const run = value as ResearchRun;
  return typeof run.id === "string" && Object.hasOwn(labels, run.status) && Number.isInteger(run.revision)
    && Array.isArray(run.events) && Array.isArray(run.sources) && Array.isArray(run.plan);
}
function sourceUrl(source: ResearchSource) { return trustedFdaUrl(source.source_url); }

export function ResearchWorkspace() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("run") || "";
  return <div className="research-desk"><ResearchRunList selected={runId} /><ResearchWorkspaceInner key={runId} runId={runId} /></div>;
}

function ResearchWorkspaceInner({ runId }: { runId: string }) {
  const { text, locale } = useI18n();
  const router = useRouter();
  const [objective, setObjective] = useState("");
  useEffect(() => {
    if (runId) return;
    const timer = setTimeout(() => {
      try {
        const draft = sessionStorage.getItem(RESEARCH_DRAFT_KEY);
        if (draft) { setObjective(draft.slice(0, 1000)); sessionStorage.removeItem(RESEARCH_DRAFT_KEY); }
      } catch { /* The research form remains usable when browser storage is unavailable. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [runId]);
  const [newEventSequences, setNewEventSequences] = useState<Set<number>>(() => new Set());
  const queryClient = useQueryClient();
  const scope = useWorkspaceScope();
  const [run, setRun] = useState<ResearchRun>(() => queryClient.getQueryData([scope, "research-run", runId]) as ResearchRun);
  const peekSource = useSearchParams().get("evidence") || undefined;
  const setPeekSource = (id?: string) => setWorkspaceParams({ evidence: id || null });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<number>();
  const [copyFailed, setCopyFailed] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [retry, setRetry] = useState(0);
  const [openSource, setOpenSource] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [now, setNow] = useState(0);
  const currentRun = useRef<ResearchRun | undefined>(run);
  const createRequest = useRef<{ value: string; id: string } | undefined>(undefined);
  const activityList = useRef<HTMLOListElement>(null);
  const followActivity = useRef(true);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refreshSaved = useCallback(async () => { await queryClient.invalidateQueries({ queryKey: [scope, "research-list"] }); }, [queryClient, scope]);

  useEffect(() => {
    const retryStartup = () => { setError(undefined); setRetry(value => value + 1); };
    window.addEventListener("workspace:startup-retry", retryStartup);
    return () => window.removeEventListener("workspace:startup-retry", retryStartup);
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    if (!runId) return () => { active = false; };
    const poll = async () => {
      let keepPolling = true;
      let delay = document.hidden ? 10_000 : 2_000;
      try {
        const sequence = currentRun.current?.revision || 0;
        const incoming = await requestJson(`/api/research/${encodeURIComponent(runId)}?after=${sequence}`, { signal: controller.signal });
        if (!active) return;
        if (!isRun(incoming)) throw new Error("Invalid research response");
        const previous = currentRun.current;
        const merged = mergeResearchRun(previous, incoming);
        if (previous?.id === incoming.id && incoming.revision > previous.revision) setNewEventSequences(new Set(incoming.events.filter(event => event.sequence > previous.revision).map(event => event.sequence)));
        currentRun.current = merged;
        if (!previous || incoming.revision > previous.revision) { setRun(merged); queryClient.setQueryData([scope, "research-run", runId], merged); }
        setNow(Date.now());
        setConnectionLost(false);
        setError(undefined);
        keepPolling = researchActive(merged.status);
        if (!keepPolling) void refreshSaved();
      } catch (failure) {
        if (!active) return;
        if (failure instanceof RequestFailure && [401, 404].includes(failure.status)) {
          setError(failure.status);
          keepPolling = false;
        } else { setConnectionLost(true); delay = 5_000; }
      } finally {
        if (active && keepPolling) timer = setTimeout(poll, delay);
      }
    };
    void poll();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [refreshSaved, retry, runId, queryClient, scope]);

  const runStatus = run?.status;
  useEffect(() => {
    if (!runStatus || !researchActive(runStatus)) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [runStatus]);

  useEffect(() => {
    if (followActivity.current && activityList.current) activityList.current.scrollTop = activityList.current.scrollHeight;
  }, [run?.events.length]);

  const examples = [
    { en: "Prepare a cleaning-validation brief", ko: "세척 밸리데이션 브리핑 준비", prompt: text("Prepare a cleaning-validation briefing for our quality team. Compare relevant FDA warning-letter findings, cite the source passages, and suggest review questions.", "품질팀을 위한 세척 밸리데이션 브리핑을 준비해 주세요. 관련 FDA 경고서한의 지적 사항을 비교하고, 원문 근거와 검토 질문을 정리해 주세요.") },
    { en: "Compare data-integrity findings", ko: "데이터 완전성 지적 사항 비교", prompt: text("Compare data-integrity findings across companies in the saved FDA warning letters. Explain recurring observations with citations and questions our team could review.", "저장된 FDA 경고서한에서 회사별 데이터 완전성 지적 사항을 비교해 주세요. 반복되는 지적 내용을 출처와 함께 설명하고 우리 팀의 검토 질문을 제안해 주세요.") },
    { en: "Prepare a quality-oversight discussion", ko: "품질 관리 감독 검토 준비", prompt: text("Research FDA warning-letter findings about quality-unit oversight. Prepare a cited discussion brief for our quality team without assuming these findings apply to our company.", "품질 부서의 감독에 관한 FDA 경고서한 지적 사항을 조사해 주세요. 우리 회사에 해당한다고 가정하지 말고, 품질팀의 논의를 위한 근거 기반 브리핑을 준비해 주세요.") },
  ];

  async function start() {
    if (pending || objective.trim().length < 8) return;
    setPending(true); setError(undefined);
    const value = `${locale}:${objective.trim()}`;
    if (createRequest.current?.value !== value) createRequest.current = { value, id: crypto.randomUUID() };
    try {
      const created = await requestJson("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objective: objective.trim(), language: locale, client_request_id: createRequest.current.id }) });
      if (!isRun(created)) throw new Error("Invalid research response");
      if (mounted.current) router.push(`/research?run=${created.id}`);
    } catch (failure) { setError(failure instanceof RequestFailure ? failure.status : 502); }
    finally { setPending(false); }
  }

  async function control(action: "stop" | "resume") {
    if (!run || pending) return;
    const id = run.id;
    setPending(true); setError(undefined);
    try {
      const updated = await requestJson(`/api/research/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!isRun(updated)) throw new Error("Invalid research response");
      if (!mounted.current) return;
      currentRun.current = mergeResearchRun(currentRun.current, updated);
      setRun(currentRun.current);
      void refreshSaved();
      if (action === "resume") setRetry((value) => value + 1);
    } catch (failure) { if (mounted.current) setError(failure instanceof RequestFailure ? failure.status : 502); }
    finally { setPending(false); }
  }

  function download() {
    if (!run) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF", researchText(run)], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `FDA-research-${run.id.slice(0, 8)}.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  const active = run && researchActive(run.status);
  const lastEvent = run?.events.at(-1);
  const latestLabel = activityLabel(lastEvent);
  const recordedEvents = run?.events.filter((event) => event.kind !== "choosing_action") || [];
  const visibleEvents = showAllActivity ? recordedEvents : recordedEvents.slice(-4);
  const elapsed = run?.started_at && now ? Math.max(0, Math.floor(((run.finished_at ? Date.parse(run.finished_at) : now) - Date.parse(run.started_at)) / 1_000)) : 0;
  const formatTime = (date: string) => new Date(date).toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const brief = run?.result;
  return <div className={styles.workspace} data-startup-pending={runId && !run && !error ? "true" : undefined} data-startup-failed={runId && !run && error && ![401, 403, 404].includes(error) ? "true" : undefined}>
      <SessionNotice />
    {copyFailed ? <InlineFeedback kind="error">{text("Could not copy. Download the brief or select the text instead.", "복사하지 못했습니다. 브리핑을 다운로드하거나 텍스트를 선택하세요.")}</InlineFeedback> : null}
    <header className={styles.header}>
      <div><h1>{text("FDA Research Agent", "FDA 리서치 에이전트")}</h1></div>
      {runId ? <Link className="button button--secondary" href="/research"><Plus size={18} />{text("New task", "새 작업")}</Link> : <Link prefetch={false} className={styles.quickChat} href="/ask">{text("Quick AI chat", "간단한 AI 질문")} <ArrowRight size={17} /></Link>}
    </header>

    {error ? <div className={styles.notice} role="alert"><p>{error === 429 ? text("Research capacity is full. Finish an active task or try again later.", "리서치 이용 한도에 도달했습니다. 진행 중인 작업을 마치거나 나중에 다시 시도해 주세요.") : error === 404 || error === 401 ? text("This task is not available in this browser session. Open one of your saved tasks below.", "이 브라우저 세션에서 사용할 수 없는 작업입니다. 아래에 저장된 작업을 열어 주세요.") : error === 409 ? text("This task cannot be resumed. Check its status or start a more focused task.", "이 작업을 다시 시작할 수 없습니다. 상태를 확인하거나 범위를 좁혀 새 작업을 시작해 주세요.") : text("Research is temporarily unavailable. Your saved tasks are retained. Please try again.", "지금 리서치를 사용할 수 없습니다. 저장된 작업은 유지됩니다. 다시 시도해 주세요.")}</p><button type="button" onClick={() => { setError(undefined); setRetry((value) => value + 1); }}>{text("Dismiss", "닫기")}</button></div> : null}
    {connectionLost ? <div className={styles.notice} role="status"><p>{text("Live updates are reconnecting. This does not mean the task stopped; your progress is saved.", "실시간 진행 상황을 다시 연결하고 있어요. 작업 중지를 의미하지 않으며 진행 내용은 저장됩니다.")}</p><button onClick={() => setRetry((value) => value + 1)}>{text("Reconnect now", "지금 다시 연결")}</button></div> : null}

    {!runId ? <>
      <ResearchJourney compact />
      <section className={styles.composer} aria-labelledby="research-goal-label">
        <label id="research-goal-label" htmlFor="research-goal">{text("What would you like prepared?", "어떤 자료를 준비할까요?")}</label>

        <form onSubmit={(event) => { event.preventDefault(); void start(); }}>
          <textarea id="research-goal" value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={2000} rows={4} placeholder={text("For example: Prepare a briefing on cleaning-validation findings for our quality team…", "예: 품질팀을 위한 세척 밸리데이션 지적 사항 브리핑을 준비해 주세요…")} aria-describedby="research-scope" disabled={pending} />
          <div className={styles.composerFooter}><span id="research-scope">{text("Korean or English · Review draft", "한국어·영어 · 검토용 초안")}</span><Button variant="primary" type="submit" pending={pending} pendingLabel={text("Saving task…", "요청 저장 중…")} disabled={objective.trim().length < 8}><Play size={19} />{text("Start research", "리서치 시작")}</Button></div>
        </form>
      </section>
      <section className={styles.examples} aria-labelledby="research-examples"><h2 id="research-examples">{text("Start with an example", "예시로 시작하기")}</h2>{examples.map((example) => <button key={example.en} type="button" onClick={() => { setObjective(example.prompt); document.getElementById("research-goal")?.focus(); }}><span>{text(example.en, example.ko)}</span><ArrowRight size={19} /></button>)}</section>
      <ServiceScope />
    </> : !run && !error ? <div className={styles.taskLoading}>
      <SkeletonRows rows={2} label={text("Opening your research task…", "리서치 작업을 열고 있어요…")} />
      <div className={styles.loadingStages} aria-hidden="true">{stages.map((stage) => <i key={stage.id} />)}</div>
      <div className={styles.workGrid} aria-hidden="true"><div className={styles.activity}><SkeletonRows rows={4} label="" /></div><div className={styles.evidence}><SkeletonRows rows={2} label="" /></div></div>
    </div> : run ? <>
      <section className={styles.taskHeader} aria-label={text("Research task", "리서치 작업")}>
        <div className={styles.statusRow}><span data-research-status={run.status} className={`${styles.status} ${active ? styles.statusActive : ""}`}>{active && !connectionLost ? <LoaderCircle className={styles.spin} size={16} /> : run.status === "completed" ? <Check size={17} /> : <Circle size={15} />}{text(...labels[run.status])}</span><span>{text("Sources read", "확인한 근거")} {run.sources.length}</span><span>{text("Elapsed", "경과 시간")} {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span></div>
        <h2>{run.objective}</h2>
        <div className={styles.taskActions}><p><CloudCheck size={18} aria-hidden="true" />{active ? text("Runs in the background · Progress saved", "페이지를 닫아도 계속 진행 · 자동 저장") : text("Saved · Reopen in this browser session", "저장 완료 · 같은 브라우저에서 다시 열기")}</p>{active ? <ActionButton actionId="research.stop" label={text("Stop research", "리서치 중지")} type="button" className="button button--secondary" disabled={pending} onClick={() => void control("stop")}><Square size={16} />{text("Stop research", "리서치 중지")}</ActionButton> : run.status === "completed" ? <a className="button button--primary" href="#research-brief" onClick={() => document.getElementById("research-brief")?.focus()}><FileText size={18} />{text("View brief", "브리핑 보기")}<ArrowRight size={18} /></a> : run.can_resume ? <ActionButton actionId="research.resume" label={text("Resume research", "리서치 이어가기")} type="button" className="button button--primary" disabled={pending} onClick={() => void control("resume")}><Play size={17} />{text("Resume research", "리서치 이어서 진행")}</ActionButton> : null}</div>
      </section>
      <SelectionGroup><ol className={styles.stages} aria-label={text("Research stages", "리서치 단계")}>{stages.map((stage) => {
        const done = run.events.some((event) => event.kind === stage.done);
        const working = active && run.stage === stage.id;
        const StageIcon = stage.icon;
        return <li key={stage.id} className={`ui-selection-control ${working ? styles.stageActive : done ? styles.stageDone : ""}`} aria-current={working ? "step" : undefined}>{working && <SelectionIndicator tone="tinted" />}<span className={styles.stageIcon}><StageIcon size={24} />{done && !working ? <Check className={styles.doneMark} size={13} aria-label={text("Completed", "완료")} /> : null}</span><span>{text(stage.en, stage.ko)}</span><ChevronRight className={styles.connector} size={17} /></li>;
      })}</ol></SelectionGroup>

      {run.status === "stopped" ? <p className={styles.scope}>{text("Work retained. Resume whenever you are ready.", "진행 내용을 보관했습니다. 준비되면 이어서 진행하세요.")}</p> : null}
      {run.status === "failed" || run.status === "limit_reached" || run.status === "insufficient_evidence" ? <div className={styles.notice} role="status"><p>{brief?.explanation || (run.status === "failed" ? text("The AI service could not finish a request. Resume to continue from saved progress.", "AI 서비스 요청을 완료하지 못했습니다. 저장한 진행 상황부터 다시 이어서 진행해 주세요.") : text("A checked brief could not be completed within this task’s evidence or research limits. Try a narrower topic or a specific company.", "이 작업의 근거 또는 리서치 한도 내에서 검토된 브리핑을 완성하지 못했습니다. 주제를 좁히거나 특정 회사를 지정해 주세요."))}</p></div> : null}

      <div className={styles.workGrid}>
        <section className={styles.activity} aria-labelledby="live-activity-title">
          <div className={styles.sectionTitle}><h2 id="live-activity-title">{text("Agent activity", "에이전트 작업 현황")}</h2><span className={styles.liveLabel}>{connectionLost ? text("Reconnecting", "재연결 중") : active ? text("Live updates", "실시간 업데이트") : text("Saved activity", "저장된 작업 기록")}</span></div>
          <div className={styles.currentAction} role="status" aria-live="polite"><ActivityIcon kind={lastEvent?.kind || "queued"} size={28} /><div><strong>{text("FDA Research Agent", "FDA 리서치 에이전트")}</strong><p>{text(...latestLabel)}</p></div></div>
          {run.plan.length ? <details className={styles.plan}><summary>{text("Research plan", "조사 계획")} <span>{text(`${run.plan.length} steps`, `${run.plan.length}단계`)}</span></summary><ol>{run.plan.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></details> : null}
          <ol ref={activityList} className={styles.eventList} onScroll={(event) => { const el = event.currentTarget; followActivity.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; }} aria-label={text("Recorded agent actions", "저장된 에이전트 동작")}>
            {visibleEvents.map((event) => <ActivityItem key={event.sequence} fresh={newEventSequences.has(event.sequence)} event={event} text={text} time={formatTime(event.created_at)} />)}
          </ol>
          {recordedEvents.length > 4 ? <button type="button" className={styles.historyToggle} aria-expanded={showAllActivity} onClick={() => setShowAllActivity((value) => !value)}>{showAllActivity ? text("Show recent activity", "최근 동작만 보기") : text(`View all ${recordedEvents.length} actions`, `전체 동작 ${recordedEvents.length}건 보기`)}<ChevronRight size={16} aria-hidden="true" /></button> : null}
          <p className={styles.updated}>{text("Last saved update", "최근 저장 시각")}: {formatTime(run.updated_at)}</p>
        </section>

        <section className={styles.evidence} aria-labelledby="research-evidence-title"><div className={styles.sectionTitle}><h2 id="research-evidence-title">{text("Evidence opened", "확인한 근거")}</h2><span>{run.sources.length}</span></div>
          {!run.sources.length ? <div className={styles.emptyEvidence}><FileText size={27} /><p>{text("Waiting for sources", "원문 확인 대기 중")}</p></div> : run.sources.map((source) => <details id={`source-${source.id}`} key={source.id} className={styles.source} open={openSource === source.id} onToggle={(event) => { if (event.currentTarget.open) setOpenSource(source.id); else setOpenSource((current) => current === source.id ? undefined : current); }}>
            <summary><span className={styles.sourceId}>{source.id}</span><span><strong>{source.company}</strong><small>{source.posted_date || text("Date unavailable", "날짜 정보 없음")} · {text("Version", "버전")} {source.version}</small></span><ChevronRight className={styles.sourceChevron} size={20} aria-hidden="true" /></summary>
            <blockquote lang="en">{source.excerpt}</blockquote><div className={styles.sourceLinks}><Link href={`/drug-letters/${source.letter_id}`} prefetch={false}>{text("Open letter", "경고서한 열기")} <ArrowRight size={15} /></Link>{sourceUrl(source) ? <a href={sourceUrl(source)} target="_blank" rel="noreferrer">{text("FDA original", "FDA 원문")} <ExternalLink size={14} /></a> : null}</div>
          </details>)}
        </section>
      </div>

      {run.status === "completed" && brief?.findings ? <section id="research-brief" tabIndex={-1} className={styles.brief} aria-labelledby="research-brief-title">
        <div className={styles.sectionTitle}><span className={styles.checked}><ShieldCheck size={18} />{text("Sources checked · Human review draft", "근거 확인 완료 · 담당자 검토용 초안")}</span><div className={styles.exports}><button type="button" onClick={async () => { try { setCopyFailed(false); await navigator.clipboard.writeText(researchText(run)); setCopied(true); } catch { setCopyFailed(true); } }}><Copy size={17} />{copied ? text("Copied", "복사됨") : text("Copy brief", "브리핑 복사")}</button><SaveBriefButton runId={run.id} revision={run.revision} /><button type="button" onClick={download}><Download size={18} />{text("Download", "다운로드")}</button></div></div>
        <h2 id="research-brief-title">{brief.title}</h2><h3>{text("Findings from the FDA sources", "FDA 원문에서 확인한 내용")}</h3>
        <ol className={styles.findings}>{brief.findings.map((finding, index) => <li key={index}><p>{finding.statement}</p><div className={styles.citations}>{finding.citation_ids.map((id) => <a key={id} href={`#source-${id}`} onClick={(event) => { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); setPeekSource(id); }}>{id}<ArrowRight size={13} /></a>)}</div></li>)}</ol>
        <h3 className={styles.briefHeading}><Target size={21} aria-hidden="true" />{text("Questions for your team", "우리 팀의 검토 질문")}</h3><ul>{brief.review_questions?.map((question) => <li key={question}>{question}</li>)}</ul>
        <details className={styles.reviewNotes}><summary><ShieldCheck size={19} aria-hidden="true" />{text("Limits & review notes", "조사의 한계와 검토 안내")}<ChevronRight size={16} aria-hidden="true" /></summary><ul>{brief.limitations?.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
        <p className={styles.scope}>{text("Check FDA originals before use. This AI draft is not a compliance decision.", "사용 전 FDA 원문을 확인하세요. AI 초안은 규정 준수 판단이 아닙니다.")}</p></details>
      </section> : active ? <div className={styles.waitingBrief}><FileText size={23} /><div><strong>{text("Brief in preparation", "브리핑 준비 중")}</strong><p>{text("Available after the evidence check", "근거 검토 후 확인할 수 있습니다")}</p></div></div> : null}
    </> : null}

    {peekSource && run?.sources.find(source => source.id === peekSource) && <SourceInspector id={run.sources.find(source => source.id === peekSource)!.letter_id} source={run.sources.find(source => source.id === peekSource)} onClose={() => setPeekSource(undefined)} />}
  </div>;
}

function ActivityItem({ event, text, time, fresh }: { fresh: boolean; event: ResearchEvent; text: (en: string, ko: string) => string; time: string }) {
  const label = activityLabel(event);
  return <li data-event-sequence={event.sequence} data-new-event={fresh}><span className={styles.eventIcon}><ActivityIcon kind={event.kind} size={16} /></span><div><div className={styles.eventHeading}><strong>{text(...label)}</strong><time dateTime={event.created_at}>{time}</time></div>{event.data.query ? <p className={styles.query}>{event.data.query}</p> : null}{event.data.count !== undefined ? <p>{event.kind.startsWith("search") ? text(`${event.data.count} candidate passages`, `관련 문단 ${event.data.count}건`) : text(`${event.data.count} source passages`, `원문 근거 ${event.data.count}건`)}</p> : null}{event.data.sources?.map((source) => <Link prefetch={false} key={source.id} href={`/drug-letters/${source.letter_id}`}>{source.id} · {source.company}</Link>)}{event.data.issues?.length ? <details><summary>{text("Review feedback", "검토 피드백")}</summary><ul>{event.data.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></details> : null}</div></li>;
}
