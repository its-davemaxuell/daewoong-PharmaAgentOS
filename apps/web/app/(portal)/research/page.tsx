import { PageLoading } from "@/components/page-loading";
import { Suspense } from "react";
import { ResearchWorkspace } from "@/components/research/research-workspace";

export const metadata = { title: "FDA Research Agent · FDA 리서치 에이전트" };

export default function ResearchPage() {
  return <Suspense fallback={<PageLoading contained />}><ResearchWorkspace /></Suspense>;
}
