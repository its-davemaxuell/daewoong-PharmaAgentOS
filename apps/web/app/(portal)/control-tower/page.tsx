import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
export const metadata = { title: "Agent Control Tower | PharmaAgent OS" };
export default async function Page() {
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="control-tower" revision={randomUUID()} /></Suspense>;
}
