"use client";
import { portalNavigation } from "@/lib/navigation";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive } from "@/components/icons/Archive";
import { Bell } from "@/components/icons/Bell";
import { ChevronDown } from "@/components/icons/ChevronDown";
import { History } from "@/components/icons/History";
import { LockKeyhole } from "@/components/icons/LockKeyhole";
import { LoaderCircle } from "@/components/icons/LoaderCircle";
import { Menu } from "@/components/icons/Menu";
import { PanelLeftClose } from "@/components/icons/PanelLeftClose";
import { PanelLeftOpen } from "@/components/icons/PanelLeftOpen";
import { Plus } from "@/components/icons/Plus";
import { Search } from "@/components/icons/Search";
import { X } from "@/components/icons/X";
import { SelectionGroup, SelectionIndicator } from "./motion/selection";
import { openCommandMenu } from "./workspace/commands";
import { DensityControl } from "./workspace/density-control";
import { useNavigationPrefetch } from "./workspace/use-navigation-prefetch";
import { useMediaQuery } from "@/lib/ui-media";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveChatConversation,
  searchChatConversations,
} from "@/app/(portal)/ask/actions";
import { useChatHistory } from "@/components/chat-history-context";
import { LanguageToggle } from "@/components/language-toggle";
import { NavigationGroup } from "./navigation-group";
import { formatDate } from "@/components/ui";
import type { AppRole } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/ask" && pathname.startsWith("/chat/"));
}

