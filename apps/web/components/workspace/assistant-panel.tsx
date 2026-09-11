"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useWorkspaceScope } from "./provider";
import { fetchSource } from "./source-inspector";
import { X } from "../icons/X";
const Chat = dynamic(
  () => import("../chat-workspace").then((module) => module.ChatWorkspace),
  { loading: () => <p role="status">Loading assistant… / AI 불러오는 중…</p> },
);
export function openAssistant(sourceId?: string) {
  window.dispatchEvent(
    new CustomEvent("workspace:assistant", { detail: sourceId }),
  );
}
function Conversation({
  sourceId,
  active,
}: {
  sourceId: string;
  active: boolean;
}) {
  const scope = useWorkspaceScope();
  const { text } = useI18n();
  const query = useQuery({
    queryKey: [scope, "source", sourceId],
    queryFn: ({ signal }) => fetchSource(sourceId, signal),
    enabled: !!sourceId,
  });
  return (
    <div hidden={!active} inert={!active || undefined}>
      {sourceId && query.isPending ? (
        <p role="status">
          {text("Loading case context…", "케이스 근거를 불러오는 중…")}
        </p>
      ) : sourceId && query.isError ? (
        <div role="alert">
          <p>
            {text(
              "Case context could not be loaded.",
              "케이스 근거를 불러오지 못했습니다.",
            )}
          </p>
          <button onClick={() => void query.refetch()}>
            {text("Retry", "다시 시도")}
          </button>
        </div>
      ) : (
        <Chat
          embedded
          landingSeed={`assistant:${scope}:${sourceId || "all"}`}
          letters={query.data && sourceId ? [query.data] : []}
          initialLetterId={sourceId}
          initialCompany={query.data && sourceId ? query.data.company : ""}
        />
      )}
    </div>
  );
}
export function AssistantPanel() {
  const { text } = useI18n();
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [opened, setOpened] = useState(false);
  const [contexts, setContexts] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState("");
  const activeSource = path.match(/^\/drug-letters\/([^/]+)$/)?.[1] ?? "";
  function selectContext(id: string) {
    setContexts((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setSourceId(id);
  }
  useEffect(() => {
    const open = (event?: Event) => {
      const requested = (event as CustomEvent<string> | undefined)?.detail;
      restore.current = document.activeElement as HTMLElement;
      if (typeof requested === "string") {
        setContexts((current) =>
          current.includes(requested) ? current : [...current, requested],
        );
        setSourceId(requested);
      } else if (!contexts.length) {
        setContexts([activeSource]);
        setSourceId(activeSource);
      }
      setOpened(true);
      if (!dialog.current?.open) {
        if (matchMedia("(max-width:1439px)").matches)
          dialog.current?.showModal();
        else dialog.current?.show();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "j" &&
        !event.isComposing
      ) {
        event.preventDefault();
        openAssistant();
      }
      if (
        event.key === "Escape" &&
        dialog.current?.open &&
        !document.querySelector("dialog:modal")
      ) {
        event.preventDefault();
        dialog.current.close();
      }
    };
    const evidence = () => dialog.current?.close();
    window.addEventListener("workspace:evidence-open", evidence);
    window.addEventListener("workspace:assistant", open);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("workspace:evidence-open", evidence);
      window.removeEventListener("workspace:assistant", open);
      window.removeEventListener("keydown", key);
    };
  }, [activeSource, contexts]);
  useEffect(() => {
    if (!opened) return;
    const media = matchMedia("(max-width:1439px)");
    const resize = () => {
      const node = dialog.current;
      if (!node) return;
      node.close();
      if (media.matches) node.showModal();
      else node.show();
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [opened]);
  return (
    <dialog
      className="continuity-assistant"
      ref={dialog}
      aria-labelledby="assistant-title"
      onClose={() => {
        if (dialog.current?.open) return;
        setOpened(false);
        restore.current?.focus();
      }}
    >
      <header>
        <div>
          <h2 id="assistant-title">
            {text("Ask PharmaAgent", "PharmaAgent에 질문")}
          </h2>
          <p>
            {text(
              "Answers grounded in source evidence",
              "원문 근거에 기반한 답변",
            )}
          </p>
        </div>
        <button
          onClick={() => dialog.current?.close()}
          aria-label={text("Close assistant", "AI 패널 닫기")}
        >
          <X size={18} />
        </button>
      </header>
      <div className="continuity-assistant-context">
        <span>{text("Conversation context", "대화 근거 범위")}</span>
        <p>
          {text(
            "The selected letters and filters below control this conversation.",
            "아래 선택된 서한과 필터가 이 대화의 근거 범위를 결정합니다.",
          )}
        </p>
        {activeSource && activeSource !== sourceId && (
          <button onClick={() => selectContext(activeSource)}>
            {contexts.includes(activeSource)
              ? text(
                  "Return to this case conversation",
                  "이 케이스 대화로 돌아가기",
                )
              : text(
                  "Start a conversation for this case",
                  "이 케이스의 새 대화 시작",
                )}
          </button>
        )}
        {sourceId && (
          <button onClick={() => selectContext("")}>
            {text("Switch to general research", "전체 자료 대화로 전환")}
          </button>
        )}
        {contexts.length > 1 && (
          <label>
            {text("Retained conversations", "유지 중인 대화")}
            <select
              aria-label={text("Retained conversations", "유지 중인 대화")}
              value={sourceId}
              onChange={(event) => selectContext(event.target.value)}
            >
              {contexts.map((id, index) => (
                <option key={id} value={id}>
                  {id
                    ? text(
                        `Case conversation ${index + 1}`,
                        `케이스 대화 ${index + 1}`,
                      )
                    : text("General research", "전체 자료 리서치")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="continuity-assistant-body" inert={!opened || undefined}>
        {contexts.map((id) => (
          <Conversation
            key={id}
            sourceId={id}
            active={opened && sourceId === id}
          />
        ))}
      </div>
    </dialog>
  );
}
