"use client";

import { useWorkspaceAction } from "./workspace/commands";

import "@/app/chat-workspace.css";
import Link from "next/link";
import { applyStreamEvent } from "@/lib/chat-turn-state";
import { ChatStreamFailure, consumeChatStream } from "@/lib/chat-stream";
import { SessionNotice } from "@/components/session-notice";
import { readEvidenceCoverage } from "@/lib/evidence-state";
import { useRouter } from "next/navigation";
import { ArrowUp } from "@/components/icons/ArrowUp";
import { ArrowDown } from "@/components/icons/ArrowDown";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { MessageSquare } from "@/components/icons/MessageSquare";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import { Bot } from "@/components/icons/Bot";
import { CalendarDays } from "@/components/icons/CalendarDays";
import { Check } from "@/components/icons/Check";
import { ChevronDown } from "@/components/icons/ChevronDown";
import { CircleAlert } from "@/components/icons/CircleAlert";
import { Copy } from "@/components/icons/Copy";
import { FileSearch } from "@/components/icons/FileSearch";
import { FileText } from "@/components/icons/FileText";
import { Filter } from "@/components/icons/Filter";
import { LockKeyhole } from "@/components/icons/LockKeyhole";
import { GitBranch } from "@/components/icons/GitBranch";
import { Pencil } from "@/components/icons/Pencil";
import { Paperclip } from "@/components/icons/Paperclip";
import { Pin } from "@/components/icons/Pin";
import { ThumbsUp } from "@/components/icons/ThumbsUp";
import { ThumbsDown } from "@/components/icons/ThumbsDown";
import { Plus } from "@/components/icons/Plus";
import { RotateCcw } from "@/components/icons/RotateCcw";
import { Search } from "@/components/icons/Search";
import { SlidersHorizontal } from "@/components/icons/SlidersHorizontal";
import { Sparkles } from "@/components/icons/Sparkles";
import { Square } from "@/components/icons/Square";
import { X } from "@/components/icons/X";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  cancelChatRequest,
  clearChatDocumentFocus,
  createChatConversation,
  focusChatDocument,
  updateChatPreferences,
  branchChatConversation,
  submitChatFeedback,
  selectChatSources,
} from "@/app/(portal)/ask/actions";
import { ChatFind } from "./chat-find";
import { answerWithSources } from "@/lib/chat-copy";
import { RESEARCH_DRAFT_KEY } from "@/lib/research-draft";
import { Network } from "./icons/Network";
import { ChatLibrary } from "@/components/chat-library";
import { ChatThreadTools } from "@/components/chat-thread-tools";
import { Presence, PresenceSurface } from "./motion/presence";
import { MotionProvider } from "./motion/provider";
import { ChatEvidencePanel } from "@/components/chat-evidence-panel";
import { useChatHistory } from "@/components/chat-history-context";
import { beginnerPrompts } from "@/lib/beginner-prompts";
import { useI18n } from "@/lib/i18n";
import {
  type RagStreamPhase,
} from "@/lib/rag-contract";
import type {
  DataMode,
  ChatMessage,
  ChatModelProfile,
  ChatRetrievalMode,
  ChatRetrievalStrategy,
  ChatThread,
  ChatThreadSummary,
  Letter,
  RagAnswer,
  RagCitation,
  RagConversationMessage,
  RagFilter,
} from "@/lib/types";
import { formatDate } from "@/components/ui";
import { isTableDivider, tableCells } from "@/lib/chat-markdown";

type ChatTurn = {
  id: string;
  clientMessageId?: string;
  question: string;
  filters: RagFilter;
  requestLanguage?: "auto" | "en" | "ko";
  requestMaxSources?: number;
  requestRetrievalMode?: ChatRetrievalMode;
  requestModelProfile?: ChatModelProfile;
  contextMessages: number;
  persistedContext?: boolean;
  answer?: RagAnswer;
  mode?: DataMode;
  error?: string;
  cancelled?: boolean;
  persistedPending?: boolean;
  provisionalDraft?: string;
  streamAttempt?: number;
  streamPhase?: RagStreamPhase;
  feedbackRating?: "helpful" | "unhelpful";
};

function preserveChatOptionFocus(triggerId: string) {
  window.requestAnimationFrame(() => {
    if (document.activeElement === document.body) document.getElementById(triggerId)?.focus();
  });
}

type FilterOption = {
  value: string;
  count: number;
};

function formatDateTime(value: string, locale: "en" | "ko") {
  return formatDate(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }, locale);
}

function activeFilterEntries(filters: RagFilter) {
  return Object.entries(filters).filter((entry): entry is [keyof RagFilter, string] => Boolean(entry[1]));
}

function answerFromPersistedMessage(
  message: ChatMessage,
  threadId: string,
  fallbackFilters: RagFilter,
): RagAnswer {
  return {
    answer: message.content,
    interpretationLabel: message.interpretationLabel ?? "ai_synthesis",
    scopeLabel: "FDA Product: Drugs",
    filtersApplied: message.filtersApplied ?? fallbackFilters,
    evidenceSufficiency: readEvidenceCoverage(message.evidenceSufficiency),
    citations: message.citations,
    generatedAt: message.createdAt,
    requestId: message.ragQueryId ?? message.id,
    threadId,
    assistantMessageId: message.id,
    retrievalStrategy: message.retrievalStrategy ?? "none",
    routeReason: message.routeReason,
    requestedModelProfile: message.requestedModelProfile ?? "auto",
    effectiveModelProfile: message.effectiveModelProfile,
    effectiveModelId: message.effectiveModelId,
    attemptedModelId: message.attemptedModelId,
    generationUsed: message.generationUsed,
    focusedDocumentVersionId: message.focusedDocumentVersionId,
  };
}

function turnsFromPersistedThread(thread: ChatThread | undefined, fallbackFilters: RagFilter): ChatTurn[] {
  if (!thread) return [];
  const turns: ChatTurn[] = [];
  let activeTurn: ChatTurn | undefined;

  thread.messages.forEach((message) => {
    if (message.role === "user") {
      activeTurn = {
        id: message.id,
        clientMessageId: message.clientMessageId,
        question: message.content,
        filters: message.filtersApplied ?? fallbackFilters,
        requestLanguage: message.requestLanguage,
        requestMaxSources: message.requestMaxSources,
        requestRetrievalMode: message.requestRetrievalMode,
        requestModelProfile: message.requestModelProfile,
        contextMessages: 0,
        persistedContext: true,
      };
      turns.push(activeTurn);
      return;
    }
    if (!activeTurn) return;
    if (message.filtersApplied) activeTurn.filters = message.filtersApplied;
    activeTurn.requestLanguage = message.requestLanguage ?? activeTurn.requestLanguage;
    activeTurn.requestMaxSources = message.requestMaxSources ?? activeTurn.requestMaxSources;
    activeTurn.requestRetrievalMode = message.requestRetrievalMode
      ?? activeTurn.requestRetrievalMode;
    activeTurn.requestModelProfile = message.requestModelProfile ?? activeTurn.requestModelProfile;
    if (message.status === "pending" || message.status === "streaming") {
      activeTurn.persistedPending = true;
      return;
    }
    if (message.status === "error" || message.status === "cancelled") {
      activeTurn.error = message.content;
      activeTurn.cancelled = message.status === "cancelled";
      return;
    }
    activeTurn.answer = answerFromPersistedMessage(message, thread.id, activeTurn.filters);
    activeTurn.feedbackRating = message.feedbackRating;
  });

  return turns;
}

const CITATION_MARKER = /^\[((?:\d+\s*,\s*)*\d+)\]$/;
const INLINE_MARKDOWN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[(?:\d+\s*,\s*)*\d+\])/g;

