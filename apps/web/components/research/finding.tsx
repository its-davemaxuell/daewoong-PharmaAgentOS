"use client";
import { useI18n } from "@/lib/i18n";
import type { ResearchBrief } from "@/lib/research-types";
export function FindingSupport({ finding }: { finding: NonNullable<ResearchBrief["findings"]>[number] }) {
  const { text } = useI18n();
  if (!finding.support) return null;
  const labels = { supported: text("Supported by cited evidence", "인용 근거로 뒷받침됨"), contradicted: text("Contradicted by cited evidence", "인용 근거와 상충함"), insufficient: text("Insufficient evidence", "근거 불충분") };
  return <div className="research-finding-support"><strong>{labels[finding.support]}</strong>{finding.limitations?.map(value => <p key={value}>{value}</p>)}</div>;
}