export function PortalShell({
  children,
  roles,
  newLetterNotification: initialNotification,
  linearWorkspace = true,
}: {
  children: React.ReactNode;
  roles: AppRole[];
  linearWorkspace?: boolean;
  newLetterNotification: {
    latestEventId?: string;
    occurredAt?: string;
  };
}) {
  const { navSections, navItems } = portalNavigation(linearWorkspace);
  const router = useRouter();
  const { prepare: prefetchNavigation, shouldPrefetch } = useNavigationPrefetch();
  const pathname = usePathname();
  const workspaceRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileViewport = useMediaQuery("(max-width: 980px)");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewLetterNotification, setShowNewLetterNotification] = useState(false);
  const [historySectionOpen, setHistorySectionOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyResults, setHistoryResults] = useState<ReturnType<typeof useChatHistory>["threads"]>();
  const [historyActionError, setHistoryActionError] = useState<"search" | "archive">();
  const [historySearching, startHistorySearch] = useTransition();
  const [archivePending, startArchiveTransition] = useTransition();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCollapseButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarExpandButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const { locale, text } = useI18n();
  const {
    threads,
    historyLoadState,
    activeThreadId,
    setActiveThreadId,
    removeThread,
    reloadHistory,
    notification,
  } = useChatHistory();
  const newLetterNotification = notification ?? initialNotification;
  const notificationStorageKey = "pharmaagent-os:new-letter-seen";

  const visibleNav = navItems.filter((item) => !item.requiredRole || roles.includes(item.requiredRole));
  const activeItem = visibleNav.find((item) => isActive(pathname, item.href));
  const activeSection = navSections.find((section) => section.id === activeItem?.section);
  const [disclosures, setDisclosures] = useState<Record<string, boolean>>({});
  const normalizedHistoryQuery = historyQuery.trim().toLocaleLowerCase();
  const localHistoryMatches = useMemo(() => (
    normalizedHistoryQuery
      ? threads.filter((thread) => thread.title.toLocaleLowerCase().includes(normalizedHistoryQuery))
      : threads
  ), [normalizedHistoryQuery, threads]);
  const visibleThreads = normalizedHistoryQuery
    ? historyResults ?? localHistoryMatches
    : threads;
  const historyIsPreview = historyLoadState === "preview";
  const historyUnavailable = historyLoadState === "unavailable";
  const historyLoading = historyLoadState === "loading";

  useEffect(() => {
    let shouldShow = false;
    if (!newLetterNotification.latestEventId) {
      shouldShow = false;
    } else {
      try {
        shouldShow =
          window.localStorage.getItem(notificationStorageKey) !== newLetterNotification.latestEventId;
      } catch {
        shouldShow = true;
      }
    }

    const timer = window.setTimeout(() => setShowNewLetterNotification(shouldShow), 0);
    return () => window.clearTimeout(timer);
  }, [newLetterNotification.latestEventId, notificationStorageKey]);

  useEffect(() => {
    if (!normalizedHistoryQuery || historyLoadState !== "ready") return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      startHistorySearch(async () => {
        try {
          const result = await searchChatConversations(historyQuery);
          if (!cancelled) {
            setHistoryResults(result.unavailable ? localHistoryMatches : result.items);
            setHistoryActionError(result.unavailable ? "search" : undefined);
          }
        } catch {
          if (!cancelled) {
            setHistoryResults(localHistoryMatches);
            setHistoryActionError("search");
          }
        }
      });
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [historyLoadState, historyQuery, localHistoryMatches, normalizedHistoryQuery]);

  const archiveConversation = (threadId: string) => {
    if (archivePending) return;
    startArchiveTransition(async () => {
      try {
        await archiveChatConversation(threadId);
        setHistoryActionError(undefined);
        removeThread(threadId);
        setHistoryResults((current) => current?.filter((thread) => thread.id !== threadId));
        if (threadId === activeThreadId || pathname === `/chat/${threadId}`) {
          setActiveThreadId(undefined);
          router.push("/ask");
        }
      } catch {
        setHistoryActionError("archive");
      }
    });
  };

  const acknowledgeNewLetters = () => {
    if (newLetterNotification.latestEventId) {
      try {
        window.localStorage.setItem(notificationStorageKey, newLetterNotification.latestEventId);
      } catch {
        // The link remains usable when browser storage is restricted.
      }
    }
    setShowNewLetterNotification(false);
    closeMenu();
  };

  function closeMenu({ restoreFocus = false } = {}) {
    setMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  function collapseSidebar() {
    setSidebarCollapsed(true);
    requestAnimationFrame(() => sidebarExpandButtonRef.current?.focus());
  }

  function expandSidebar() {
    setSidebarCollapsed(false);
    requestAnimationFrame(() => sidebarCollapseButtonRef.current?.focus());
  }

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 981px)");
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    desktopViewport.addEventListener("change", closeAtDesktopBreakpoint);
    return () => desktopViewport.removeEventListener("change", closeAtDesktopBreakpoint);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const activeSidebar: HTMLElement = sidebar;

    const focusableSelector =
      'a[href], summary, button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(activeSidebar.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
          && !element.closest("[inert]")
          && element.getClientRects().length > 0
          && getComputedStyle(element).visibility !== "hidden",
      );

    focusableElements()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusableElements();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && (document.activeElement === first || !activeSidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className={`${linearWorkspace ? "linear-workspace " : ""}portal-shell${sidebarCollapsed ? " portal-shell--sidebar-collapsed" : ""}`}>
      <header className="topbar portal-header" inert={menuOpen || undefined}>
        <button
          ref={sidebarExpandButtonRef}
          className="icon-button portal-header__sidebar-expand"
          type="button"
          aria-controls="primary-navigation"
          aria-label={text("Expand menu", "메뉴 펼치기")}
          aria-expanded={!sidebarCollapsed}
          onClick={expandSidebar}
        >
          <PanelLeftOpen size={19} aria-hidden="true" />
        </button>
        <button
          ref={menuButtonRef}
          className="icon-button topbar__menu portal-header__menu-button"
          type="button"
          aria-controls="primary-navigation"
          aria-label={menuOpen
            ? text("Close navigation", "탐색 메뉴 닫기")
            : text("Open navigation", "탐색 메뉴 열기")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <Link
          className="wordmark wordmark--mobile portal-brand portal-brand--mobile"
          href="/dashboard"
          prefetch={false}
          aria-label={text("PharmaAgent OS workspace", "PharmaAgent OS 워크스페이스")}
          onClick={() => closeMenu()}
        >
          <Image className="os-brand-mark" src="/brand/daewoong-symbol.svg" alt="" width={29} height={30} unoptimized />
          <span className="os-brand-lockup"><span className="os-brand-name">PharmaAgent<span>OS</span></span><small>{text("Evidence workspace", "근거 중심 리서치 워크스페이스")}</small></span>
        </Link>

        <div className="portal-header__product" aria-label={text("Current service", "현재 서비스")}>
          <span className="os-header-context">
            {activeSection ? <span>{text(activeSection.en, activeSection.ko)}</span> : null}
            <strong>{activeItem ? text(activeItem.en, activeItem.ko) : text("Workspace", "워크스페이스")}</strong>
          </span>
        </div>

        <div className="portal-header__actions">
          <button className="topbar__search portal-header__search" onClick={openCommandMenu} aria-label={text("Actions and workspace search", "작업 및 워크스페이스 검색")}><Search size={16} aria-hidden="true" /><span>{text("Search or run an action", "검색 또는 작업 실행")}</span><kbd>Ctrl K</kbd></button>
          <Link
            className={`portal-header__notification${showNewLetterNotification ? " has-new" : ""}`}
            prefetch={false} href={linearWorkspace ? "/inbox" : "/drug-letters?sort=posted-desc"}
            aria-label={showNewLetterNotification
              ? text(
                  "New FDA warning letters are available. Open newest letters.",
                  "신규 FDA 경고서한이 있습니다. 최신 경고서한 열기.",
                )
              : text("Open newest FDA warning letters", "최신 FDA 경고서한 열기")}
            title={showNewLetterNotification && newLetterNotification.occurredAt
              ? text("New warning letters are available", "신규 경고서한이 있습니다")
              : text("Newest warning letters", "최신 경고서한")}
            onClick={acknowledgeNewLetters}
          >
            <Bell size={17} fill={showNewLetterNotification ? "currentColor" : "none"} aria-hidden="true" />
            {showNewLetterNotification ? (
              <span>NEW</span>
            ) : null}
          </Link>
          <LanguageToggle />
          {linearWorkspace && <DensityControl />}

        </div>
      </header>

      <aside
        ref={sidebarRef}
        inert={(mobileViewport ? !menuOpen : sidebarCollapsed) || undefined}
        id="primary-navigation"
        className={`sidebar portal-sidebar${menuOpen ? " sidebar--open portal-sidebar--open" : ""}`}
        aria-label={text("Primary navigation", "주요 탐색")}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? "true" : undefined}
      >
        <div className="portal-sidebar__header">
          <div className="portal-sidebar__brand-row">
            <Link
              className="wordmark portal-brand portal-brand--sidebar"
              href="/dashboard"
              prefetch={false}
              aria-label={text("PharmaAgent OS workspace", "PharmaAgent OS 워크스페이스")}
              onClick={() => closeMenu()}
            >
              <Image className="os-brand-mark" src="/brand/daewoong-symbol.svg" alt="" width={29} height={30} unoptimized />
              <span className="os-brand-lockup"><span className="os-brand-name">PharmaAgent<span>OS</span></span><small>{text("Evidence workspace", "근거 중심 리서치 워크스페이스")}</small></span>
            </Link>
            <button
              ref={sidebarCollapseButtonRef}
              className="portal-sidebar__collapse"
              type="button"
              aria-controls="primary-navigation"
              aria-label={text("Collapse menu", "메뉴 접기")}
              onClick={collapseSidebar}
            >
              <PanelLeftClose size={18} aria-hidden="true" />
            </button>
            <button
              className="portal-sidebar__close"
              type="button"
              aria-label={text("Close navigation", "탐색 메뉴 닫기")}
              onClick={() => closeMenu({ restoreFocus: true })}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <hr className="sidebar__rule portal-sidebar__divider" />

        <SelectionGroup><div className="portal-sidebar__sections">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const sectionActive = activeSection?.id === section.id;
            return (
              <NavigationGroup
                key={section.id}
                active={sectionActive}
                open={disclosures[section.id] ?? (sectionActive || (!activeSection && section.id === "chatbot"))}
                onToggle={() => setDisclosures(current => ({ ...current, [section.id]: !(current[section.id] ?? (sectionActive || (!activeSection && section.id === "chatbot"))) }))}
                label={<>
                  <SectionIcon size={20} aria-hidden="true" />
                  <span>{text(section.en, section.ko)}</span>
                  <ChevronDown className="portal-workspace-group__chevron" size={16} aria-hidden="true" />
                </>}
              >
                <nav className="portal-sidebar__nav" aria-label={text(section.en, section.ko)}>
                  <ul className="nav-list portal-nav">
                    {visibleNav.filter((item) => item.section === section.id).map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);
                      return (
                        <li className="portal-nav__item" key={item.href}>
                          <Link
                            className={`nav-link portal-nav__link ui-selection-control${active ? " nav-link--active portal-nav__link--active" : ""}`}
                            href={item.href}
                            prefetch={shouldPrefetch(item.href)}
                            onPointerEnter={() => prefetchNavigation(item.href)}
                            onFocus={() => prefetchNavigation(item.href)}
                            onTouchStart={() => prefetchNavigation(item.href)}
                            aria-current={active ? "page" : undefined}
                            onClick={() => closeMenu()}
                          >
                            {active && <SelectionIndicator tone="tinted" />}
                            <Icon className="portal-nav__icon" size={18} aria-hidden="true" />
                            <span className="portal-nav__label">{text(item.en, item.ko)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                {section.id === "chatbot" ? (
                  <section
                    className="portal-sidebar-section portal-sidebar-section--history"
                    data-open={historySectionOpen}
                  >
                    <button
                      className="portal-sidebar-section__trigger"
                      type="button"
                      aria-expanded={historySectionOpen}
                      aria-controls="portal-history-section"
                      onClick={() => setHistorySectionOpen((open) => !open)}
                    >
                      <span>{text("Chat history", "대화 기록")}</span>
                      <ChevronDown size={15} aria-hidden="true" />
                    </button>
                    <div
                      className="portal-sidebar-section__collapse"
                      data-open={historySectionOpen}
                      aria-hidden={!historySectionOpen}
                      inert={historySectionOpen ? undefined : true}
                    >
                      <div id="portal-history-section" className="portal-sidebar-section__content">
                        <button
                          className="portal-history-new"
                          type="button"
                          tabIndex={historySectionOpen ? undefined : -1}
                          onClick={() => {
                            setActiveThreadId(undefined);
                            closeMenu();
                            router.push(`/ask?new=${window.crypto.randomUUID()}`);
                          }}
                        >
                          <Plus size={15} aria-hidden="true" />
                          {text("New chat", "새 대화")}
                        </button>
                        <label className="portal-history-search">
                          <Search size={14} aria-hidden="true" />
                          <span className="sr-only">{text("Search chat history", "대화 기록 검색")}</span>
                          <input
                            type="search"
                            value={historyQuery}
                            maxLength={200}
                            tabIndex={historySectionOpen ? undefined : -1}
                            placeholder={text("Search conversations", "대화 내용 검색")}
                            onChange={(event) => {
                              setHistoryQuery(event.target.value);
                              setHistoryResults(undefined);
                              if (!event.target.value.trim() && historyActionError === "search") {
                                setHistoryActionError(undefined);
                              }
                            }}
                          />
                          {historySearching ? <LoaderCircle className="spin" size={13} aria-hidden="true" /> : null}
                        </label>
                        {historyUnavailable || historyIsPreview ? (
                          <div className="portal-history-notice" role={historyIsPreview ? "status" : "alert"}>
                            <p>{historyIsPreview
                              ? text(
                                "Chat history is not saved in local preview mode.",
                                "로컬 미리보기 모드에서는 대화 기록이 저장되지 않습니다.",
                              )
                              : text(
                                "Chat history could not be loaded. Existing conversations are unchanged.",
                                "대화 기록을 불러오지 못했습니다. 기존 대화는 변경되지 않았습니다.",
                              )}</p>
                            {!historyIsPreview ? (
                              <button type="button" onClick={reloadHistory}>
                                {text("Try again", "다시 시도")}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {historyActionError ? (
                          <div className="portal-history-notice portal-history-notice--error" role="alert">
                            <p>{historyActionError === "search"
                              ? text(
                                "Server search is unavailable. Showing local title matches.",
                                "서버 검색을 사용할 수 없어 현재 목록의 제목 일치 결과를 표시합니다.",
                              )
                              : text(
                                "The chat was not archived because the server did not confirm the change.",
                                "서버가 변경을 확인하지 않아 대화를 보관하지 않았습니다.",
                              )}</p>
                            <button type="button" onClick={() => setHistoryActionError(undefined)}>
                              {text("Dismiss", "닫기")}
                            </button>
                          </div>
                        ) : null}
                        <nav className="portal-history-list" aria-label={text("Saved chats", "저장된 대화")}>
                          {historyLoading ? <p className="portal-history-empty" role="status">{text("Loading your conversations…", "대화 기록을 불러오고 있어요…")}</p> : null}
                          {visibleThreads.length ? visibleThreads.map((thread) => {
                            const active = thread.id === activeThreadId || pathname === `/chat/${thread.id}`;
                            return (
                              <div
                                className={`portal-history-item${active ? " is-active" : ""}`}
                                key={thread.id}
                              >
                                <Link
                                  href={`/chat/${thread.id}`}
                                  prefetch={false}
                                  scroll={false}
                                  tabIndex={historySectionOpen ? undefined : -1}
                                  onClick={() => {
                                    setActiveThreadId(thread.id);
                                    closeMenu();
                                  }}
                                >
                                  <History size={13} aria-hidden="true" />
                                  <span>
                                    <strong>{thread.title}</strong>
                                    <small>{formatDate(thread.lastMessageAt, undefined, locale)}</small>
                                  </span>
                                </Link>
                                <button
                                  type="button"
                                  disabled={archivePending}
                                  tabIndex={historySectionOpen ? undefined : -1}
                                  title={text("Archive chat", "대화 보관")}
                                  aria-label={text(`Archive ${thread.title}`, `${thread.title} 대화 보관`)}
                                  onClick={() => archiveConversation(thread.id)}
                                >
                                  <Archive size={13} aria-hidden="true" />
                                </button>
                              </div>
                            );
                          }) : historyUnavailable || historyIsPreview || historyLoading ? null : (
                            <p className="portal-history-empty">{normalizedHistoryQuery
                              ? text("No conversations match those keywords.", "해당 키워드와 일치하는 대화가 없습니다.")
                              : text("Saved conversations will appear here.", "저장된 대화가 여기에 표시됩니다.")}</p>
                          )}
                        </nav>
                        <p className="portal-history-security">
                          <LockKeyhole size={12} aria-hidden="true" />
                          {text("Private to this browser session", "이 브라우저 세션에 비공개 저장")}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
              </NavigationGroup>
            );
          })}
        </div></SelectionGroup>

        <footer className="sidebar__footer portal-sidebar__footer">
          <Image className="os-organization" src="/brand/daewoong-bio-logo.jpg" alt="Daewoong Bio" width={140} height={34} unoptimized />
          <div
            className="portal-sidebar__scope"
            title={text(
              "The evidence corpus is restricted to exact FDA Product: Drugs records",
              "근거 코퍼스는 FDA 제품 분류가 의약품(Drugs)과 정확히 일치하는 기록으로 제한됩니다",
            )}
          >
            <LockKeyhole className="portal-sidebar__scope-icon" size={16} aria-hidden="true" />
            <div className="portal-sidebar__scope-copy">
              <span>{text("Evidence scope", "근거 범위")}</span>
              <strong>{text("FDA Product: Drugs", "FDA 제품: 의약품")}</strong>
            </div>
          </div>
        </footer>
      </aside>

      <button
          className="sidebar-scrim portal-sidebar__scrim"
          type="button"
          data-open={menuOpen}
          inert={!menuOpen || undefined}
          aria-hidden={!menuOpen || undefined}
          tabIndex={-1}
          aria-label={text("Close navigation", "탐색 메뉴 닫기")}
          onClick={() => closeMenu({ restoreFocus: true })}
        />

      <main ref={workspaceRef} id="main-content" className="main-content portal-main" tabIndex={-1} inert={menuOpen || undefined}>
        {children}
      </main>
    </div>
  );
}

export function PortalShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-shell portal-shell--fallback">
      <header className="topbar portal-header portal-header--loading" aria-hidden="true" />
      <aside className="sidebar portal-sidebar portal-sidebar--loading" aria-hidden="true" />
      <main id="main-content" className="main-content portal-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
