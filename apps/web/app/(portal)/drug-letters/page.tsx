import type { Metadata } from "next";
import { Suspense } from "react";
import { SourcesWorkspace } from "@/components/workspace/sources-workspace";
import { PageLoading } from "@/components/page-loading";

export const metadata: Metadata = { title: "의약품 경고서한 | Drug Letters" };

export default function DrugLettersPage() {
  return <Suspense fallback={<PageLoading contained />}><SourcesWorkspace /></Suspense>;
}
