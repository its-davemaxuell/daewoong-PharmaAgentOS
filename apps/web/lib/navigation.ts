import { Network } from "@/components/icons/Network";
import { Bookmark } from "@/components/icons/Bookmark";
import { BriefcaseBusiness } from "@/components/icons/BriefcaseBusiness";
import { ChartNoAxesColumnIncreasing } from "@/components/icons/ChartNoAxesColumnIncreasing";
import { CircleHelp } from "@/components/icons/CircleHelp";
import { ClipboardCheck } from "@/components/icons/ClipboardCheck";
import { FileText } from "@/components/icons/FileText";
import { MessageSquareText } from "@/components/icons/MessageSquareText";
import { Settings } from "@/components/icons/Settings";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import type { AppRole } from "@/lib/auth-types";
export const legacyNavSections = [
  { id: "chatbot", en: "FDA Chatbot", ko: "FDA 챗봇", icon: MessageSquareText },
  { id: "agent", en: "FDA AI Agent", ko: "FDA AI 에이전트", icon: Network },
  { id: "settings", en: "Settings", ko: "설정", icon: Settings },
] as const;

export const legacyNavItems: Array<{
  en: string;
  ko: string;
  href: string;
  icon: typeof MessageSquareText;
  requiredRole?: AppRole;
  section: "chatbot" | "agent" | "review" | "settings" | "work" | "administration";
}> = [
  { en: "Chatbot", ko: "챗봇", href: "/ask", icon: MessageSquareText, section: "chatbot" },
  { en: "Warning letter library", ko: "경고서한 자료실", href: "/drug-letters", icon: FileText, section: "chatbot" },
  { en: "Saved sources", ko: "저장한 자료", href: "/saved-views", icon: Bookmark, section: "chatbot" },
  { en: "Regulatory trends", ko: "규제 동향", href: "/trends", icon: ChartNoAxesColumnIncreasing, section: "chatbot" },
  { en: "Source review", ko: "원문 검토", href: "/review", icon: ClipboardCheck, requiredRole: "reviewer", section: "chatbot" },
  { en: "Overview", ko: "개요", href: "/dashboard", icon: BriefcaseBusiness, section: "agent" },
  { en: "Research agent", ko: "리서치 에이전트", href: "/research", icon: Network, section: "agent" },
  { en: "My review drafts", ko: "내 검토 초안", href: "/requests", icon: BriefcaseBusiness, section: "agent" },
  { en: "Specialist agents", ko: "전문 에이전트", href: "/agents", icon: Network, section: "agent" },
  { en: "Team review records", ko: "팀 검토 기록", href: "/cases", icon: BriefcaseBusiness, section: "agent" },
  { en: "Review & approvals", ko: "검토 및 승인", href: "/approvals", icon: ClipboardCheck, section: "agent" },
  { en: "Agent evaluations", ko: "에이전트 평가", href: "/evaluations", icon: ShieldCheck, section: "agent" },
  { en: "Preferences", ko: "환경설정", href: "/settings", icon: Settings, section: "settings" },
  { en: "Getting started", ko: "이용 방법", href: "/help", icon: CircleHelp, section: "settings" },
  { en: "Service operations", ko: "서비스 운영", href: "/control-tower", icon: ChartNoAxesColumnIncreasing, section: "settings" },
  { en: "Admin", ko: "관리", href: "/admin", icon: ShieldCheck, requiredRole: "admin", section: "settings" },
];

export function portalNavigation(linearWorkspace = true) {
  if (!linearWorkspace) return { navSections: legacyNavSections, navItems: legacyNavItems };
  const navSections = [
    { id: "agent", en: "AI workspace", ko: "AI 워크스페이스", icon: Network },
    { id: "work", en: "My work", ko: "내 작업", icon: BriefcaseBusiness },
    { id: "chatbot", en: "Evidence library", ko: "근거 자료실", icon: FileText },
    { id: "review", en: "Team review", ko: "팀 검토", icon: ClipboardCheck },
    { id: "administration", en: "Agent management", ko: "에이전트 관리", icon: ShieldCheck },
    { id: "settings", en: "Utilities", ko: "도구 및 도움말", icon: Settings },
  ] as const;
  const navItems: typeof legacyNavItems = [
    { en: "RAG Chat", ko: "RAG 챗봇", href: "/ask", icon: MessageSquareText, section: "agent" },
    { en: "Research Agent", ko: "리서치 에이전트", href: "/research", icon: Network, section: "agent" },
    { en: "Overview", ko: "개요", href: "/dashboard", icon: BriefcaseBusiness, section: "work" },
    { en: "Inbox", ko: "받은 자료", href: "/inbox", icon: ClipboardCheck, section: "work" },
    { en: "Saved work", ko: "저장한 작업", href: "/saved-work", icon: Bookmark, section: "work" },
    { en: "Local drafts", ko: "기기 내 초안", href: "/requests", icon: FileText, section: "work" },
    { en: "FDA sources", ko: "FDA 원문", href: "/drug-letters", icon: FileText, section: "chatbot" },
    { en: "Saved sources", ko: "저장한 원문", href: "/saved-views", icon: Bookmark, section: "chatbot" },
    { en: "Trends", ko: "동향", href: "/trends", icon: ChartNoAxesColumnIncreasing, section: "chatbot" },
    { en: "Search", ko: "검색", href: "/search", icon: FileText, section: "chatbot" },
    { en: "Cases", ko: "케이스", href: "/cases", icon: BriefcaseBusiness, section: "review" },
    { en: "Source review", ko: "원문 검토", href: "/review", icon: ClipboardCheck, section: "review", requiredRole: "reviewer" },
    { en: "Approvals", ko: "승인", href: "/approvals", icon: ShieldCheck, section: "review" },
    { en: "Specialist agents", ko: "전문 에이전트", href: "/agents", icon: Network, section: "administration" },
    { en: "Agent evaluations", ko: "에이전트 평가", href: "/evaluations", icon: ShieldCheck, section: "administration" },
    { en: "Operations", ko: "운영", href: "/control-tower", icon: ChartNoAxesColumnIncreasing, section: "administration", requiredRole: "admin" },
    { en: "Admin", ko: "관리", href: "/admin", icon: ShieldCheck, section: "administration", requiredRole: "admin" },
    { en: "Usage", ko: "사용량", href: "/usage", icon: ChartNoAxesColumnIncreasing, section: "settings" },
    { en: "Settings", ko: "설정", href: "/settings", icon: Settings, section: "settings" },
    { en: "Help", ko: "도움말", href: "/help", icon: CircleHelp, section: "settings" },
  ];
  return { navSections, navItems };
}

/** Detail-route labels and compatibility destinations for the command menu. */
export const secondaryDestinations = [
  { en: "Chat", ko: "대화", href: "/ask" },
  { en: "Conversation", ko: "대화", href: "/chat" },
  { en: "Local drafts", ko: "기기 내 초안", href: "/requests" },
  { en: "Saved views", ko: "저장한 보기", href: "/saved-views" },
  { en: "Search", ko: "검색", href: "/search" },
  { en: "Specialist agents", ko: "전문 에이전트", href: "/agents" },
  { en: "Agent evaluations", ko: "에이전트 평가", href: "/evaluations" },
  { en: "Approvals", ko: "승인", href: "/approvals" },
  { en: "Source review", ko: "원문 검토", href: "/review", requiredRole: "reviewer" as AppRole },
  { en: "Admin", ko: "관리", href: "/admin", requiredRole: "admin" as AppRole },
];
