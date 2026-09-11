import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
import { redirect } from "next/navigation";
export const metadata = { title: "규제 모니터링 | Regulatory Monitoring" };
export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  if ((await searchParams).section === "saved") redirect("/saved-views");
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="trends" revision={randomUUID()} /></Suspense>;
}
