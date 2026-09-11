import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
import { requirePortalRole } from "@/lib/backend-auth";
export const metadata = { title: "Admin | 관리자" };
export default async function Page() {
  await requirePortalRole("admin");
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="admin" revision={randomUUID()} /></Suspense>;
}
