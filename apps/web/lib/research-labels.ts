import type { ResearchStatus } from "./research-types";

const labels: Record<ResearchStatus, [string, string]> = {
  queued: ["Waiting to start", "시작 대기 중"],
  running: ["Working", "작업 중"],
  completed: ["Brief ready", "브리핑 준비 완료"],
  stopped: ["Stopped", "중지됨"],
  failed: ["Needs a retry", "다시 시도 필요"],
  limit_reached: ["Research limit reached", "리서치 한도 도달"],
  insufficient_evidence: ["More evidence needed", "추가 근거 필요"],
};
export function researchStatusLabel(status: ResearchStatus): [string, string] { return labels[status]; }
