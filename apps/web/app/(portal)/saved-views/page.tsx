import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
export const metadata = { title: "저장된 경고서한 | Saved Drug Letters" };
export default function Page() {
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="saved-views" revision={randomUUID()} /></Suspense>;
}
