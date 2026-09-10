"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { workspaceJson } from "@/lib/workspace-client";
import type { BriefSummary } from "@/lib/workspace-types";
import { useWorkspaceScope } from "./provider";
import { ActionButton } from "./commands";
export function SaveBriefButton({ runId, revision }: { runId: string; revision: number }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => workspaceJson<BriefSummary>("research/briefs", { method: "POST", body: JSON.stringify({ run_id: runId, expected_revision: revision }) }), onSuccess: () => client.invalidateQueries({ queryKey: [scope, "briefs"] }) });
  return <span><ActionButton actionId="research.save-brief" label={text("Save brief snapshot", "브리핑 스냅샷 저장")} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? text("Saving…", "저장 중…") : text("Save snapshot", "스냅샷 저장")}</ActionButton>{mutation.isSuccess && <Link href={`/saved-work?brief=${mutation.data.id}`}>{text("Saved · Open snapshot", "저장됨 · 스냅샷 열기")}</Link>}{mutation.isError && <span role="alert">{text("Could not save this revision. Refresh and retry.", "이 버전을 저장하지 못했습니다. 새로고침 후 다시 시도하세요.")}</span>}</span>;
}
