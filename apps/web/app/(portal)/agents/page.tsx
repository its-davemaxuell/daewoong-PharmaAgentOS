import type { Metadata } from "next";
import { AgentTeam } from "@/components/agent-platform/agent-team";
import { exampleSummaries } from "@/lib/public-examples";

export const metadata: Metadata = { title: "Agent team · 에이전트 팀" };
export default function AgentsPage() { return <AgentTeam examples={exampleSummaries().filter(example => ["case-plan", "regulatory-evidence", "internal-knowledge", "impact-analysis", "verification"].includes(example.slug))} />; }
