import { Suspense } from "react";
import { ChatEntry } from "@/components/prepared/chat-entry";
import { PageLoading } from "@/components/page-loading";
export default function AskPage() {
  return <Suspense fallback={<PageLoading contained />}><ChatEntry /></Suspense>;
}