function MarkdownInline({
  text,
  citations,
  onSelect,
}: {
  text: string;
  citations: RagCitation[];
  onSelect: (index: number, trigger: HTMLElement) => void;
}) {
  const { text: localize } = useI18n();
  return text.split(INLINE_MARKDOWN).filter(Boolean).map((part, partIndex) => {
    const citationMatch = part.match(CITATION_MARKER);
    if (citationMatch) {
      const citationIndexes = citationMatch[1]
        .split(",")
        .map((value) => Number(value.trim()) - 1)
        .filter((index) => citations[index]);
      if (!citationIndexes.length) return <span key={`${partIndex}-${part}`}>{part}</span>;
      return (
        <span className="inline-citation-group" key={`${partIndex}-${citationMatch[1]}`}>
          {citationIndexes.map((citationIndex, markerIndex) => {
            const citation = citations[citationIndex];
            return (
              <button
                className="inline-citation"
                type="button"
                key={`${citation.id}-${markerIndex}`}
                aria-label={localize(
                  `Open citation ${citationIndex + 1}: ${citation.company}`,
                  `${citation.company}의 ${citationIndex + 1}번 인용 열기`,
                )}
                onClick={(event) => onSelect(citationIndex, event.currentTarget)}
              >
                {citationIndex + 1}
              </button>
            );
          })}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${partIndex}-${part.slice(0, 10)}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${partIndex}-${part.slice(0, 10)}`}>{part.slice(1, -1)}</code>;
    }
    return <span key={`${partIndex}-${part.slice(0, 10)}`}>{part}</span>;
  });
}

export function MarkdownCitationText({
  text,
  citations,
  onSelect,
}: {
  text: string;
  citations: RagCitation[];
  onSelect: (index: number, trigger: HTMLElement) => void;
}) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: Array<{ ordered: boolean; content: string }> = [];

  const inline = (value: string, key: string) => (
    <MarkdownInline key={key} text={value} citations={citations} onSelect={onSelect} />
  );
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join("\n").trim();
    if (value) blocks.push(<p key={`paragraph-${blocks.length}`}>{inline(value, `inline-${blocks.length}`)}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    const ordered = listItems[0].ordered;
    const List = ordered ? "ol" : "ul";
    blocks.push(
      <List key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${index}-${item.content.slice(0, 16)}`}>{inline(item.content, `list-inline-${blocks.length}-${index}`)}</li>
        ))}
      </List>,
    );
    listItems = [];
  };

  let skipThrough = -1;
  lines.forEach((rawLine, lineIndex) => {
    if (lineIndex <= skipThrough) return;
    const line = rawLine.trimEnd();
    if (line.trimStart().startsWith("```")) {
      flushParagraph(); flushList();
      let end = lineIndex + 1;
      while (end < lines.length && !lines[end].trimStart().startsWith("```")) end += 1;
      blocks.push(<pre key={`code-${lineIndex}`}><code>{lines.slice(lineIndex + 1, end).join("\n")}</code></pre>);
      skipThrough = end;
      return;
    }
    const headings = tableCells(line);
    if (line.includes("|") && isTableDivider(lines[lineIndex + 1] ?? "", headings.length)) {
      flushParagraph(); flushList();
      const rows: string[][] = [];
      let end = lineIndex + 2;
      while (end < lines.length && lines[end].includes("|") && lines[end].trim()) {
        rows.push(tableCells(lines[end])); end += 1;
      }
      blocks.push(<div className="chat-answer-table" key={`table-${lineIndex}`} tabIndex={0} role="region" aria-label={headings.join(" / ")}>
        <table><thead><tr>{headings.map((cell, index) => <th scope="col" key={index}>{inline(cell, `th-${lineIndex}-${index}`)}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{headings.map((_, column) => <td key={column}>{inline(row[column] ?? "", `td-${lineIndex}-${index}-${column}`)}</td>)}</tr>)}</tbody>
        </table></div>);
      skipThrough = end - 1;
      return;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+?)\*\*:?$/);
    const unordered = line.match(/^\s*[-*•]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.+)$/);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading || boldHeading) {
      flushParagraph();
      flushList();
      const value = heading?.[1] ?? boldHeading?.[1] ?? "";
      blocks.push(<h3 key={`heading-${blocks.length}`}>{inline(value, `heading-inline-${blocks.length}`)}</h3>);
    } else if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (listItems.length && listItems[0].ordered !== isOrdered) flushList();
      listItems.push({ ordered: isOrdered, content: (ordered?.[1] ?? unordered?.[1] ?? "").trim() });
    } else if (quote) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={`quote-${blocks.length}`}>{inline(quote[1], `quote-inline-${blocks.length}`)}</blockquote>);
    } else {
      flushList();
      paragraph.push(line);
    }
  });
  flushParagraph();
  flushList();

  return (
    <div className="chat-answer__copy">
      {blocks}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="chat-filter-field">
      <span>{label}</span>
      <div>
        <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value} ({option.count})
            </option>
          ))}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </label>
  );
}

function FilterLabel({ name, value }: { name: keyof RagFilter; value: string }) {
  const { text } = useI18n();
  const labels: Record<keyof RagFilter, ReactNode> = {
    letterId: text("Letter", "경고서한"),
    company: text("Company", "기업"),
    issuingOffice: text("FDA office", "FDA 담당 부서"),
    category: text("Finding", "지적 유형"),
    regulation: text("Citation", "규정 인용"),
    subtype: text("Drug type", "의약품 유형"),
    dateFrom: text("Issued after", "발행 시작일"),
    dateTo: text("Issued before", "발행 종료일"),
    postedFrom: text("Posted after", "게시 시작일"),
    postedTo: text("Posted before", "게시 종료일"),
  };
  return <>{labels[name]}: {value}</>;
}

type ChatOption<Value extends string> = {
  value: Value;
  label: string;
  description: string;
  disabled?: boolean;
};

