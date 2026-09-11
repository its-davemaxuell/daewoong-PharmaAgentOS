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
  section: typeof legacyNavSections[number]["id"];
}> = [
  { en: "Chatbot", ko: "챗봇", href: "/ask", icon: MessageSquareText, section: "chatbot" },
  { en: "Warning letter library", ko: "경고서한 자료실", href: "/drug-letters", icon: FileText, section: "chatbot" },
  { en: "Saved sources", ko: "저장한 자료", href: "/saved-views", icon: Bookmark, section: "chatbot" },
  { en: "Regulatory trends", ko: "규제 동향", href: "/trends", icon: ChartNoAxesColumnIncreasing, section: "chatbot" },
  { en: "Source review", ko: "원문 검토", href: "/review", icon: ClipboardCheck, requiredRole: "reviewer", section: "chatbot" },
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
    { id: "chatbot", en: "Intelligence", ko: "규제 인텔리전스", icon: FileText },
    { id: "agent", en: "Work", ko: "내 작업", icon: BriefcaseBusiness },
    { id: "settings", en: "Workspace", ko: "워크스페이스", icon: Settings },
  ] as const;
  const navItems: typeof legacyNavItems = [
    { en: "Cases", ko: "케이스", href: "/cases", icon: BriefcaseBusiness, section: "chatbot" },
    { en: "Evidence", ko: "근거 자료", href: "/drug-letters", icon: FileText, section: "chatbot" },
    { en: "Trends", ko: "동향", href: "/trends", icon: ChartNoAxesColumnIncreasing, section: "chatbot" },
    { en: "Reviews", ko: "검토", href: "/inbox", icon: ClipboardCheck, section: "agent" },
    { en: "Saved", ko: "저장한 작업", href: "/saved-work", icon: Bookmark, section: "agent" },
    { en: "Settings", ko: "설정", href: "/settings", icon: Settings, section: "settings" },
    { en: "Help", ko: "도움말", href: "/help", icon: CircleHelp, section: "settings" },
    { en: "Operations", ko: "운영", href: "/control-tower", icon: ShieldCheck, section: "settings", requiredRole: "admin" },
  ];
  return { navSections, navItems };
}
