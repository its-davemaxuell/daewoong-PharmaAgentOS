"use client";
import { LoadingIndicator } from "../controls";
import { useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useWorkspaceScope } from "./provider";
import { fetchSource } from "./source-inspector";
import { useI18n } from "@/lib/i18n";
import { SourceLink } from "../source-link";
import { X } from "../icons/X";
export function addComparison(id: string) {
  window.dispatchEvent(new CustomEvent("workspace:compare", { detail: id }));
}
export function ComparisonPanel() {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const [requested, setRequested] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let initial: string[] = [];
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(`pharma:compare:${scope}`) ?? "[]",
      );
      if (Array.isArray(saved))
        initial = saved
          .filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))
          .slice(0, 4);
    } catch {}
    const timer = setTimeout(() => setIds(initial), 0);
    const open = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!/^[0-9a-f-]{36}$/i.test(id)) return;
      origin.current = document.activeElement as HTMLElement;
      setRequested(id);
      setIds((current) => {
        const next = [...new Set([...current, id])].slice(0, 4);
        try {
          sessionStorage.setItem(
            `pharma:compare:${scope}`,
            JSON.stringify(next),
          );
        } catch {}
        return next;
      });
      dialog.current?.showModal();
    };
    window.addEventListener("workspace:compare", open);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("workspace:compare", open);
    };
  }, [scope]);
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [scope, "source", id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchSource(id, signal),
      staleTime: 60000,
    })),
  });
  function remove(id: string) {
    setIds((current) => {
      const next = current.filter((item) => item !== id);
      try {
        sessionStorage.setItem(`pharma:compare:${scope}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  return (
    <dialog
      ref={dialog}
      className="continuity-comparison"
      aria-labelledby="comparison-title"
      onClose={() => origin.current?.focus()}
    >
      <header>
        <div>
          <h2 id="comparison-title">
            {text("Compare source evidence", "원문 근거 비교")}
          </h2>
          <p>
            {text(
              "Up to four records. Source statements remain separate from interpretation.",
              "최대 4개 기록 · 원문과 해석을 구분하여 비교합니다.",
            )}
          </p>
        </div>
        <button
          onClick={() => dialog.current?.close()}
          aria-label={text("Close comparison", "비교 닫기")}
        >
          <X size={18} />
        </button>
      </header>
      {ids.length === 4 && requested && !ids.includes(requested) && (
        <p role="status" className="workspace-feedback">
          {text(
            "Four records are already selected. Remove one before adding another.",
            "이미 4개 기록을 선택했습니다. 다른 기록을 추가하려면 하나를 제외하세요.",
          )}
        </p>
      )}
      {ids.length < 2 && (
        <p className="workspace-feedback">
          {text(
            "Add another record from an evidence preview to compare.",
            "근거 미리보기에서 다른 기록을 추가하여 비교하세요.",
          )}
        </p>
      )}
      <div className="continuity-table-scroll">
        <table className="continuity-table">
          <thead>
            <tr>
              <th>{text("Evidence", "근거")}</th>
              {ids.map((id, index) => (
                <th key={id}>
                  {queries[index].data?.company ??
                    (queries[index].isError ? text("Source unavailable", "원문을 불러오지 못함") : <LoadingIndicator label={text("Loading…", "불러오는 중…")} />)}
                  <button
                    onClick={() => remove(id)}
                    aria-label={text("Remove record", "기록 제외")}
                  >
                    {" "}
                    ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              "Issued",
              "Topics",
              "Regulations",
              "Source version",
              "Source passage",
              "Original",
            ].map((field) => (
              <tr key={field}>
                <th>
                  {text(
                    field,
                    (
                      {
                        Issued: "발행일",
                        Topics: "주제",
                        Regulations: "규정",
                        "Source version": "원문 버전",
                        "Source passage": "원문 발췌",
                        Original: "원문",
                      } as Record<string, string>
                    )[field],
                  )}
                </th>
                {ids.map((id, index) => {
                  const query = queries[index];
                  const letter = query.data;
                  return (
                    <td key={id}>
                      {query.isError ? (
                        <button onClick={() => void query.refetch()}>
                          {text("Retry source", "원문 다시 시도")}
                        </button>
                      ) : !letter ? (
                        "—"
                      ) : field === "Issued" ? (
                        letter.issueDate
                      ) : field === "Topics" ? (
                        letter.categories.join(", ") || "—"
                      ) : field === "Regulations" ? (
                        letter.regulations.join(", ") ||
                        text("Not extracted", "미추출")
                      ) : field === "Source version" ? (
                        letter.sourceVersion
                      ) : field === "Source passage" ? (
                        letter.originalSections[0]?.paragraphs.join(" ").slice(0, 1600) ||
                        text(
                          "No source passage is retained. Open the original.",
                          "보존된 원문 발췌가 없습니다. 원문을 확인하세요.",
                        )
                      ) : (
                        <SourceLink
                          href={letter.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {text("Open original", "원문 열기")}
                        </SourceLink>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        {text(
          "No similarity score or compliance conclusion is inferred. Selection is retained in this tab.",
          "유사도 점수나 규제 준수 결론을 추정하지 않습니다. 선택은 이 탭에 유지됩니다.",
        )}
      </footer>
    </dialog>
  );
}
