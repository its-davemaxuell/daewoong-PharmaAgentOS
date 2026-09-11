import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { MenuWorkspace } from "@/components/prepared/menu-workspace";
import { PageLoading } from "@/components/page-loading";
export const metadata = {
  title: "Regulatory Cases | PharmaAgent OS",
  description: "Version-bound regulatory impact review cases and their approval history.",
};
export default async function Page() {
  return <Suspense fallback={<PageLoading contained />}><MenuWorkspace name="cases" revision={randomUUID()} /></Suspense>;
}
