"use client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceScope } from "../workspace/provider";
import { workspaceJson } from "@/lib/workspace-client";
import { useI18n } from "@/lib/i18n";
type Inspection = { schema_version: 1; run_id: string; steps: Array<{ step_key: string; title: string }>; attempts: Array<{ id: string; step_key: string; attempt: number; status: string; error_code: string | null; inputs: unknown; output: unknown; usage: unknown }> };
export function RunInspector({ runId }: { runId: string }) {
  const scope = useWorkspaceScope();
  const { text } = useI18n();
  const query = useQuery({ queryKey: [scope, "run-inspection", runId], queryFn: async ({ signal }) => {
    const value = await workspaceJson(`runs/${runId}/inspection`, { signal }) as Inspection;
    if (value.schema_version !== 1 || value.run_id !== runId || !Array.isArray(value.steps) || !Array.isArray(value.attempts)) throw new Error("Invalid run inspection");
    return value;
  } });
  return <section className="research-context"><h3>{text("Run inspection", "실행 상세")}</h3><p>{text("Saved definition and execution attempts for this run.", "이 실행에 저장된 정의와 실행 시도 기록입니다.")}</p>
    {query.isPending ? <p role="status">{text("Loading…", "불러오는 중…")}</p> : query.isError ? <p role="alert">{text("Could not load execution details.", "실행 상세를 불러오지 못했습니다.")}</p> : query.data.steps.map(step => <details key={step.step_key}><summary>{step.title || step.step_key}</summary>{query.data.attempts.filter(attempt => attempt.step_key === step.step_key).map(attempt => <article key={attempt.id}><strong>{text("Attempt", "시도")} {attempt.attempt} · {attempt.status}</strong>{attempt.error_code && <p>{attempt.error_code}</p>}<details><summary>{text("Inputs and permissions", "입력 및 권한")}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(attempt.inputs, null, 2)}</pre></details><details><summary>{text("Usage", "사용량")}</summary><pre>{JSON.stringify(attempt.usage, null, 2)}</pre></details>{attempt.output !== null && <details><summary>{text("Saved output", "저장된 결과")}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(attempt.output, null, 2)}</pre></details>}</article>)}{!query.data.attempts.some(attempt => attempt.step_key === step.step_key) && <p>{text("Not reached", "아직 실행되지 않음")}</p>}</details>)}
    <button type="button" onClick={() => void query.refetch()}>{text("Refresh details", "상세 새로 고침")}</button>
  </section>;
}
