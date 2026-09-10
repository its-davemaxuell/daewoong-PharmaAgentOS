"use client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceScope } from "../workspace/provider";
import { workspaceJson } from "@/lib/workspace-client";
import { Activity } from "@/components/icons/Activity";
import { CircleAlert } from "@/components/icons/CircleAlert";
import { LockKeyhole } from "@/components/icons/LockKeyhole";
import { RunControlForm, RunStartForm, RunStepDecisionForm } from "./case-forms";
import { parseCaseRun, parseRunEventPage, isPlanBindingCurrent, formatCaseStatus, shortHash, type RunEvent, type CaseRun, type CasePlan, type AgentCase } from "@/lib/case-types";
import styles from "./case-workbench.module.css";
function formatDate(value: string) { return new Date(value).toLocaleString(); }
function runEventText(event: RunEvent): string {
  const step = typeof event.payload.step_key === "string"
    ? event.payload.step_key.replaceAll("_", " ")
    : undefined;
  if (event.eventType === "RUN_STARTED") return "Run accepted and queued for durable execution.";
  if (event.eventType === "AGENT_STARTED") return `${step ?? "Specialist"} started.`;
  if (event.eventType === "AGENT_COMPLETED") return `${step ?? "Specialist"} completed.`;
  if (event.eventType === "APPROVAL_REQUESTED") return `${step ?? "Step"} awaits independent approval.`;
  if (event.eventType === "APPROVAL_DECIDED") {
    return `${step ?? "Step"} ${event.payload.decision === "approve" ? "approved" : "rejected"}.`;
  }
  if (event.eventType === "LIMIT_EXCEEDED") return "Runtime stopped work at a hard limit.";
  return event.eventType.replaceAll("_", " ").toLocaleLowerCase();
}

