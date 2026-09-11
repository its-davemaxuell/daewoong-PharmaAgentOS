"use client";
import type { MenuData } from "@/lib/menu-data-types";
import { BilingualText as T } from "@/lib/i18n";
import { ReleaseForm, RunForm, SuiteForm } from "@/components/agent-platform/evaluation-forms";
import styles from "@/components/agent-platform/governance.module.css";


export function EvaluationsView({ value }: { value: MenuData["evaluations"] }) {
  const { suites, runs, inventory, canDevelop, canRelease } = value;
  return (
    <div className={styles.page}>
      <header><span><T en="Version qualification" ko="버전 검증" /></span><h1><T en="Agent evaluations" ko="에이전트 평가" /></h1><p><T en="Inspect version-bound suites, repeated trials, and the evidence required for a release decision." ko="버전별 평가 기준, 반복 시험 결과, 릴리스 판단에 필요한 근거를 확인합니다." /></p></header>
      {canDevelop ? <section className={styles.formGrid}><SuiteForm /><RunForm suites={suites} inventory={inventory} /></section> : null}
      <section className={styles.section}><div className={styles.sectionHeading}><div><span><T en="Versioned suites" ko="버전별 평가 기준" /></span><h2>{suites.length} <T en="qualification definitions" ko="개의 평가 기준" /></h2></div></div>{!suites.length ? <div className={styles.empty}><strong><T en="No qualification suites yet" ko="아직 평가 기준이 없습니다" /></strong><T en="An authorized developer can register the first version-bound suite." ko="권한이 있는 개발자가 첫 버전별 평가 기준을 등록할 수 있습니다." /></div> : null}<div className={styles.cardGrid}>{suites.map((suite) => <article className={styles.card} key={suite.id}><span>{suite.targetKind.replaceAll("_", " ")}</span><h3>{suite.name}</h3><p>{suite.suiteKey}@{suite.version} · {suite.caseCount} cases</p><code title={suite.suiteSha256}>{suite.suiteSha256.slice(0, 12)}…{suite.suiteSha256.slice(-12)}</code></article>)}</div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><div><span><T en="Trial history" ko="시험 기록" /></span><h2>{runs.length} <T en="evaluation runs" ko="개의 평가 실행" /></h2></div></div>{!runs.length ? <div className={styles.empty}><strong><T en="No evaluation runs recorded" ko="기록된 평가 실행이 없습니다" /></strong><T en="Completed trials and their release evidence will appear here." ko="완료된 시험과 릴리스 근거가 여기에 표시됩니다." /></div> : null}<div className={styles.runList}>{runs.map((run) => <article className={styles.run} key={run.id} data-status={run.status.toLowerCase()}><div><span>{run.targetKind.replaceAll("_", " ")}</span><h3>{run.status} · {run.passedTrials}/{run.totalTrials} trials</h3><p>{run.criticalFailures} critical failures · ${run.totalCostUsd.toFixed(4)} · {run.totalLatencyMs}ms</p></div><dl><div><dt>Pass rate</dt><dd>{Math.round(Number(run.metrics.pass_rate ?? 0) * 100)}%</dd></div><div><dt>Trajectory events</dt><dd>{run.trials.reduce((sum, trial) => sum + trial.trajectory.length, 0)}</dd></div></dl><code title={run.targetSha256}>{run.targetSha256.slice(0, 10)}…{run.targetSha256.slice(-10)}</code>{canRelease ? <ReleaseForm run={run} /> : null}</article>)}</div></section>
    </div>
  );
}