function ChatOptionMenu<Value extends string>({
  ariaLabel,
  triggerId,
  icon,
  value,
  options,
  onChange,
  disabled = false,
}: {
  ariaLabel: string;
  triggerId: string;
  icon: ReactNode;
  value: Value;
  options: ChatOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex] ?? options[0];

  const focusOption = useCallback((index: number) => {
    const next = options[index];
    if (!next || next.disabled) return;
    setActiveIndex(index);
    optionRefs.current[index]?.focus();
  }, [options]);

  const openMenu = useCallback((focusIndex = selectedIndex) => {
    if (disabled) return;
    const resolvedIndex = options[focusIndex]?.disabled
      ? Math.max(0, options.findIndex((option) => !option.disabled))
      : focusIndex;
    setActiveIndex(resolvedIndex);
    setOpen(true);
  }, [disabled, options, selectedIndex]);

  useEffect(() => {
    if (!open || disabled) return undefined;
    optionRefs.current[activeIndex]?.focus();
    return undefined;
  }, [activeIndex, disabled, open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    return () => document.removeEventListener("pointerdown", closeOnPointerDown);
  }, [open]);

  const moveFocus = (direction: 1 | -1) => {
    const currentIndex = optionRefs.current.findIndex((item) => item === document.activeElement);
    const origin = currentIndex >= 0 ? currentIndex : activeIndex;
    for (let offset = 1; offset <= options.length; offset += 1) {
      const nextIndex = (origin + direction * offset + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        focusOption(nextIndex);
        return;
      }
    }
  };

  return (
    <div className="chat-option-menu" data-open={open} ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        className="chat-option-menu__trigger"
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (open) moveFocus(event.key === "ArrowDown" ? 1 : -1);
            else openMenu();
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) setOpen(false);
            else openMenu();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        {icon}
        <span>{selectedOption?.label}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <div
        className="chat-option-menu__popover"
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        aria-hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveFocus(event.key === "ArrowDown" ? 1 : -1);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            const indexes = options
              .map((option, index) => (option.disabled ? -1 : index))
              .filter((index) => index >= 0);
            focusOption(event.key === "Home" ? indexes[0] : indexes.at(-1) ?? 0);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
      >
        {options.map((option, index) => (
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            disabled={disabled || option.disabled}
            tabIndex={open && activeIndex === index ? 0 : -1}
            key={option.value}
            ref={(node) => { optionRefs.current[index] = node; }}
            onFocus={() => setActiveIndex(index)}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            {option.value === value ? <Check size={14} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatWorkspace({
  letters: initialLetters,
  facets = {},
  dataMode = "live",
  initialLetterId = "",
  initialCompany = "",
  initialStarter,
  initialThread,
  landingSeed = "default",
  embedded = false,
}: {
  letters: Letter[];
  facets?: Record<string, FilterOption[]>;
  dataMode?: DataMode;
  initialLetterId?: string;
  initialCompany?: string;
  initialStarter?: string;
  initialThread?: ChatThread;
  landingSeed?: string;
  embedded?: boolean;
}) {
  const embeddedId = useId();
  const [letters, setLetters] = useState(initialLetters);
  const [sourceResults, setSourceResults] = useState(initialLetters);
  const [sourcePage, setSourcePage] = useState(1);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [sourcePending, setSourcePending] = useState(false);
  const [sourceFailed, setSourceFailed] = useState(false);
  const router = useRouter();
  const { locale, text } = useI18n();
  const {
    setActiveThreadId: setHistoryActiveThreadId,
    upsertThread,
  } = useChatHistory();
  const initialLetter = letters.find((letter) => letter.id === initialLetterId);
  const scopedCompany = initialCompany || initialLetter?.company || "";
  const initialRequiredLetterScope: RagFilter = initialLetterId
    ? { letterId: initialLetterId, company: scopedCompany || undefined }
    : {};
  const [question, setQuestion] = useState(() => initialLetter
    && !initialThread ? text(
        `Summarize the principal FDA findings and requested actions for ${initialLetter.company}.`,
        `${initialLetter.company}에 대한 FDA의 주요 지적 사항과 요청 조치를 요약해 주세요.`,
      )
    : beginnerPrompts.find((prompt) => prompt.id === initialStarter)?.prompt[locale] ?? "");
  const [filters, setFilters] = useState<RagFilter>(() =>
    initialLetterId
      ? {}
      : initialCompany
        ? { company: initialCompany }
        : {},
  );
  const [maxSources, setMaxSources] = useState(6);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(initialThread?.id);
  const [threadTitle, setThreadTitle] = useState(initialThread?.title ?? "");
  const [threadPinnedAt, setThreadPinnedAt] = useState(initialThread?.pinnedAt);
  const [threadArchivedAt, setThreadArchivedAt] = useState(initialThread?.archivedAt);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryTrigger = useRef<HTMLButtonElement>(null);
  const openConversations = useCallback(() => {
    libraryTrigger.current?.focus({ preventScroll: true });
    setLibraryOpen(true);
  }, []);
  useWorkspaceAction({ id: "chat.conversations", label: text("Search conversations", "대화 검색"), enabled: true, execute: openConversations });
  const [evidenceTurnId, setEvidenceTurnId] = useState<string>();
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  useEffect(() => {
    if (!sourcePickerOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSourcePending(true); setSourceFailed(false);
      try {
        const params = new URLSearchParams({ q: sourceSearch, page: String(sourcePage) });
        const response = await fetch(`/api/drug-letters?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Source search unavailable");
        const payload = await response.json();
        if (payload.mode !== "live" || !Array.isArray(payload.data?.items)) throw new Error("Source search unavailable");
        if (!controller.signal.aborted) {
          setSourceResults(payload.data.items); setSourceTotal(payload.data.total);
          setLetters(current => [...new Map([...current, ...payload.data.items].map(item => [item.id, item])).values()]);
        }
      } catch { if (!controller.signal.aborted) setSourceFailed(true); }
      finally { if (!controller.signal.aborted) setSourcePending(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sourcePickerOpen, sourceSearch, sourcePage]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>(initialThread?.activeLetterIds ?? (initialLetterId ? [initialLetterId] : []));
  const [actionError, setActionError] = useState<string>();
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);
  const [showJump, setShowJump] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [activeLetterIds, setActiveLetterIds] = useState<string[]>(() => (
    initialThread?.activeLetterIds.length
      ? initialThread.activeLetterIds
      : initialLetterId ? [initialLetterId] : []
  ));
  const [documentFocus, setDocumentFocus] = useState(initialThread?.focus);
  const [focusError, setFocusError] = useState<string>();
  const [modelProfile, setModelProfile] = useState<ChatModelProfile>(
    initialThread?.modelPreference ?? "auto",
  );
  const [retrievalMode, setRetrievalMode] = useState<ChatRetrievalMode>(() => {
    const preference = initialThread?.retrievalPreference ?? (initialLetterId ? "letter" : "auto");
    return ["auto", "none", "metadata", "letter", "corpus"].includes(preference)
      ? preference
      : "auto";
  });
  const [turns, setTurns] = useState<ChatTurn[]>(() => (
    turnsFromPersistedThread(initialThread, initialRequiredLetterScope)
  ));
  const [introducedTurns, setIntroducedTurns] = useState<Set<string>>(() => new Set());
  const [selectedCitation, setSelectedCitation] = useState<Record<string, number | undefined>>({});
  const [copiedTurn, setCopiedTurn] = useState<string>();
  const [activeLandingSeed, setActiveLandingSeed] = useState(landingSeed);
  const [activeRequestTurnId, setActiveRequestTurnId] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [focusPending, startFocusTransition] = useTransition();
  const [preferencesPending, startHistoryTransition] = useTransition();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const followConversationRef = useRef(true);
  const pendingRouteRef = useRef<string | undefined>(undefined);
  const queryPendingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | undefined>(undefined);
  const requestIdentityRef = useRef<{ threadId?: string; clientMessageId?: string }>({});
  const focusMutationRef = useRef(false);
  const preferenceMutationRef = useRef(false);
  const draftKey = `pharma-chat-draft:${initialThread?.id ?? landingSeed}`;
  const evidenceTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) setQuestion(saved.slice(0, 2000));
      } catch { /* The composer works when browser storage is disabled. */ }
      setDraftLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (question) sessionStorage.setItem(draftKey, question);
      else sessionStorage.removeItem(draftKey);
    } catch { /* Draft recovery is optional, sending is independent. */ }
    const composer = composerRef.current;
    if (composer) {
      composer.style.height = "auto";
      composer.style.height = `${Math.min(composer.scrollHeight, 200)}px`;
    }
  }, [question, draftKey, draftLoaded]);

  useEffect(() => {
    setHistoryActiveThreadId(activeThreadId);
  }, [activeThreadId, setHistoryActiveThreadId]);

  useEffect(() => {
    if (initialThread) upsertThread(initialThread);
  }, [initialThread, upsertThread]);

  useEffect(() => {
    if (!turns.length || !followConversationRef.current) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      const conversation = conversationRef.current;
      if (!conversation || !followConversationRef.current) return;
      conversation.scrollTop = conversation.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [turns]);

  useEffect(() => {
    if (!turns.some((turn) => turn.persistedPending)) return undefined;
    const intervalId = window.setInterval(() => router.refresh(), 3_000);
    return () => window.clearInterval(intervalId);
  }, [router, turns]);

  const categories = facets.category ?? [];
  const subtypes = facets.subtype ?? [];
  const primaryLetterId = documentFocus?.warningLetterId
    ?? (activeLetterIds.length === 1 ? activeLetterIds[0] : "");
  const primaryLetter = letters.find((letter) => letter.id === primaryLetterId);
  const primaryCompany = primaryLetter?.company || "";
  const requiredLetterScope: RagFilter = primaryLetterId
    ? { letterId: primaryLetterId, company: primaryCompany || undefined }
    : {};
  const letterScopeSuspended = Boolean(
    primaryLetterId && ["corpus", "none"].includes(retrievalMode),
  );
  const filtersForCurrentScope = letterScopeSuspended
    ? filters
    : { ...filters, ...requiredLetterScope };
  const activeFilters = activeFilterEntries(filtersForCurrentScope);
  const hasRemovableFilters = activeFilters.some(
    ([key]) => !(
      primaryLetterId
      && !letterScopeSuspended
      && (key === "letterId" || key === "company")
    ),
  );

  const modelProfileLabel = (profile: ChatModelProfile) => ({
    auto: text("Auto", "자동"),
    fast: text("Fast", "빠름"),
    balanced: text("Balanced", "균형"),
    deep: text("Deep analysis", "심층 분석"),
  })[profile];

  const modelOptions: ChatOption<ChatModelProfile>[] = [
    {
      value: "auto",
      label: text("Auto", "자동"),
      description: text("Choose the best model for this question", "질문에 맞는 모델을 자동 선택"),
    },
    {
      value: "fast",
      label: text("Fast", "빠름"),
      description: text("Quick answers for straightforward questions", "간단한 질문에 빠르게 답변"),
    },
    {
      value: "balanced",
      label: text("Balanced", "균형"),
      description: text("Balanced speed and reasoning", "속도와 분석 깊이의 균형"),
    },
    {
      value: "deep",
      label: text("Deep analysis", "심층 분석"),
      description: text("More reasoning for complex comparisons", "복잡한 비교를 더 깊게 분석"),
    },
  ];

  const retrievalOptions: ChatOption<ChatRetrievalMode>[] = [
    {
      value: "auto",
      label: text("Auto scope", "자동 범위"),
      description: text("Choose the right evidence scope per question", "질문별 적합한 근거 범위를 자동 선택"),
    },
    {
      value: "none",
      label: text("Conversation only", "대화만"),
      description: text("Do not search documents", "문서를 검색하지 않음"),
    },
    {
      value: "metadata",
      label: text("Letter metadata", "경고서한 기본 정보"),
      description: text("Dates, companies, offices, and record fields", "날짜, 기업, 담당 부서 등 기록 정보"),
    },
    {
      value: "letter",
      label: activeLetterIds.length > 1
        ? text("Selected letters", "선택 서한")
        : text("Current letter", "현재 서한"),
      description: text("Search only the document selected for this chat", "이 대화에서 선택한 문서만 검색"),
      disabled: !activeLetterIds.length,
    },
    {
      value: "corpus",
      label: text("All letters", "전체 코퍼스"),
      description: text("Search across the authorized Drug corpus", "승인된 의약품 전체 코퍼스 검색"),
    },
  ];

  const retrievalStrategyLabel = (strategy: ChatRetrievalStrategy) => ({
    none: text("Conversation context · no document search", "대화 문맥 사용 · 문서 검색 없음"),
    metadata: text("Letter metadata lookup", "경고서한 메타데이터 조회"),
    letter: text("Current-letter evidence", "현재 경고서한 근거 검색"),
    multi_letter: text("Selected-letter comparison", "선택 경고서한 비교 검색"),
    corpus: text("FDA source search", "FDA 자료 검색"),
  })[strategy];

  const streamPhaseLabel = (phase?: RagStreamPhase) => ({
    retrieving: text("Finding relevant FDA sources", "관련 FDA 자료를 찾고 있어요"),
    generating: text("Writing your answer", "답변을 정리하고 있어요"),
    validating: text("Checking the answer against its sources", "답변과 원문 근거를 확인하고 있어요"),
  })[phase ?? "retrieving"];

  const newChatHref = (seed: string) => {
    const params = new URLSearchParams();
    if (primaryLetterId) params.set("letter", primaryLetterId);
    if (primaryCompany) params.set("company", primaryCompany);
    params.set("new", seed);
    return `/ask?${params.toString()}`;
  };

  const clearConversation = () => {
    const nextLandingSeed = window.crypto.randomUUID();
    setActiveLandingSeed(nextLandingSeed);
    setTurns([]);
    setQuestion(initialLetter
      ? text(
          `Summarize the principal FDA findings and requested actions for ${initialLetter.company}.`,
          `${initialLetter.company}에 대한 FDA의 주요 지적 사항과 요청 조치를 요약해 주세요.`,
        )
      : "");
    setActiveThreadId(undefined);
    setThreadTitle("");
    setThreadPinnedAt(undefined);
    setThreadArchivedAt(undefined);
    setEvidenceTurnId(undefined);
    setActionError(undefined);
    setDocumentFocus(undefined);
    setFocusError(undefined);
    setActiveLetterIds(primaryLetterId ? [primaryLetterId] : []);
    setModelProfile("auto");
    setRetrievalMode(primaryLetterId ? "letter" : "auto");
    setFilters(primaryLetterId ? {} : initialCompany ? { company: initialCompany } : {});
    setSelectedCitation({});
    requestControllerRef.current?.abort();
    requestControllerRef.current = undefined;
    requestIdentityRef.current = {};
    setActiveRequestTurnId(undefined);
    setHistoryActiveThreadId(undefined);
    pendingRouteRef.current = undefined;
    followConversationRef.current = true;
    if (!embedded) router.push(newChatHref(nextLandingSeed), { scroll: false });
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const changeModelProfile = (nextProfile: ChatModelProfile) => {
    if (preferenceMutationRef.current || focusMutationRef.current) return;
    if (nextProfile === modelProfile) return;
    const previous = modelProfile;
    setModelProfile(nextProfile);
    if (!activeThreadId) return;
    preferenceMutationRef.current = true;

    startHistoryTransition(async () => {
      try {
        const updated = await updateChatPreferences(activeThreadId, {
          modelPreference: nextProfile,
        });
        upsertThread(updated);
      } catch {
        setModelProfile(previous);
      } finally {
        preferenceMutationRef.current = false;
        preserveChatOptionFocus(embedded ? `${embeddedId}-model` : "chat-model-selector");
      }
    });
  };

  const changeRetrievalMode = (nextMode: ChatRetrievalMode) => {
    if (preferenceMutationRef.current || focusMutationRef.current) return;
    if (nextMode === retrievalMode) return;
    const previous = retrievalMode;
    setRetrievalMode(nextMode);
    if (!activeThreadId) return;
    preferenceMutationRef.current = true;

    startHistoryTransition(async () => {
      try {
        const updated = await updateChatPreferences(activeThreadId, {
          retrievalPreference: nextMode,
        });
        setDocumentFocus(updated.focus);
        setActiveLetterIds(updated.activeLetterIds);
        upsertThread(updated);
      } catch {
        setRetrievalMode(previous);
      } finally {
        preferenceMutationRef.current = false;
        preserveChatOptionFocus(embedded ? `${embeddedId}-scope` : "chat-scope-selector");
      }
    });
  };

  const setFilter = (key: keyof RagFilter, value: string) => {
    if (
      primaryLetterId
      && !letterScopeSuspended
      && (key === "letterId" || key === "company")
    ) return;
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const runQuery = (
    nextQuestion: string,
    filterSnapshot = filters,
    contextTurns = turns,
    retry?: {
      clientMessageId: string;
      turnId: string;
      requestLanguage?: "auto" | "en" | "ko";
      requestMaxSources?: number;
      requestRetrievalMode?: ChatRetrievalMode;
      requestModelProfile?: ChatModelProfile;
    },
  ) => {
    const normalized = nextQuestion.trim();
    if (
      normalized.length < 3
      || pending
      || queryPendingRef.current
      || focusMutationRef.current
      || preferenceMutationRef.current
      || actionBusyRef.current
      || threadArchivedAt
    ) return;
    queryPendingRef.current = true;
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    const queryLanguage = retry?.requestLanguage ?? "auto";
    const queryMaxSources = retry?.requestMaxSources ?? maxSources;
    const queryRetrievalMode = retry?.requestRetrievalMode ?? retrievalMode;
    const queryModelProfile = retry?.requestModelProfile ?? modelProfile;
    const effectiveFilters: RagFilter = { ...filterSnapshot };
    if (primaryLetterId && !["corpus", "none"].includes(queryRetrievalMode)) {
      Object.assign(effectiveFilters, requiredLetterScope);
    }

    const conversationHistory: RagConversationMessage[] = activeThreadId
      ? []
      : contextTurns
          .filter((turn) => turn.answer)
          .flatMap((turn) => [
            { role: "user" as const, content: turn.question },
            { role: "assistant" as const, content: turn.answer?.answer ?? "" },
          ])
          .slice(-8);

    const turnId = retry?.turnId ?? crypto.randomUUID();
    const clientMessageId = retry?.clientMessageId ?? crypto.randomUUID();
    requestIdentityRef.current = { threadId: activeThreadId, clientMessageId };
    const turn: ChatTurn = {
      id: turnId,
      clientMessageId,
      question: normalized,
      filters: { ...effectiveFilters },
      requestLanguage: queryLanguage,
      requestMaxSources: queryMaxSources,
      requestRetrievalMode: queryRetrievalMode,
      requestModelProfile: queryModelProfile,
      contextMessages: conversationHistory.length,
      persistedContext: Boolean(activeThreadId),
    };
    followConversationRef.current = true;
    if (!retry) setIntroducedTurns(current => new Set([...current, turnId]));
    setTurns((current) => retry
      ? current.map((item) => (item.id === retry.turnId ? turn : item))
      : [...current, turn]);
    setQuestion("");
    setCopiedTurn(undefined);
    setActiveRequestTurnId(turnId);

    let queryThreadId = activeThreadId;
    startTransition(async () => {
      try {
        if (!queryThreadId) {
          const createdThread = await createChatConversation({
            title: normalized.slice(0, 80),
            modelPreference: queryModelProfile,
            retrievalPreference: queryRetrievalMode,
            activeLetterIds: ["corpus", "none"].includes(queryRetrievalMode)
              ? []
              : activeLetterIds.length
                ? activeLetterIds
                : effectiveFilters.letterId ? [effectiveFilters.letterId] : [],
          });
          queryThreadId = createdThread.id;
          requestIdentityRef.current = { threadId: createdThread.id, clientMessageId };
          pendingRouteRef.current = createdThread.id;
          setActiveThreadId(createdThread.id);
          setThreadTitle(createdThread.title);
          upsertThread(createdThread);
        }

        const response = await fetch("/api/chat/query", {
          method: "POST",
          headers: {
            Accept: "application/x-ndjson",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: normalized,
            filters: effectiveFilters,
            language: queryLanguage,
            maxSources: queryMaxSources,
            conversationHistory: queryThreadId ? [] : conversationHistory,
            options: {
              threadId: queryThreadId,
              clientMessageId,
              retrievalMode: queryRetrievalMode,
              modelProfile: queryModelProfile,
            },
          }),
          signal: requestController.signal,
        });
        if (!response.ok) {
          let message = `Chat stream could not start (${response.status}).`;
          try {
            const result = await response.json() as { error?: string };
            if (result.error) message = result.error;
          } catch {
            // Keep the bounded status message when an intermediary returns a non-JSON error.
          }
          throw new ChatStreamFailure(message, "server", `http_${response.status}`);
        }
        if (!response.headers.get("content-type")?.toLowerCase().includes("application/x-ndjson")) {
          throw new ChatStreamFailure("The chat endpoint did not return NDJSON.", "protocol");
        }
        const streamOptions = {
          threadId: queryThreadId,
          clientMessageId,
          retrievalMode: queryRetrievalMode,
          modelProfile: queryModelProfile,
        };
        const verifiedAnswer = await consumeChatStream(
          response,
          effectiveFilters,
          streamOptions,
          (event) => {
            if (requestController.signal.aborted) return;
            if (event.type === "phase" || event.type === "draft_delta" || event.type === "draft_reset") {
              setTurns(current => current.map(item => item.id === turnId ? applyStreamEvent(item, event) : item));
            }
          },
        );
        if (requestController.signal.aborted) return;
        setTurns((current) => current.map((item) => (
          item.id === turnId
            ? {
                ...item,
                answer: verifiedAnswer,
                mode: "live",
                cancelled: false,
                error: undefined,
                provisionalDraft: undefined,
                streamAttempt: undefined,
                streamPhase: undefined,
              }
            : item
        )));
        const returnedThreadId = verifiedAnswer.threadId;
        if (returnedThreadId) {
          const now = verifiedAnswer.generatedAt || new Date().toISOString();
          const nextTitle = threadTitle || normalized.slice(0, 80);
          setActiveThreadId(returnedThreadId);
          setThreadTitle(nextTitle);
          const updatedThread: ChatThreadSummary = {
            id: returnedThreadId,
            title: nextTitle,
            modelPreference: queryModelProfile,
            retrievalPreference: queryRetrievalMode,
            activeLetterIds: ["corpus", "none"].includes(queryRetrievalMode)
              ? []
              : activeLetterIds,
            focus: ["corpus", "none"].includes(queryRetrievalMode)
              ? undefined
              : documentFocus,
            archivedAt: undefined,
            pinnedAt: threadPinnedAt,
            lastMessageAt: now,
            createdAt: initialThread?.createdAt ?? now,
            updatedAt: now,
          };
          upsertThread(updatedThread);
        }
        if (pendingRouteRef.current && pendingRouteRef.current === verifiedAnswer.threadId) {
          const persistedThreadId = pendingRouteRef.current;
          try {
            const unsent = composerRef.current?.value;
            if (unsent) sessionStorage.setItem(`pharma-chat-draft:${persistedThreadId}`, unsent);
            sessionStorage.removeItem(draftKey);
          } catch { /* Keep the completed response available when draft storage is disabled. */ }
          pendingRouteRef.current = undefined;
          if (!embedded) router.replace(`/chat/${persistedThreadId}`, { scroll: false });
        } else if (returnedThreadId) {
          // The backend may resolve or clear active letter scope while answering. Refresh the
          // saved thread so sidebar scope and focus always reflect server-owned state.
          router.refresh();
        }
      } catch (error) {
        const requestWasStopped = requestController.signal.aborted;
        const failureMessage = requestWasStopped
          ? text(
              "You stopped this answer. If it was already finished, it may appear when you reload this conversation.",
              "답변 요청을 중지했습니다. 이미 완성된 답변이 있다면 대화를 새로고침했을 때 표시될 수 있습니다.",
            )
          : error instanceof ChatStreamFailure && error.kind === "incomplete"
            ? text(
                "The connection ended before the answer was ready. Reload this conversation to check for a completed answer, or try again.",
                "답변이 완성되기 전에 연결이 끊어졌어요. 대화를 새로고침해 완성된 답변이 있는지 확인하거나 다시 시도하세요.",
              )
            : error instanceof ChatStreamFailure && error.kind === "protocol"
              ? text(
                  "We could not check this answer, so it has not been shown as a completed response. Please try again.",
                  "답변을 확인하는 데 문제가 있어 완성된 답변으로 표시하지 않았어요. 다시 시도해주세요.",
                )
              : error instanceof ChatStreamFailure && error.kind === "server"
                ? text(
                    "The AI could not finish this answer. Please try again. If it keeps failing, contact your service administrator.",
                    "AI가 답변을 완성하지 못했어요. 다시 시도하고, 문제가 계속되면 서비스 담당자에게 알려주세요.",
                  )
                : text(
                    "We could not connect to the answer service. Your question is shown above; try again when the connection is available.",
                    "답변 서비스에 연결하지 못했어요. 질문은 위에 남아 있으니 연결이 복구되면 다시 시도하세요.",
                  );
        setTurns((current) => current.map((item) => (
          item.id === turnId
            ? {
                ...item,
                cancelled: requestWasStopped,
                error: failureMessage,
                provisionalDraft: undefined,
                streamAttempt: undefined,
                streamPhase: undefined,
              }
            : item
        )));
        if (
          !requestWasStopped
          && queryThreadId
          && pendingRouteRef.current === queryThreadId
        ) {
          pendingRouteRef.current = undefined;
          if (!embedded) router.replace(`/chat/${queryThreadId}`, { scroll: false });
        }
      } finally {
        queryPendingRef.current = false;
        if (requestControllerRef.current === requestController) {
          requestControllerRef.current = undefined;
          requestIdentityRef.current = {};
          setActiveRequestTurnId(undefined);
        }
      }
    });
  };

  const stopActiveRequest = () => {
    const { threadId, clientMessageId } = requestIdentityRef.current;
    requestControllerRef.current?.abort();
    if (threadId && clientMessageId) {
      void cancelChatRequest(threadId, clientMessageId)
        .then(() => {
          pendingRouteRef.current = undefined;
          if (!embedded) router.replace(`/chat/${threadId}`, { scroll: false });
          router.refresh();
        })
        .catch(() => {
          // The local request is still stopped. Its error copy truthfully notes that an answer
          // already completed by the server can reappear after the conversation is refreshed.
        });
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      runQuery(question);
    }
  };

  const removeFilter = (key: keyof RagFilter) => {
    if (
      primaryLetterId
      && !letterScopeSuspended
      && (key === "letterId" || key === "company")
    ) return;
    setFilters((current) => ({ ...current, [key]: undefined }));
  };

  const selectCitation = (turnId: string, index: number, trigger: HTMLElement) => {
    evidenceTrigger.current = trigger;
    setSelectedCitation((current) => ({ ...current, [turnId]: index }));
    setEvidenceTurnId(turnId);
  };

  const setCitationAsChatFocus = (turn: ChatTurn, citation: RagCitation) => {
    const assistantMessageId = turn.answer?.assistantMessageId;
    if (
      !activeThreadId
      || !assistantMessageId
      || focusMutationRef.current
      || preferenceMutationRef.current
    ) return;
    setFocusError(undefined);
    focusMutationRef.current = true;
    startFocusTransition(async () => {
      try {
        const updated = await focusChatDocument(
          activeThreadId,
          assistantMessageId,
          citation.id,
        );
        setDocumentFocus(updated.focus);
        setActiveLetterIds(updated.activeLetterIds);
        setRetrievalMode(updated.retrievalPreference);
        setFilters((current) => ({ ...current, letterId: undefined, company: undefined }));
        upsertThread(updated);
        router.refresh();
      } catch {
        setFocusError(text(
          "This document could not be set as the chat focus. Refresh the sources and try again.",
          "이 문서를 대화의 기준으로 설정하지 못했습니다. 출처를 새로고침한 뒤 다시 시도해 주세요.",
        ));
      } finally {
        focusMutationRef.current = false;
      }
    });
  };

  const clearDocumentFocus = () => {
    if (focusMutationRef.current || preferenceMutationRef.current) return;
    if (!activeThreadId) {
      setDocumentFocus(undefined);
      setActiveLetterIds([]);
      setRetrievalMode("auto");
      setFilters((current) => ({ ...current, letterId: undefined, company: undefined }));
      return;
    }
    setFocusError(undefined);
    focusMutationRef.current = true;
    startFocusTransition(async () => {
      try {
        const updated = await clearChatDocumentFocus(activeThreadId);
        setDocumentFocus(undefined);
        setActiveLetterIds(updated.activeLetterIds);
        setRetrievalMode(updated.retrievalPreference);
        upsertThread(updated);
        router.refresh();
      } catch {
        setFocusError(text(
          "The document focus could not be cleared. Please try again.",
          "문서 기준을 해제하지 못했습니다. 다시 시도해 주세요.",
        ));
      } finally {
        focusMutationRef.current = false;
      }
    });
  };

  const evidenceTurn = turns.find((turn) => turn.id === evidenceTurnId);
  const currentSummary: ChatThreadSummary | undefined = activeThreadId ? {
    id: activeThreadId, title: threadTitle, pinnedAt: threadPinnedAt, archivedAt: threadArchivedAt,
    modelPreference: modelProfile, retrievalPreference: retrievalMode, activeLetterIds,
    focus: documentFocus, createdAt: initialThread?.createdAt ?? "",
    updatedAt: initialThread?.updatedAt ?? "", lastMessageAt: initialThread?.lastMessageAt ?? "",
  } : undefined;
  const actionsDisabled = !draftLoaded || pending || actionBusy || focusPending || preferencesPending || turns.some((turn) => turn.persistedPending);
  const branchFrom = async (turn: ChatTurn, edit = false) => {
    if (embedded || !activeThreadId || actionsDisabled || actionBusyRef.current) return;
    const messageId = edit ? turn.answer?.userMessageId ?? turn.id : turn.answer?.assistantMessageId;
    if (!messageId) return;
    actionBusyRef.current = true; setActionBusy(true); setActionError(undefined);
    try {
      const branch = await branchChatConversation(activeThreadId, messageId, !edit);
      if (edit) {
        try { sessionStorage.setItem(`pharma-chat-draft:${branch.id}`, turn.question); }
        catch { throw new Error("Draft recovery unavailable"); }
      }
      upsertThread(branch);
      router.push(`/chat/${branch.id}`);
    } catch {
      setActionError(text("Could not open a new branch. Please try again.", "새 분기 대화를 열지 못했어요. 다시 시도하세요."));
    } finally { actionBusyRef.current = false; setActionBusy(false); }
  };
  const rateAnswer = async (turn: ChatTurn, rating: "helpful" | "unhelpful") => {
    if (!activeThreadId || !turn.answer?.assistantMessageId || actionBusyRef.current) return;
    actionBusyRef.current = true; setActionBusy(true); setActionError(undefined);
    try {
      const saved = await submitChatFeedback(activeThreadId, turn.answer.assistantMessageId, turn.feedbackRating === rating ? null : rating);
      setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, feedbackRating: saved.feedbackRating } : item));
    } catch { setActionError(text("Feedback was not saved. Please try again.", "평가가 저장되지 않았어요. 다시 시도하세요.")); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  };
  const applySelectedLetters = async (nextIds = selectedLetters) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true; setActionBusy(true); setActionError(undefined);
    try {
      if (activeThreadId) upsertThread(await selectChatSources(activeThreadId, nextIds));
      setActiveLetterIds(nextIds); setSelectedLetters(nextIds); setDocumentFocus(undefined);
      setRetrievalMode(nextIds.length ? "letter" : "auto");
      setFilters({}); setSourcePickerOpen(false);
      composerRef.current?.focus();
    } catch { setActionError(text("Those sources could not be selected. Try again.", "자료를 선택하지 못했어요. 다시 시도하세요.")); }
    finally { actionBusyRef.current = false; setActionBusy(false); }
  };
  const closeEvidence = () => {
    setEvidenceTurnId(undefined);
    requestAnimationFrame(() => evidenceTrigger.current?.isConnected ? evidenceTrigger.current.focus() : composerRef.current?.focus());
  };

  return (
    <MotionProvider><div data-embedded={embedded || undefined} className={`chat-page chat-workbench${turns.length ? " chat-page--active" : ""}${evidenceTurn?.answer ? " chat-page--evidence" : ""}`}>
      {!embedded && <ChatLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} onUpdated={(thread) => {
        if (thread.id === activeThreadId) { setThreadPinnedAt(thread.pinnedAt); setThreadArchivedAt(thread.archivedAt); setThreadTitle(thread.title); }
      }} />}
      <div className="chat-page__surface">
        <header className="chat-workbench__header">
          <div className="chat-workbench__heading"><FileSearch size={21} aria-hidden="true" /><h1>{text("RAG Chat", "RAG 챗봇")}</h1><small>{text("FDA evidence", "FDA 근거 기반")}</small></div>
          <div className="chat-workbench__header-actions">
            {!embedded && turns.length > 0 && <ChatFind entries={turns.map(turn => ({ id: turn.id, text: `${turn.question} ${turn.answer?.answer ?? ""}` }))} />}
            <button ref={libraryTrigger} type="button" className="chat-tool-button" onClick={openConversations} title={text("Search conversations", "대화 검색")}><Search size={17} />{text("Conversations", "대화 목록")}</button>
            <button className="chat-new-button" type="button" disabled={actionsDisabled} onClick={clearConversation}><Plus size={17} />{text("New chat", "새 대화")}</button>
          </div>
        </header>
      <SessionNotice />
        {currentSummary && <ChatThreadTools thread={currentSummary} disabled={actionsDisabled} onChange={(thread) => {
          setThreadTitle(thread.title); setThreadPinnedAt(thread.pinnedAt); setThreadArchivedAt(thread.archivedAt);
        }} />}
        {threadArchivedAt && <div className="chat-archive-notice" role="status">{text("This conversation is archived. Restore it from the conversation menu to continue.", "보관된 대화입니다. 대화 작업 메뉴에서 복원하면 이어서 질문할 수 있어요.")}</div>}
        {actionError && <div className="chat-action-error" role="alert">{actionError}<button type="button" className="chat-icon-button" onClick={() => setActionError(undefined)} aria-label={text("Dismiss message", "메시지 닫기")}><X size={16} /></button></div>}

        {dataMode !== "live" ? (
          <div className="chat-service-notice" role="status">
            <CircleAlert size={16} aria-hidden="true" />
            <p><strong>{text("FDA sources could not be loaded.", "FDA 자료를 불러오지 못했어요.")}</strong> {text(
              "Reload this page to try again. You can also keep your question as a review draft.",
              "페이지를 새로고침해 다시 시도하세요. 질문을 검토 초안으로 보관할 수도 있습니다.",
            )} <Link href="/requests">{text("Save a draft", "초안 작성하기")}</Link></p>
          </div>
        ) : null}

      <div
        className="chat-page__conversation"
        ref={conversationRef}
        onScroll={(event) => {
          const conversation = event.currentTarget;
          const distanceFromBottom = conversation.scrollHeight
            - conversation.scrollTop
            - conversation.clientHeight;
          followConversationRef.current = distanceFromBottom <= 120;
          setShowJump(distanceFromBottom > 120);
        }}
      >
        {!turns.length ? (
          <section className="chat-welcome" key={activeLandingSeed}>
            <ol className="chat-evidence-flow" aria-label={text("From source to review", "원문부터 검토까지")}>
              <li><FileText size={32} aria-hidden="true" /><span>{text("FDA sources", "FDA 원문")}</span></li>
              <li><MessageSquare size={32} aria-hidden="true" /><span>{text("Cited answers", "근거 있는 답변")}</span></li>
              <li><ShieldCheck size={32} aria-hidden="true" /><span>{text("Your review", "직접 검토")}</span></li>
            </ol>
            <h2>{text(
              initialLetterId ? "Let's read this letter." : "A question. A clearer picture.",
              initialLetterId ? "이 경고서한을 살펴볼까요?" : "질문에서 이해로.",
            )}</h2>
            <p>{text(
              initialLetterId ? "Edit the prepared question, then send." : "Ask about FDA findings. Follow the evidence.",
              initialLetterId ? "준비된 질문을 확인하고 보내세요." : "FDA 지적 사항을 묻고, 원문 근거를 확인하세요.",
            )}</p>
            <div className="chat-suggestions" aria-label={text("Start with a question", "예시 질문으로 시작")}>
              {!initialLetterId && beginnerPrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt.id}
                  aria-label={text(prompt.title.en, prompt.title.ko)}
                  onClick={() => {
                    setQuestion(text(prompt.prompt.en, prompt.prompt.ko));
                    requestAnimationFrame(() => composerRef.current?.focus());
                  }}
                >
                  {prompt.id === "understand" ? <FileSearch size={25} aria-hidden="true" /> : prompt.id === "compare" ? <GitBranch size={25} aria-hidden="true" /> : <MessageSquare size={25} aria-hidden="true" />}
                  <span>{prompt.id === "understand" ? text("Understand a finding", "지적 사항 이해") : prompt.id === "compare" ? text("Compare cases", "사례 비교") : text("Prepare team questions", "팀 검토 질문")}</span>
                  <ArrowRight className="chat-suggestion-arrow" size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {turns.map((turn, turnIndex) => {
          const turnFilters = activeFilterEntries(turn.filters);
          return (
            <section className="chat-turn" id={embedded ? `${embeddedId}-turn-${turn.id}` : `chat-turn-${turn.id}`} key={turn.id} data-introduced={introducedTurns.has(turn.id) || undefined}>
              <div className="chat-user-message">
                <p>{turn.question}</p>
                {turn.answer && !embedded && <button type="button" className="chat-user-message__edit" disabled={actionsDisabled || !!threadArchivedAt} onClick={() => void branchFrom(turn, true)}><Pencil size={14} />{text("Edit question", "질문 수정")}</button>}
                {turnFilters.length ? (
                  <div className="chat-turn__filter-summary">
                    <Filter size={13} aria-hidden="true" />
                    <span>{text(`${turnFilters.length} filters applied`, `필터 ${turnFilters.length}개 적용`)}</span>
                  </div>
                ) : null}
              </div>

              {turn.provisionalDraft && !turn.answer && !turn.error ? (
                <article className="chat-unverified-draft">
                  <header role="status">
                    <div>
                      <span className="chat-unverified-draft__mark" aria-hidden="true" />
                      <strong>{text("Unverified draft", "검증 중인 초안")}</strong>
                    </div>
                    <small>{streamPhaseLabel(turn.streamPhase)}</small>
                    {activeRequestTurnId === turn.id ? (
                      <button className="chat-request-stop" type="button" onClick={stopActiveRequest}>
                        <Square size={12} fill="currentColor" aria-hidden="true" />
                        {text("Stop", "중지")}
                      </button>
                    ) : null}
                  </header>
                  <p className="chat-unverified-draft__body">{turn.provisionalDraft}</p>
                  <footer>
                    {text(
                      "Unverified content. Citations, copy, and source controls unlock only after validation.",
                      "검증 전 내용입니다. 인용·복사·출처 기능은 검증 완료 후 활성화됩니다.",
                    )}
                  </footer>
                </article>
              ) : null}

              {!turn.answer && !turn.error && !turn.provisionalDraft ? (
                <div className="chat-tool-run" role="status">
                  <span className="chat-tool-run__spinner" aria-hidden="true" />
                  <div>
                    <strong>{turn.persistedPending ? text(
                      "Waiting for the saved response",
                      "저장된 답변 완료를 기다리는 중",
                    ) : streamPhaseLabel(turn.streamPhase)}</strong>
                    <small>{turn.persistedPending ? text(
                      "This conversation will refresh automatically when processing completes.",
                      "처리가 완료되면 이 대화가 자동으로 새로고침됩니다.",
                    ) : text(
                      "The complete answer appears after its evidence and citations are validated.",
                      "근거와 인용 검증이 끝난 답변만 화면에 표시됩니다.",
                    )}</small>
                  </div>
                  {activeRequestTurnId === turn.id ? (
                    <button className="chat-request-stop" type="button" onClick={stopActiveRequest}>
                      <Square size={12} fill="currentColor" aria-hidden="true" />
                      {text("Stop", "중지")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {turn.error ? (
                <div className="chat-query-error" role="alert">
                  <CircleAlert size={18} aria-hidden="true" />
                  <div><strong>{turn.cancelled
                    ? text("Request stopped", "요청을 중지했습니다")
                    : text("Answer unavailable", "답변을 생성할 수 없습니다")}</strong><p>{turn.error}</p></div>
                  <button
                    type="button"
                    disabled={pending || focusPending || preferencesPending}
                    onClick={() => runQuery(
                      turn.question,
                      turn.filters,
                      turns.slice(0, turnIndex),
                      turn.clientMessageId
                        ? {
                            clientMessageId: turn.clientMessageId,
                            turnId: turn.id,
                            requestLanguage: turn.requestLanguage,
                            requestMaxSources: turn.requestMaxSources,
                            requestRetrievalMode: turn.requestRetrievalMode,
                            requestModelProfile: turn.requestModelProfile,
                          }
                        : undefined,
                    )}
                  >
                    <RotateCcw size={14} /> {text("Try again", "다시 시도")}
                  </button>
                </div>
              ) : null}

              {turn.answer ? (
                <article className="chat-answer">
                  <span className="sr-only" role="status">{text(
                    `Answer received with ${turn.answer.citations.length} sources.`,
                    `출처 ${turn.answer.citations.length}건과 함께 답변을 받았습니다.`,
                  )}</span>
                  <div className="chat-answer__tool-summary">
                    <span title={turn.answer.routeReason}>
                      <Check size={13} />
                      {retrievalStrategyLabel(turn.answer.retrievalStrategy ?? "corpus")}
                    </span>
                    <span title={turn.answer.effectiveModelId ?? turn.answer.attemptedModelId}>
                      <Bot size={13} />
                      {turn.answer.generationUsed ? (
                        <>
                          {text("Model", "모델")}: {modelProfileLabel(
                            turn.answer.effectiveModelProfile ?? turn.answer.requestedModelProfile ?? "auto",
                          )}
                          {turn.answer.effectiveModelId ? ` · ${turn.answer.effectiveModelId}` : ""}
                        </>
                      ) : turn.answer.attemptedModelId
                        ? turn.answer.retrievalStrategy === "none"
                          ? text(
                              "Model response unavailable · no document search",
                              "모델 응답 사용 불가 · 문서 검색 안 함",
                            )
                          : text(
                              "Source excerpts · AI explanation unavailable",
                              "원문 발췌 · AI 설명 미완료",
                            )
                        : text("No model used", "규칙 기반 응답 · 모델 미사용")}
                    </span>
                    {turn.persistedContext ? (
                      <span><Check size={13} />{text(
                        "Saved conversation memory used",
                        "저장된 대화 문맥 사용",
                      )}</span>
                    ) : turn.contextMessages ? (
                      <span><Check size={13} />{text(
                        `${turn.contextMessages} prior messages used as context`,
                        `이전 메시지 ${turn.contextMessages}건을 문맥으로 사용`,
                      )}</span>
                    ) : null}
                    {turn.answer.citations.length ? (
                      <span><LockKeyhole size={13} />{text(
                        `${turn.answer.citations.length} citations linked`,
                        `공식 인용 ${turn.answer.citations.length}건 연결`,
                      )}</span>
                    ) : turn.answer.retrievalStrategy === "none" ? (
                      <span><Check size={13} />{text("No document search needed", "문서 검색 불필요")}</span>
                    ) : (
                      <span><CircleAlert size={13} />{text("No matching sources", "일치하는 출처 없음")}</span>
                    )}
                  </div>

                  {!turn.answer.generationUsed && turn.answer.attemptedModelId && turn.answer.citations.length > 0 ? (
                    <div className="chat-fallback-guide" role="status">
                      <h3>{text("We found sources, but could not finish the AI explanation.", "자료는 찾았지만 AI 설명을 완성하지 못했어요.")}</h3>
                      <p>{text("Retry the answer or open a source below.", "답변을 다시 요청하거나 아래 원문을 확인하세요.")}</p>
                      <details>
                        <summary>{text("Read the original source excerpts", "원문 발췌 읽기")}</summary>
                        <MarkdownCitationText text={turn.answer.answer} citations={turn.answer.citations} onSelect={(index, trigger) => selectCitation(turn.id, index, trigger)} />
                      </details>
                    </div>
                  ) : <MarkdownCitationText
                    text={turn.answer.answer}
                    citations={turn.answer.citations}
                    onSelect={(index, trigger) => selectCitation(turn.id, index, trigger)}
                  />}

                  <p className="chat-review-state">{text("Human review: No decision recorded for this answer", "담당자 검토: 이 답변에 대한 판단 기록 없음")}</p>
                  {turn.answer.evidenceSufficiency !== "sufficient" ? (
                    <div className="chat-evidence-warning">
                      <CircleAlert size={16} />
                      {turn.answer.evidenceSufficiency === "unknown" ? text("Evidence coverage: Not assessed. Citation links alone do not establish complete support. Human review has not been recorded for this answer.", "근거 충족도: 미평가. 인용 링크만으로 충분한 근거가 확인되지는 않습니다. 이 답변에 대한 담당자 검토 기록이 없습니다.") : turn.answer.evidenceSufficiency === "partial"
                        ? text(
                            "The retrieved evidence is limited. Treat the answer as a lead and verify the cited passage before use.",
                            "검색된 근거가 제한적입니다. 답변을 참고 단서로만 사용하고 활용 전에 인용 원문을 확인하세요.",
                          )
                        : text(
                            "The authorized corpus did not contain enough matching evidence. Broaden the filters or revise the query.",
                            "승인된 코퍼스에서 충분한 근거를 찾지 못했습니다. 필터 범위를 넓히거나 질문을 수정하세요.",
                          )}
                    </div>
                  ) : null}

                  {turn.answer.citations.length ? (
                    <div className="chat-source-strip" id={`sources-${turn.id}`}>
                      <button type="button" className="chat-source-strip__open" onClick={(event) => selectCitation(turn.id, 0, event.currentTarget)} aria-expanded={evidenceTurnId === turn.id}>
                        <FileText size={16} />{text(`Sources (${turn.answer.citations.length})`, `출처 (${turn.answer.citations.length})`)}
                      </button>
                      <div>{turn.answer.citations.slice(0, 3).map((citation, index) => (
                        <button key={citation.id} type="button" onClick={(event) => selectCitation(turn.id, index, event.currentTarget)}><span>{index + 1}</span>{citation.company}</button>
                      ))}</div>
                    </div>
                  ) : null}

                  <details className="chat-provenance">
                    <summary>{text("Answer record", "답변 기록")}</summary>
                    <dl>
                      <div><dt>{text("Generated", "생성 시각")}</dt><dd><time dateTime={turn.answer.generatedAt}>{formatDateTime(turn.answer.generatedAt, locale)}</time></dd></div>
                      <div><dt>{text("Request ID", "요청 ID")}</dt><dd><code>{turn.answer.requestId}</code></dd></div>
                      <div><dt>{text("Requested scope", "요청 범위")}</dt><dd>{turn.requestRetrievalMode ?? "auto"}</dd></div>
                      <div><dt>{text("Applied route", "적용 경로")}</dt><dd>{turn.answer.retrievalStrategy ?? "none"}</dd></div>
                      <div><dt>{text("Language", "응답 언어")}</dt><dd>{turn.requestLanguage ?? "auto"}</dd></div>
                      <div><dt>{text("Maximum sources", "최대 출처")}</dt><dd>{turn.requestMaxSources ?? 6}</dd></div>
                      <div><dt>{text("Requested model", "요청 모델")}</dt><dd>{turn.requestModelProfile ?? "auto"}</dd></div>
                      <div><dt>{text("Effective model", "적용 모델")}</dt><dd>{turn.answer.effectiveModelId ?? text("No model used", "모델 미사용")}</dd></div>
                      {turn.answer.focusedDocumentVersionId ? (
                        <div><dt>{text("Focused document version", "기준 문서 버전")}</dt><dd><code>{turn.answer.focusedDocumentVersionId}</code></dd></div>
                      ) : null}
                      <div className="chat-provenance__filters"><dt>{text("Applied filters", "적용 필터")}</dt><dd>{Object.keys(turn.answer.filtersApplied).length
                        ? JSON.stringify(turn.answer.filtersApplied)
                        : text("None", "없음")}</dd></div>
                    </dl>
                  </details>

                    <footer className="chat-answer__footer">
                      <span>{turn.answer.retrievalStrategy === "none"
                        ? text("Conversational answer · no document search was needed", "대화형 답변 · 문서 검색 없이 생성")
                        : turn.answer.interpretationLabel === "ai_synthesis"
                          ? text("AI-assisted · verify against official FDA sources", "AI 보조 답변 · 공식 FDA 원문 대조 필요")
                          : text("Retrieved source facts · verify in the FDA document", "검색된 원문 사실 · FDA 문서에서 확인 필요")}</span>
                      <div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!navigator.clipboard) throw new Error("Clipboard unavailable");
                              await navigator.clipboard.writeText(answerWithSources(turn.answer!, locale));
                              setCopiedTurn(turn.id);
                            } catch { setActionError(text("Could not copy. Select the answer text to copy it.", "복사하지 못했어요. 답변 텍스트를 선택해 복사하세요.")); }
                          }}
                        >
                          {copiedTurn === turn.id ? <Check size={14} /> : <Copy size={14} />}
                          {copiedTurn === turn.id ? text("Copied", "복사됨") : text("Copy with sources", "출처와 함께 복사")}
                        </button>
                        {!embedded && <button type="button" disabled={actionsDisabled} title={text("Prepare a research draft for review before starting", "시작 전에 검토할 리서치 초안 준비")} onClick={() => {
                          try { sessionStorage.setItem(RESEARCH_DRAFT_KEY, turn.question.slice(0, 2000)); router.push("/research"); }
                          catch { setActionError(text("Could not prepare the research draft. Copy your question into Research Agent.", "리서치 초안을 준비하지 못했어요. 질문을 리서치 에이전트에 복사해 주세요.")); }
                        }}><Network size={14} />{text("Research this question", "이 질문으로 리서치")}</button>}
                        {!embedded && <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() => void branchFrom(turn)}
                        >
                          <GitBranch size={14} /> {text("Branch", "대화 분기")}
                        </button>}
                        <button type="button" disabled={actionsDisabled || !!threadArchivedAt} aria-label={text("Helpful answer", "도움이 된 답변")} aria-pressed={turn.feedbackRating === "helpful"} onClick={() => void rateAnswer(turn, "helpful")}><ThumbsUp size={16} /></button>
                        <button type="button" disabled={actionsDisabled || !!threadArchivedAt} aria-label={text("Unhelpful answer", "도움이 되지 않은 답변")} aria-pressed={turn.feedbackRating === "unhelpful"} onClick={() => void rateAnswer(turn, "unhelpful")}><ThumbsDown size={16} /></button>
                      </div>
                    </footer>
                </article>
              ) : null}
            </section>
          );
        })}
        {turns.at(-1)?.answer?.generationUsed && !pending && !threadArchivedAt && <div className="chat-followups">
          <span>{text("Explore next", "이어서 살펴보기")}</span>
          {[
            text("Explain this in simpler terms", "더 쉽게 설명해 주세요"),
            text("Which actions did FDA request in these sources?", "이 자료에서 FDA가 요청한 조치는 무엇인가요?"),
            text("Organize this answer into a comparison table", "이 답변을 비교 표로 정리해 주세요"),
          ].map((prompt) => <button type="button" key={prompt} onClick={() => { setQuestion(prompt); composerRef.current?.focus(); }}>{prompt}<ArrowUp size={14} /></button>)}
        </div>}
        <div className="chat-scroll-anchor" ref={conversationEndRef} />
      </div>

      <div className="chat-composer-wrap">
        {showJump && <button className="chat-jump" type="button" onClick={() => { conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight }); followConversationRef.current = true; setShowJump(false); }}><ArrowDown size={16} />{text("Latest answer", "최근 답변")}</button>}
        <Presence initial={false}>{sourcePickerOpen && <PresenceSurface className="chat-source-picker" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setSourcePickerOpen(false); composerRef.current?.focus(); } }} aria-label={text("Choose FDA letters", "FDA 경고서한 선택")}>
          <header><div><strong>{text("Add FDA letters", "FDA 경고서한 추가")}</strong><small>{text("Choose up to 10 letters to focus or compare", "집중 분석하거나 비교할 서한을 최대 10개 선택하세요")}</small></div><button type="button" className="chat-icon-button" onClick={() => { setSourcePickerOpen(false); composerRef.current?.focus(); }} aria-label={text("Close letter picker", "서한 선택 닫기")}><X size={18} /></button></header>
          <input autoFocus type="search" value={sourceSearch} onChange={(event) => { setSourceSearch(event.target.value); setSourcePage(1); }} placeholder={text("Search companies…", "기업 검색…")} aria-label={text("Search FDA letters", "FDA 경고서한 검색")} />
          <p role="status">{sourcePending ? text("Searching…", "검색 중…") : sourceFailed ? text("Source search unavailable. Keep your selection and try again.", "원문을 검색할 수 없습니다. 선택은 유지됩니다. 다시 시도하세요.") : text(`${sourceTotal} sources`, `원문 ${sourceTotal}건`)}</p>
          <div><button type="button" disabled={sourcePage === 1 || sourcePending} onClick={() => setSourcePage(value => value - 1)}>{text("Previous", "이전")}</button><button type="button" disabled={sourcePage * 20 >= sourceTotal || sourcePending} onClick={() => setSourcePage(value => value + 1)}>{text("Next", "다음")}</button></div>
          <div className="chat-source-picker__list" aria-busy={sourcePending}>{sourceResults.map((letter) => <label key={letter.id}>
            <input type="checkbox" checked={selectedLetters.includes(letter.id)} disabled={!selectedLetters.includes(letter.id) && selectedLetters.length >= 10} onChange={(event) => setSelectedLetters((current) => event.target.checked ? [...current, letter.id] : current.filter((id) => id !== letter.id))} />
            <span><strong>{letter.company}</strong><small>{formatDate(letter.issueDate, undefined, locale)}</small></span>
          </label>)}{!sourceResults.length && !sourcePending && !sourceFailed && <p>{text("No matching letters.", "일치하는 서한이 없어요.")}</p>}</div>
          <footer><span>{text(`${selectedLetters.length} selected`, `${selectedLetters.length}개 선택`)}</span><button type="button" disabled={actionBusy} onClick={() => setSelectedLetters([])}>{text("Clear", "선택 해제")}</button><button className="chat-send-button" type="button" disabled={actionsDisabled} onClick={() => void applySelectedLetters()}>{text("Use letters", "선택 적용")}</button></footer>
        </PresenceSurface>}</Presence>
        <Presence initial={false}>{filtersOpen ? (
          <PresenceSurface className="chat-filter-panel" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setFiltersOpen(false); composerRef.current?.focus(); } }} aria-label={text("Evidence search filters", "증거 검색 필터")}>
            <header>
              <div>
                <span><Filter size={15} />{text("Search filters", "검색 필터")}</span>
                <small>{text("Filters apply to your next question", "다음 질문에 필터가 적용됩니다")}</small>
              </div>
              <button type="button" onClick={() => { setFiltersOpen(false); composerRef.current?.focus(); }} aria-label={text("Close filters", "필터 닫기")}>
                <X size={17} />
              </button>
            </header>
            <div className="chat-filter-panel__grid">
              <label className="chat-filter-field"><span>{text("Company", "기업")}</span><input value={filters.company ?? ""} onChange={event => setFilter("company", event.target.value)} maxLength={300} disabled={Boolean(primaryLetterId && !letterScopeSuspended)} /></label>
              <FilterSelect label={text("Finding category", "지적 유형")} value={filters.category ?? ""} placeholder={text("Available findings", "사용 가능한 지적 유형")} options={categories} onChange={(value) => setFilter("category", value)} />
              <label className="chat-filter-field"><span>{text("Regulatory citation", "규정 인용")}</span><input value={filters.regulation ?? ""} onChange={event => setFilter("regulation", event.target.value)} maxLength={200} /></label>
              <FilterSelect label={text("Drug subtype", "의약품 유형")} value={filters.subtype ?? ""} placeholder={text("Available drug types", "사용 가능한 의약품 유형")} options={subtypes} onChange={(value) => setFilter("subtype", value)} />
              <label className="chat-filter-field"><span>{text("Issuing office", "발행 부서")}</span><input value={filters.issuingOffice ?? ""} onChange={event => setFilter("issuingOffice", event.target.value)} maxLength={300} /></label>
              <div className="chat-filter-field chat-filter-field--date">
                <span>{text("Issue date", "발행일")}</span>
                <div className="chat-date-range">
                  <CalendarDays size={15} aria-hidden="true" />
                  <input aria-label={text("Issue date from", "발행 시작일")} type="date" max={filters.dateTo || undefined} value={filters.dateFrom ?? ""} onChange={(event) => setFilter("dateFrom", event.target.value)} />
                  <span>–</span>
                  <input aria-label={text("Issue date to", "발행 종료일")} type="date" min={filters.dateFrom || undefined} value={filters.dateTo ?? ""} onChange={(event) => setFilter("dateTo", event.target.value)} />
                </div>
              </div>
              <div className="chat-filter-field chat-filter-field--date">
                <span>{text("FDA posted date", "FDA 게시일")}</span>
                <div className="chat-date-range">
                  <CalendarDays size={15} aria-hidden="true" />
                  <input aria-label={text("Posted date from", "게시 시작일")} type="date" max={filters.postedTo || undefined} value={filters.postedFrom ?? ""} onChange={(event) => setFilter("postedFrom", event.target.value)} />
                  <span>–</span>
                  <input aria-label={text("Posted date to", "게시 종료일")} type="date" min={filters.postedFrom || undefined} value={filters.postedTo ?? ""} onChange={(event) => setFilter("postedTo", event.target.value)} />
                </div>
              </div>
              <div className="chat-filter-field chat-filter-field--sources">
                <span>{text("Maximum sources", "최대 출처 수")}</span>
                <div className="chat-source-count" role="group" aria-label={text("Maximum sources", "최대 출처 수")}>
                  {[4, 6, 10].map((value) => (
                    <button className={maxSources === value ? "is-active" : ""} key={value} type="button" aria-pressed={maxSources === value} onClick={() => setMaxSources(value)}>{value}</button>
                  ))}
                </div>
              </div>
            </div>
            {hasRemovableFilters ? (
              <button className="chat-filter-clear" type="button" onClick={() => setFilters({})}>
                <X size={13} /> {primaryLetterId && !letterScopeSuspended
                  ? text("Clear additional filters", "추가 필터 지우기")
                  : text("Clear all filters", "모든 필터 지우기")}
              </button>
            ) : null}
          </PresenceSurface>
        ) : null}</Presence>

        {primaryLetterId && !letterScopeSuspended ? (
          <div className="chat-document-focus" role="status">
            <Pin size={14} aria-hidden="true" />
            <span>
              <small>{documentFocus
                ? text("Main document · answers search this captured version", "기준 문서 · 답변은 이 수집 버전에서 검색")
                : text("Current letter scope · answers search only this letter", "현재 서한 범위 · 답변은 이 경고서한에서만 검색")}</small>
              <strong>{primaryCompany || text("Selected FDA warning letter", "선택한 FDA 경고서한")}</strong>
            </span>
            <Link href={`/drug-letters/${primaryLetterId}`}>
              {text("Open", "열기")}
            </Link>
            <button
              type="button"
              disabled={focusPending}
              aria-label={text("Clear main document", "기준 문서 해제")}
              onClick={clearDocumentFocus}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {focusError ? <p className="chat-focus-error" role="alert">{focusError}</p> : null}

        {activeFilters.length ? (
          <div className="chat-filter-chips">
            {activeFilters.map(([key, value]) => (
              <button
                type="button"
                key={key}
                disabled={Boolean(
                  primaryLetterId
                  && !letterScopeSuspended
                  && (key === "letterId" || key === "company"),
                )}
                onClick={() => removeFilter(key)}
                aria-label={primaryLetterId
                  && !letterScopeSuspended
                  && (key === "letterId" || key === "company")
                  ? text(`Locked ${key} context`, `${key} 문맥 고정됨`)
                  : text(`Remove ${key} filter`, `${key} 필터 제거`)}
              >
                <FilterLabel name={key} value={key === "letterId" ? (primaryCompany || value) : value} />
                {primaryLetterId
                && !letterScopeSuspended
                && (key === "letterId" || key === "company")
                  ? <LockKeyhole size={12} />
                  : <X size={12} />}
              </button>
            ))}
          </div>
        ) : null}

        <div className="chat-composer" aria-busy={!draftLoaded || pending}>
          {activeLetterIds.length > 0 && <div className="chat-selected-letters" aria-label={text("Selected FDA letters", "선택한 FDA 경고서한")}>
            {activeLetterIds.map((id) => {
              const label = letters.find((letter) => letter.id === id)?.company ?? text("Selected letter", "선택한 서한");
              return <button type="button" key={id} disabled={actionsDisabled || !!threadArchivedAt} title={label}
                aria-label={text(`Remove ${label} from selected letters`, `선택한 서한에서 ${label} 제외`)} onClick={() => void applySelectedLetters(activeLetterIds.filter((item) => item !== id))}>
                <FileText size={14} /><span>{label}</span><X size={13} />
              </button>;
            })}
          </div>}
          <label className="sr-only" htmlFor={embedded ? `${embeddedId}-question` : "ai-question"}>{text("Your question", "궁금한 내용")}</label>
          <textarea
            id={embedded ? `${embeddedId}-question` : "ai-question"}
            ref={composerRef}
            value={question}
            rows={2}
            maxLength={2000}
            disabled={!draftLoaded || !!threadArchivedAt}
            placeholder={!draftLoaded ? text("Restoring your draft…", "작성 중인 질문을 불러오는 중…") : text("Ask anything about FDA findings…", "FDA 지적 사항에 대해 질문하세요…")}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <div className="chat-composer__controls">
            <button type="button" className="chat-tool-button" disabled={actionsDisabled || !!threadArchivedAt} aria-expanded={sourcePickerOpen} onClick={() => { setSelectedLetters(activeLetterIds); setSourcePickerOpen((value) => !value); setFiltersOpen(false); }}><Paperclip size={17} />{activeLetterIds.length ? text(`${activeLetterIds.length} letters`, `서한 ${activeLetterIds.length}개`) : text("Select sources", "근거 자료 선택")}</button>
            <button className="chat-tool-button" type="button" aria-label={text("Search & answer options", "검색·답변 설정")} aria-expanded={optionsOpen} aria-controls={embedded ? `${embeddedId}-options` : "chat-additional-options"} onClick={() => { setOptionsOpen((open) => !open); setFiltersOpen(false); }}>
              <SlidersHorizontal size={15} aria-hidden="true" />
              {text("Options", "설정")}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div id={embedded ? `${embeddedId}-options` : "chat-additional-options"} className="chat-additional-options" hidden={!optionsOpen}>
            <button
              className={`chat-tool-button${filtersOpen ? " is-active" : ""}`}
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={15} />
              {text("Filters", "필터")}
              {activeFilters.length ? <span>{activeFilters.length}</span> : null}
            </button>
            <ChatOptionMenu
              ariaLabel={text("Choose an AI model", "AI 모델 선택")}
              triggerId={embedded ? `${embeddedId}-model` : "chat-model-selector"}
              icon={<Sparkles size={14} aria-hidden="true" />}
              value={modelProfile}
              options={modelOptions}
              onChange={changeModelProfile}
              disabled={actionsDisabled || !!threadArchivedAt}
            />
            <ChatOptionMenu
              ariaLabel={text("Choose the evidence scope", "근거 범위 선택")}
              triggerId={embedded ? `${embeddedId}-scope` : "chat-scope-selector"}
              icon={<FileSearch size={14} aria-hidden="true" />}
              value={retrievalMode}
              options={retrievalOptions}
              onChange={changeRetrievalMode}
              disabled={actionsDisabled || !!threadArchivedAt}
            />
            </div>
            {activeRequestTurnId ? (
              <button
                className="chat-send-button chat-send-button--stop"
                type="button"
                aria-label={text("Stop waiting for this answer", "이 답변 요청 중지")}
                onClick={stopActiveRequest}
              >
                <Square size={13} fill="currentColor" aria-hidden="true" />
                <span>{text("Stop", "중지")}</span>
              </button>
            ) : (
              <button
                className="chat-send-button"
                type="button"
                disabled={
                  !draftLoaded
                  || pending
                  || focusPending
                  || preferencesPending
                  || actionBusy
                  || !!threadArchivedAt
                  || question.trim().length < 3
                }
                onClick={() => runQuery(question)}
              >
                <ArrowUp size={17} />
                <span>{text("Ask AI", "질문 보내기")}</span>
              </button>
            )}
          </div>
        </div>
        <p className="chat-composer-note">
          <span>{text("Check AI answers against FDA sources.", "AI 답변은 FDA 원문과 대조하세요.")}</span>
          {question.length > 1600 ? <span className="chat-character-count">{question.length}/2,000</span> : <span className="chat-keyboard-hint" aria-hidden="true"><kbd>Shift</kbd> + <kbd>Enter</kbd> {text("new line", "줄바꿈")}</span>}
        </p>
      </div>
      </div>
      <Presence initial={false}>{evidenceTurn?.answer && <ChatEvidencePanel key={evidenceTurn.id} citations={evidenceTurn.answer.citations} selected={selectedCitation[evidenceTurn.id] ?? 0}
        onSelect={(index) => setSelectedCitation((current) => ({ ...current, [evidenceTurn.id]: index }))} onClose={closeEvidence}
        onFocus={(citation) => setCitationAsChatFocus(evidenceTurn, citation)} disabled={actionsDisabled || !!threadArchivedAt || !evidenceTurn.answer.assistantMessageId} focusedLetterId={documentFocus?.warningLetterId} />}</Presence>
    </div></MotionProvider>
  );
}