export function ExecutionPanel({
  agentCase,
  plan,
  run: initialRun,
  runEvents: initialEvents,
  runLoadError,
  runIntentId,
  stepDecisionIntentId,
  canControlRun,
  canDecideStep,
}: {
  agentCase: AgentCase;
  plan?: CasePlan;
  run?: CaseRun;
  runEvents: RunEvent[];
  runLoadError?: string;
  runIntentId: string;
  stepDecisionIntentId: string;
  canControlRun: boolean;
  canDecideStep: boolean;
}) {
  const scope = useWorkspaceScope();
  const runQuery = useQuery({ queryKey: [scope, "case-run", initialRun?.id],
    queryFn: async ({ signal }) => parseCaseRun(await workspaceJson(`runs/${initialRun!.id}`, { signal })),
    initialData: initialRun, enabled: Boolean(initialRun),
    refetchInterval: query => query.state.data && ["PENDING", "RUNNING", "WAITING_FOR_APPROVAL"].includes(query.state.data.status) ? 2000 : false });
  const eventsQuery = useQuery({ queryKey: [scope, "case-run-events", initialRun?.id, runQuery.data?.checkpoint.checkpointVersion],
    queryFn: async ({ signal }) => parseRunEventPage(await workspaceJson(`runs/${initialRun!.id}/events`, { signal })),
    enabled: Boolean(initialRun), refetchInterval: runQuery.data && ["PENDING", "RUNNING", "WAITING_FOR_APPROVAL"].includes(runQuery.data.status) ? 2000 : false });
  const run = runQuery.data;
  const runEvents = eventsQuery.data?.items ?? initialEvents;
  if (runLoadError) {
    return (
      <section className={styles.panelError} role="alert">
        <CircleAlert size={22} aria-hidden="true" />
        <div><strong>Run state could not be loaded.</strong><p>{runLoadError}</p></div>
      </section>
    );
  }
  if (!run) {
    const ready = agentCase.status === "READY"
      && plan?.approval.status === "APPROVED"
      && isPlanBindingCurrent(plan, agentCase);
    return (
      <div className={styles.workspacePanel}>
        <section className={styles.noPlan}>
          <p className={styles.sectionIndex}>Execution / not started</p>
          <h2>Start only from an exact approved binding.</h2>
          <p>The durable runtime revalidates the plan, source state, workflow release, agent versions, tool permissions, and budgets before dispatch.</p>
        </section>
        {ready && canControlRun && plan ? (
          <RunStartForm caseId={agentCase.id} plan={plan} intentId={runIntentId} />
        ) : (
          <section className={styles.readOnlyNotice}>
            <LockKeyhole size={18} aria-hidden="true" />
            <div>
              <strong>{ready ? "Awaiting the case owner." : "Run start is locked."}</strong>
              <p>{ready
                ? "A Regulatory Analyst or System Owner can start this approved plan."
                : "Create and independently approve a current plan before execution."}</p>
            </div>
          </section>
        )}
      </div>
    );
  }
  const terminal = ["COMPLETED", "BLOCKED", "FAILED", "CANCELLED"].includes(run.status);
  return (
    <div className={styles.workspacePanel}>
      {(runQuery.isError || eventsQuery.isError) && <p role="alert">Live updates unavailable. Displaying the last saved state. <button onClick={() => { void runQuery.refetch(); void eventsQuery.refetch(); }}>Retry</button></p>}
      <section className={styles.runHeader}>
        <div>
          <p className={styles.sectionIndex}>Run / {run.id.slice(0, 8).toLocaleUpperCase()}</p>
          <h2>{formatCaseStatus(run.status)}</h2>
          <p>
            Workflow {run.checkpoint.workflowTemplate.workflowKey} · v{run.checkpoint.workflowTemplate.version}
            {run.checkpoint.stepKey ? ` · ${run.checkpoint.stepKey.replaceAll("_", " ")}` : ""}
          </p>
        </div>
        <div className={styles.runCheckpoint}>
          <span>Checkpoint</span>
          <strong>v{run.checkpoint.checkpointVersion}</strong>
          <small>{run.activeInvocation ? `Attempt ${run.activeInvocation.attempt}` : "No active invocation"}</small>
        </div>
      </section>

      {canControlRun && !terminal ? (
        <RunControlForm caseId={agentCase.id} run={run} intentId={runIntentId} />
      ) : null}
      {canDecideStep && run.status === "WAITING_FOR_APPROVAL" ? (
        <RunStepDecisionForm
          caseId={agentCase.id}
          run={run}
          intentId={stepDecisionIntentId}
        />
      ) : null}

      <section className={styles.runSteps}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionIndex}>Persisted graph</p><h2>Plan-step state</h2></div>
          <Activity size={21} aria-hidden="true" />
        </div>
        <ol>
          {plan?.steps.map((step) => {
            const state = run.checkpoint.steps[step.stepKey];
            return (
              <li key={step.id} data-status={state?.status.toLocaleLowerCase()}>
                <span>{String(step.position).padStart(2, "0")}</span>
                <div><strong>{step.title}</strong><small>{state ? formatCaseStatus(state.status) : "Unavailable"}</small></div>
                <code>{state?.outputSha256 ? shortHash(state.outputSha256, 6) : state?.attempt ? `attempt ${state.attempt}` : "pending"}</code>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.runBudget}>
        <div><span>Turns</span><strong>{run.checkpoint.budget.turns}</strong></div>
        <div><span>Tool calls</span><strong>{run.checkpoint.budget.toolCalls}</strong></div>
        <div><span>Tokens</span><strong>{run.checkpoint.budget.inputTokens + run.checkpoint.budget.outputTokens}</strong></div>
        <div><span>Runtime</span><strong>{run.checkpoint.budget.runtimeSeconds.toFixed(1)}s</strong></div>
        <div><span>Cost</span><strong>${run.checkpoint.budget.costUsd.toFixed(2)}</strong></div>
      </section>

      <section className={styles.runTimeline}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionIndex}>Live timeline</p><h2>{runEvents.length} run events</h2></div>
          <small>{terminal ? "Final" : "Refreshes every 2 seconds"}</small>
        </div>
        <ol>
          {runEvents.map((event) => (
            <li key={event.id}>
              <span>{String(event.sequence).padStart(3, "0")}</span>
              <div><strong>{runEventText(event)}</strong><small>{event.actorId} · {formatDate(event.occurredAt)}</small></div>
              <code title={event.eventHash}>{shortHash(event.eventHash, 6)}</code>
            </li>
          ))}
        </ol>
      </section>
      {run.errorCode ? (
        <section className={styles.panelError} role="alert">
          <CircleAlert size={22} aria-hidden="true" />
          <div><strong>Run stopped.</strong><p>{run.errorCode.replaceAll("_", " ")}</p></div>
        </section>
      ) : null}
    </div>
  );
}
