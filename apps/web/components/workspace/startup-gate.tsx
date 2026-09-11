"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n";
import { preparationTasks, runPreparation, type PreparationTask, type PreparationStatus } from "@/lib/startup-preparation";
import { useWorkspaceScope } from "./provider";
import { useChatHistory } from "../chat-history-context";
import styles from "./startup-gate.module.css";
import { StartupReady } from "./startup-context";

type State = "preparing" | "attention" | "revealing" | "entered";
export function StartupGate({ children, roles, linearWorkspace }: { children: ReactNode; roles: AppRole[]; linearWorkspace: boolean }) {
  const client = useQueryClient();
  const router = useRouter();
  const scope = useWorkspaceScope();
  const { text } = useI18n();
  const { historyLoadState, reloadHistory } = useChatHistory();
  const history = useRef(historyLoadState);
  useEffect(() => { history.current = historyLoadState; }, [historyLoadState]);
  const [state, setState] = useState<State>("preparing");
  const [attempt, setAttempt] = useState(0);
  const [tasks, setTasks] = useState<PreparationTask[]>([]);
  const [statuses, setStatuses] = useState<Record<string, PreparationStatus>>({});
  const completed = useRef(new Set<string>());
  const content = useRef<HTMLDivElement>(null);
  const gate = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const revealed = useRef(false);
  const reveal = useCallback((continued = false) => {
    if (!alive.current || revealed.current) return;
    revealed.current = true;
    performance.mark(continued ? "workspace-startup-continued" : "workspace-startup-ready");
    setState("revealing");
  }, []);
  const roleKey = roles.join(",");
  useEffect(() => {
    alive.current = true;
    const visibility = () => { if (gate.current) gate.current.dataset.documentHidden = String(document.hidden); };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => { alive.current = false; document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    performance.mark("workspace-startup-start");
    const waitFor = (check: () => boolean) => new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        if (controller.signal.aborted) { clearInterval(timer); reject(new Error("Cancelled")); return; }
        if (Date.now() - started > 30_000) { clearInterval(timer); reject(new Error("Preparation timed out")); return; }
        try { if (check()) { clearInterval(timer); resolve(); } }
        catch (error) { clearInterval(timer); reject(error); }
      };
      const timer = setInterval(poll, 80);
      poll();
    });
    const list = preparationTasks(client, scope, roleKey.split(",") as AppRole[], linearWorkspace, new URL(window.location.href));
    const readiness: PreparationTask[] = [
      { id: "appearance", en: "Workspace appearance", ko: "워크스페이스 화면", run: async () => {
        const artwork = new Image(); artwork.src = "/images/startup-folders.webp";
        await Promise.all([artwork.decode(), document.fonts.ready]);
      } },
      { id: "history", en: "Conversation history", ko: "대화 기록", run: () => waitFor(() => {
        if (history.current === "unavailable") throw new Error("History unavailable");
        return history.current !== "loading";
      }) },
      { id: "destination", en: "Your opening page", ko: "시작 페이지", run: () => waitFor(() => {
        const queries = client.getQueryCache().getAll().filter(query => query.getObserversCount() > 0 && (query.state.fetchStatus !== "idle" || query.state.status === "error"));
        if (content.current?.querySelector('[data-startup-failed="true"]')) throw new Error("Opening page unavailable");
        if (queries.some(query => query.state.status === "error" && query.state.data === undefined)) throw new Error("Opening page unavailable");
        return Boolean(content.current?.querySelector("main")) && !content.current?.querySelector('[data-startup-pending="true"]') && !queries.some(query => query.state.status === "pending");
      }) },
    ];
    const all = [...list, ...readiness];
    const pending = all.filter(task => !completed.current.has(task.id));
    const start = setTimeout(() => {
      setTasks(all);
      setStatuses(Object.fromEntries(all.map(task => [task.id, completed.current.has(task.id) ? "ready" : "pending"])));
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      const concurrency = connection?.saveData || ["2g", "slow-2g"].includes(connection?.effectiveType || "") ? 2 : 4;
      void runPreparation(pending, concurrency, controller.signal, (id, status) => {
        if (status === "ready") completed.current.add(id);
        setStatuses(current => ({ ...current, [id]: status }));
        if (status === "failed") setState(current => current === "preparing" ? "attention" : current);
      }).then(() => {
        if (!controller.signal.aborted && all.every(task => completed.current.has(task.id))) reveal();
      });
    }, 0);
    const deadline = setTimeout(() => setState(current => current === "preparing" ? "attention" : current), 15_000);
    return () => { controller.abort(); clearTimeout(start); clearTimeout(deadline); };
  }, [client, scope, roleKey, linearWorkspace, attempt, reveal]);
  useEffect(() => {
    if (state !== "revealing") return;
    const timer = setTimeout(() => {
      setState("entered");
      performance.mark("workspace-startup-entered");
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
    return () => clearTimeout(timer);
  }, [state]);
  const retry = async () => {
    if (history.current === "unavailable") { history.current = "loading"; reloadHistory(); }
    await client.cancelQueries({ predicate: query => query.state.data === undefined && query.state.fetchStatus === "fetching" });
    window.dispatchEvent(new Event("workspace:startup-retry"));
    if (content.current?.querySelector('[data-startup-failed="true"]')) router.refresh();
    setState("preparing"); setAttempt(value => value + 1);
  };
  const readyCount = tasks.filter(task => statuses[task.id] === "ready").length;
  const unfinished = tasks.filter(task => statuses[task.id] !== "ready");
  return <div ref={gate} className={styles.gate} data-startup-gate data-state={state}>
    <link rel="preload" href="/images/startup-folders.webp" as="image" />
    <StartupReady.Provider value={state === "entered"}><div className={styles.content} ref={content} inert={state !== "entered"} aria-hidden={state !== "entered" ? true : undefined}>{children}</div></StartupReady.Provider>
    {state !== "entered" && <div className={styles.overlay} data-startup-overlay>
      <div className={styles.panel}>
        <div className={styles.sprite} aria-hidden="true" />
        <h1>{state === "attention" ? text("Some menus need more time", "일부 메뉴 준비가 지연되고 있습니다") : text("Preparing your workspace", "워크스페이스를 준비하고 있습니다")}</h1>
        <p className={styles.status} role="status" aria-live="polite">{tasks.length ? text(`${readyCount} of ${tasks.length} steps ready`, `${tasks.length}개 중 ${readyCount}개 준비 완료`) : text("Getting everything ready for you…", "이용할 화면을 준비하고 있습니다…")}</p>
        <progress className={styles.progress} max={tasks.length || 1} value={readyCount} aria-label={text("Workspace preparation", "워크스페이스 준비")} />
        {state === "attention" && <><p className={styles.unfinished}>{unfinished.map(task => text(task.en, task.ko)).join(" · ")}</p><div className={styles.actions}><button onClick={() => void retry()}>{text("Retry", "다시 시도")}</button><button onClick={() => reveal(true)}>{text("Continue with available menus", "준비된 메뉴로 계속")}</button></div></>}
      </div>
    </div>}
    {/* Full-route links are an optimization, never the readiness signal. */}
    <div aria-hidden="true" inert style={{ position: "fixed", left: 0, top: 0, width: 1, height: 1, overflow: "hidden", opacity: 0 }}>{tasks.filter(task => task.id.startsWith("/")).map(task => <Link key={task.id} href={task.id} prefetch tabIndex={-1} style={{ position: "absolute", inset: 0, width: 1, height: 1, overflow: "hidden" }}>{task.en}</Link>)}</div>
  </div>;
}
