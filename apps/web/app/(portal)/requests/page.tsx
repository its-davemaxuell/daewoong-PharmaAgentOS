import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
export const metadata = { title: "Review drafts | PharmaAgent OS" };
export default async function Page() {
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="requests" revision={randomUUID()} /></Suspense>;
}
