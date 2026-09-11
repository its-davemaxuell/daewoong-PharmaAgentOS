import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
import { requirePortalRole } from "@/lib/backend-auth";
export const metadata = { title: "Review | 검토" };
export default async function Page() {
  await requirePortalRole("reviewer");
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="review" revision={randomUUID()} /></Suspense>;
}
