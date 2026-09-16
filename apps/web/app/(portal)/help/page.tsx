import type { Metadata } from "next";
import { EmployeeGuide } from "@/components/agent-platform/employee-guide";
import { exampleSummaries } from "@/lib/public-examples";

export const metadata: Metadata = { title: "이용 방법 | Getting started" };
export default function HelpPage() { return <EmployeeGuide examples={exampleSummaries().filter(example => example.slug.startsWith("research-"))} />; }
