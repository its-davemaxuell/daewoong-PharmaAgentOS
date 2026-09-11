"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { portalNavigation } from "@/lib/navigation";
import type { AppRole } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n";
import { useChatHistory } from "./chat-history-context";
import { LanguageToggle } from "./language-toggle";
import { Search } from "./icons/Search";
import { Bell } from "./icons/Bell";
import { BriefcaseBusiness } from "./icons/BriefcaseBusiness";
import { Menu } from "./icons/Menu";
import { X } from "./icons/X";
import { PanelLeftClose } from "./icons/PanelLeftClose";
import { PanelLeftOpen } from "./icons/PanelLeftOpen";
import { MessageSquareText } from "./icons/MessageSquareText";
import { openCommandMenu } from "./workspace/commands";
import { useNavigationPrefetch } from "./workspace/use-navigation-prefetch";
import { ComparisonPanel } from "./workspace/comparison-panel";
import { AssistantPanel, openAssistant } from "./workspace/assistant-panel";

export function PortalShell({
  children,
  roles,
  linearWorkspace = true,
}: {
  children: React.ReactNode;
  roles: AppRole[];
  linearWorkspace?: boolean;
  newLetterNotification: { latestEventId?: string; occurredAt?: string };
}) {
  const { text } = useI18n();
  const path = usePathname();
  const { threads } = useChatHistory();
  const { navSections, navItems } = portalNavigation(linearWorkspace);
  const visible = navItems.filter(
    (item) => !item.requiredRole || roles.includes(item.requiredRole),
  );
  const current = visible.find(
    (item) => path === item.href || path.startsWith(item.href + "/"),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { prepare, shouldPrefetch } = useNavigationPrefetch();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setCollapsed(
          localStorage.getItem("pharma:sidebar-collapsed") === "true",
        );
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function toggle() {
    setCollapsed((value) => {
      try {
        localStorage.setItem("pharma:sidebar-collapsed", String(!value));
      } catch {}
      return !value;
    });
  }
  function close() {
    mobileDialog.current?.close();
    setMobile(false);
    trigger.current?.focus();
  }
  const navigation = (
    <>
      <Link
        className="continuity-brand"
        href="/dashboard"
        onClick={() => mobile && close()}
        aria-label="PharmaAgent OS"
      >
        <Image
          src="/brand/daewoong-symbol.svg"
          alt=""
          width={22}
          height={24}
          unoptimized
        />
        <span>
          PharmaAgent <small>OS</small>
        </span>
      </Link>
      <button
        className="continuity-search"
        onClick={openCommandMenu}
        title={text("Search · Ctrl K", "검색 · Ctrl K")}
      >
        <Search size={16} />
        <span>{text("Search workspace", "워크스페이스 검색")}</span>
        <kbd>⌘ K</kbd>
      </button>
      <Link
        className={`continuity-nav ${path === "/dashboard" ? "is-active" : ""}`}
        href="/dashboard"
        aria-current={path === "/dashboard" ? "page" : undefined}
        onClick={() => mobile && close()}
        title={text("Overview", "개요")}
      >
        <BriefcaseBusiness size={16} />
        <span>{text("Overview", "개요")}</span>
      </Link>
      {navSections
        .filter((section) => section.id !== "settings")
        .map((section) => (
          <section className="continuity-nav-group" key={section.id}>
            <h2>{text(section.en, section.ko)}</h2>
            <nav aria-label={text(section.en, section.ko)}>
              {visible
                .filter((item) => item.section === section.id)
                .map((item) => {
                  const active =
                    path === item.href || path.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`continuity-nav ${active ? "is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      title={text(item.en, item.ko)}
                      prefetch={shouldPrefetch(item.href)}
                      onPointerEnter={() => prepare(item.href)}
                      onFocus={() => prepare(item.href)}
                      onClick={() => mobile && close()}
                    >
                      <Icon size={16} />
                      <span>{text(item.en, item.ko)}</span>
                    </Link>
                  );
                })}
            </nav>
          </section>
        ))}
      <section className="continuity-recents">
        <h2>{text("Recent conversations", "최근 대화")}</h2>
        {threads.slice(0, 4).map((thread) => (
          <Link
            key={thread.id}
            href={`/chat/${thread.id}`}
            title={thread.title}
            onClick={() => mobile && close()}
          >
            <MessageSquareText size={14} />
            <span>{thread.title}</span>
          </Link>
        ))}
        {!threads.length && (
          <p>
            {text(
              "Your recent work will appear here.",
              "최근 작업이 여기에 표시됩니다.",
            )}
          </p>
        )}
        <Link
          href="/research"
          prefetch={shouldPrefetch("/research")}
          onFocus={() => prepare("/research")}
          onPointerEnter={() => prepare("/research")}
          onClick={() => mobile && close()}
        >
          {text("All research →", "전체 리서치 →")}
        </Link>
      </section>
      <footer className="continuity-sidebar-footer">
        {visible
          .filter((item) => item.section === "settings")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="continuity-nav"
                key={item.href}
                href={item.href}
                title={text(item.en, item.ko)}
                onClick={() => mobile && close()}
              >
                <Icon size={16} />
                <span>{text(item.en, item.ko)}</span>
              </Link>
            );
          })}
        <div className="continuity-session">
          <span className="continuity-avatar">P</span>
          <div>
            <strong>{text("Personal workspace", "개인 워크스페이스")}</strong>
            <small>
              {text("Saved to this browser session", "이 브라우저 세션에 저장")}
            </small>
          </div>
        </div>
      </footer>
    </>
  );
  return (
    <div
      className={`linear-workspace portal-shell continuity-shell ${collapsed ? "continuity-collapsed" : ""}`}
    >
      <aside
        id="primary-navigation"
        className="continuity-sidebar"
        aria-label={text("Primary navigation", "주요 탐색")}
      >
        {navigation}
      </aside>
      <header className="continuity-topbar">
        <button
          className="continuity-collapse"
          onClick={toggle}
          aria-label={
            collapsed
              ? text("Expand menu", "메뉴 펼치기")
              : text("Collapse menu", "메뉴 접기")
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>
        <button
          className="continuity-mobile-trigger"
          ref={trigger}
          aria-label={text("Open navigation", "탐색 메뉴 열기")}
          onClick={() => {
            setMobile(true);
            mobileDialog.current?.showModal();
          }}
        >
          <Menu size={18} />
        </button>
        <span className="continuity-location">
          {text("Workspace", "워크스페이스")}
          <span>/</span>
          <strong>
            {current
              ? text(current.en, current.ko)
              : path === "/dashboard"
                ? text("Overview", "개요")
                : path === "/research"
                  ? text("Research", "리서치")
                  : text("Case workspace", "케이스 워크스페이스")}
          </strong>
        </span>
        <div className="continuity-topbar-actions">
          <LanguageToggle />
          <Link href="/inbox" aria-label={text("Review queue", "검토 대기열")}>
            <Bell size={17} />
          </Link>
          <button
            aria-label={text("Open AI assistant", "AI 패널 열기")}
            onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); openAssistant(); }}
            title="Ctrl / ⌘ J"
          >
            <MessageSquareText size={16} />
            <span>{text("Ask AI", "AI 질문")}</span>
            <kbd>⌘ J</kbd>
          </button>
        </div>
      </header>
      <dialog
        ref={mobileDialog}
        className="continuity-mobile-nav"
        onClose={() => {
          setMobile(false);
          trigger.current?.focus();
        }}
      >
        <button
          className="continuity-mobile-close"
          onClick={close}
          aria-label={text("Close navigation", "탐색 메뉴 닫기")}
        >
          <X size={18} />
        </button>
        {mobile && navigation}
      </dialog>
      <main
        id="main-content"
        className="main-content portal-main continuity-main"
        tabIndex={-1}
      >
        {children}
      </main>
      <AssistantPanel />
      <ComparisonPanel />
    </div>
  );
}
export function PortalShellFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main id="main-content">{children}</main>;
}
