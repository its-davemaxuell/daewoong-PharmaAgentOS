"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { useI18n } from "@/lib/i18n";
import { Search } from "@/components/icons/Search";

type Action = { id: string; label: string; enabled: boolean; execute: () => void };
const emptyActions: Action[] = [];
const serverActions = () => emptyActions;
const Actions = createContext<{ register: (action: Action) => () => void; list: () => Action[]; subscribe: (listener: () => void) => () => void }>({ register: () => () => {}, list: serverActions, subscribe: () => () => {} });
export function useWorkspaceAction({ id, label, enabled, execute }: Action) {
  const { register } = useContext(Actions);
  useEffect(() => register({ id, label, enabled, execute }), [register, id, label, enabled, execute]);
}
export function WorkspaceCommands({ children }: { children: React.ReactNode }) {
  const entries = useRef(new Map<string, Action>());
  const snapshot = useRef<Action[]>(emptyActions);
  const listeners = useRef(new Set<() => void>());
  const publish = useCallback(() => { snapshot.current = [...entries.current.values()]; listeners.current.forEach(listener => listener()); }, []);
  const register = useCallback((action: Action) => {
    entries.current.set(action.id, action); publish();
    return () => { if (entries.current.get(action.id) === action) { entries.current.delete(action.id); publish(); } };
  }, [publish]);
  const list = useCallback(() => snapshot.current, []);
  const subscribe = useCallback((listener: () => void) => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; }, []);
  return <Actions.Provider value={{ register, list, subscribe }}>{children}<CommandMenu /></Actions.Provider>;
}
export function ActionButton({ actionId, label, commandLabel, onClick, disabled, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & { actionId: string; label: string; commandLabel?: string; onClick: () => void }) {
  useWorkspaceAction({ id: actionId, label: commandLabel ?? label, enabled: !disabled, execute: onClick });
  return <button {...props} aria-label={props["aria-label"] ?? label} type={props.type ?? "button"} disabled={disabled} onClick={onClick}>{children ?? label}</button>;
}
export function openCommandMenu() { window.dispatchEvent(new Event("workspace:commands")); }
export function typingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input,textarea,select,[contenteditable=true]"));
}
function CommandMenu() {
  const { list, subscribe } = useContext(Actions);
  const { text } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const subscribeWhileOpen = useCallback((listener: () => void) => isOpen ? subscribe(listener) : () => {}, [isOpen, subscribe]);
  const actions = useSyncExternalStore(subscribeWhileOpen, list, serverActions);
  useEffect(() => {
    const open = () => { restore.current = document.activeElement as HTMLElement; setIsOpen(true); setQuery(""); ref.current?.showModal(); };
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.isComposing && !typingTarget(event.target)) { event.preventDefault(); open(); }
    };
    window.addEventListener("workspace:commands", open);
    document.addEventListener("keydown", key);
    return () => { window.removeEventListener("workspace:commands", open); document.removeEventListener("keydown", key); };
  }, [list]);
  const close = () => { setIsOpen(false); ref.current?.close(); restore.current?.focus(); };
  return <dialog ref={ref} className="workspace-command" aria-labelledby="command-title" onClose={() => { setIsOpen(false); if (!document.querySelector("dialog:modal")) restore.current?.focus(); }} onKeyDown={event => {
    if (event.nativeEvent.isComposing || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const choices = Array.from(ref.current?.querySelectorAll<HTMLElement>(".workspace-command-item:not(:disabled)") ?? []);
    if (!choices.length) return;
    event.preventDefault();
    const current = choices.indexOf(document.activeElement as HTMLElement);
    choices[(current + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length].focus();
  }}>
    <header><h2 id="command-title">{text("Actions & search", "작업 및 검색")}</h2><button onClick={close} aria-label={text("Close", "닫기")}>×</button></header>
    <label className="workspace-search"><Search size={16} /><input autoFocus aria-label={text("Find an action or search", "작업 찾기 또는 검색")} value={query} onChange={event => setQuery(event.target.value)} /></label>
    <p className="workspace-eyebrow">{text("Search workspace", "워크스페이스 검색")}</p>
    <Link className="workspace-command-item" href={`/search?q=${encodeURIComponent(query)}`} onClick={close}>{text("Search titles and metadata", "제목 및 메타데이터 검색")} <kbd>↵</kbd></Link>
    <p className="workspace-eyebrow">{text("Actions in this view", "현재 화면 작업")}</p>
    {actions.filter(action => action.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(action => <button key={action.id} className="workspace-command-item" disabled={!action.enabled} onClick={() => { const current = list().find(item => item.id === action.id); if (current?.enabled) { close(); current.execute(); } }}>{action.label}</button>)}
    <p className="workspace-eyebrow">{text("Navigate", "이동")}</p>
    {[["Research", "리서치", "/research"], ["Sources", "자료", "/drug-letters"], ["Saved work", "저장한 작업", "/saved-work"], ["Inbox", "수신함", "/inbox"], ["Chat", "챗봇", "/ask"]].filter(([en, ko]) => `${en} ${ko}`.toLowerCase().includes(query.toLowerCase())).map(([en, ko, href]) => <button key={href} className="workspace-command-item" onClick={() => { close(); router.push(href); }}>{text(en, ko)}</button>)}
  </dialog>;
}
