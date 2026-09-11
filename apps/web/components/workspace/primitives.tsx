"use client";
import { LoadingIndicator } from "../controls";
import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { ActionButton } from "./commands";
import { useStartupReady } from "./startup-context";

export function WorkspaceHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return <header className="workspace-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="workspace-heading-actions">{children}</div></header>;
}
export function WorkspaceErrorState({ retry }: { retry?: () => void }) {
  const { text } = useI18n();
  return <div className="workspace-feedback" role="alert">{text("Could not load this view. Your saved work is retained.", "화면을 불러오지 못했습니다. 저장된 작업은 유지됩니다.")} {retry && <button onClick={retry}>{text("Try again", "다시 시도")}</button>}</div>;
}
export function WorkspaceLoading() { const { text } = useI18n(); return <div className="workspace-loading" data-startup-pending="true"><LoadingIndicator label={text("Loading…", "불러오는 중…")} /></div>; }
export function Pagination({ page, hasMore, onChange }: { page: number; hasMore: boolean; onChange: (page: number) => void }) {
  const { text } = useI18n();
  return <nav className="workspace-pagination" aria-label={text("Pages", "페이지")}><button disabled={page === 1} onClick={() => onChange(page - 1)}>{text("Previous", "이전")}</button><span>{page}</span><button disabled={!hasMore} onClick={() => onChange(page + 1)}>{text("Next", "다음")}</button></nav>;
}
export function Inspector({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const startupReady = useStartupReady();
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  const { text } = useI18n();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!startupReady) return;
    window.dispatchEvent(new Event("workspace:evidence-open"));
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement;
    const query = window.matchMedia("(max-width: 1279px)");
    const show = () => {
      dialog?.close();
      if (query.matches) { dialog?.showModal(); dialog?.querySelector<HTMLButtonElement>("header button")?.focus({ preventScroll: true }); }
      else dialog?.show();
    };
    show(); query.addEventListener("change", show);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.isComposing && !query.matches && !document.querySelector("dialog:modal")) { event.preventDefault(); close.current(); } };
    document.addEventListener("keydown", key);
    const assistant = () => close.current();
    window.addEventListener("workspace:assistant", assistant);
    return () => { query.removeEventListener("change", show); document.removeEventListener("keydown", key); window.removeEventListener("workspace:assistant", assistant); dialog?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [startupReady]);
  return <dialog ref={ref} className="workspace-inspector" aria-labelledby="inspector-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    if (event.key !== "Tab" || !ref.current?.matches(":modal")) return;
    const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(node => node.getClientRects().length);
    if (focusable.length) {
      event.preventDefault();
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
    }
  }}>
    <header><h2 id="inspector-title">{title}</h2><ActionButton actionId="inspector.close" label={text("Close inspector", "상세 패널 닫기")} onClick={onClose} aria-label={text("Close inspector", "상세 패널 닫기")}>×</ActionButton></header>
    <div className="workspace-inspector-content">{children}</div>
  </dialog>;
}
