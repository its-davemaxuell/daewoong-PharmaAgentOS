"use client";

import { useActionState } from "react";
import {
  approveReleaseAction,
  createStandardSuiteAction,
  EMPTY_EVALUATION_ACTION_STATE,
  runSuiteAction,
} from "@/app/(portal)/evaluations/actions";
import type { EvaluationRun, EvaluationSuite, InventoryItem } from "@/lib/governance-api-client";
import { Button } from "../controls";
import { BilingualText as T, useI18n } from "@/lib/i18n";
import styles from "./governance.module.css";

function State({ state }: { state: typeof EMPTY_EVALUATION_ACTION_STATE }) {
  return state.status === "idle" ? null : <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? styles.error : styles.success}>{state.message}</p>;
}

export function SuiteForm() {
  const { text } = useI18n();
  const [state, action, pending] = useActionState(createStandardSuiteAction, EMPTY_EVALUATION_ACTION_STATE);
  return <form className={styles.form} action={action}><h2>Create a qualification suite</h2><label>Suite key<input name="suite_key" placeholder="verification-release-2026" pattern="[a-z][a-z0-9-]+" required /></label><label>Target kind<select name="target_kind"><option value="AGENT_VERSION">Agent version</option><option value="WORKFLOW_VERSION">Workflow version</option></select></label><Button type="submit" variant="primary" pending={pending} pendingLabel={text("Creating…", "등록 중…")}><T en="Create immutable suite" ko="평가 기준 등록" /></Button><State state={state} /></form>;
}

export function RunForm({ suites, inventory }: { suites: EvaluationSuite[]; inventory: InventoryItem[] }) {
  const { text } = useI18n();
  const [state, action, pending] = useActionState(runSuiteAction, EMPTY_EVALUATION_ACTION_STATE);
  return <form className={styles.form} action={action}><h2>Run three trials</h2><label>Suite<select name="suite_id" required>{suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.suiteKey}@{suite.version}</option>)}</select></label><label>Exact target<select name="target_version_id" required>{inventory.filter((item) => item.kind === "AGENT_VERSION" || item.kind === "WORKFLOW_VERSION").map((item) => <option key={item.id} value={item.id} data-kind={item.kind}>{item.key}@{item.version} · {item.releaseStatus}</option>)}</select></label><label>Target kind<select name="target_kind"><option value="AGENT_VERSION">Agent version</option><option value="WORKFLOW_VERSION">Workflow version</option></select></label><Button type="submit" variant="primary" pending={pending} pendingLabel={text("Running…", "실행 중…")} disabled={!suites.length || !inventory.some(item => item.kind === "AGENT_VERSION" || item.kind === "WORKFLOW_VERSION")}><T en="Execute evaluation" ko="평가 실행" /></Button>{!suites.length ? <small><T en="Register a suite before running an evaluation." ko="평가 기준을 먼저 등록하세요." /></small> : null}<State state={state} /></form>;
}

export function ReleaseForm({ run }: { run: EvaluationRun }) {
  const { text } = useI18n();
  const [state, action, pending] = useActionState(approveReleaseAction, EMPTY_EVALUATION_ACTION_STATE);
  return <form className={styles.releaseForm} action={action}><input type="hidden" name="run_id" value={run.id} /><input type="hidden" name="target_sha256" value={run.targetSha256} /><select name="target_status" aria-label="Release environment"><option value="STAGING">Staging</option><option value="PRODUCTION">Production</option></select><input name="reason" minLength={8} maxLength={2_000} placeholder="Release rationale" required /><Button type="submit" variant="primary" pending={pending} pendingLabel={text("Recording…", "기록 중…")} disabled={run.status !== "PASSED"}><T en="Approve release" ko="릴리스 승인" /></Button><State state={state} /></form>;
}
