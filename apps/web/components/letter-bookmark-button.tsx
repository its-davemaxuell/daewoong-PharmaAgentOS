"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceScope } from "./workspace/provider";
import { workspaceJson } from "@/lib/workspace-client";
import { ActionButton } from "./workspace/commands";
import type { WorkspacePage, SavedWorkspaceView } from "@/lib/workspace-types";
import { Bookmark } from "@/components/icons/Bookmark";
import { LoaderCircle } from "@/components/icons/LoaderCircle";
import { useRef, useState, useTransition } from "react";
import { setLetterBookmarkAction } from "@/app/(portal)/saved-views/actions";
import { useI18n } from "@/lib/i18n";

export function LetterBookmarkButton({
  letterId,
  initiallySaved,
  compact = false,
  onChange,
  sourceTitle,
}: {
  letterId: string;
  initiallySaved: boolean;
  compact?: boolean;
  onChange?: (saved: boolean) => void;
  sourceTitle?: string;
}) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const key = [scope, "bookmark", letterId];
  const state = useQuery({ queryKey: key, queryFn: async ({ signal }) => {
    const response = await workspaceJson<WorkspacePage<SavedWorkspaceView>>(`saved-views?source_id=${letterId}&limit=1`, { signal });
    return response.items.length > 0;
  }, initialData: initiallySaved });
  const saved = state.data;
  const pendingKey = [scope, "bookmark-pending", letterId];
  const sharedPending = useQuery({ queryKey: pendingKey, queryFn: () => false, initialData: false, enabled: false }).data;
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const label = sharedPending ? text("Saving source preference…", "원문 저장 설정 반영 중…") : saved ? text("Source saved", "원문 저장됨") : text("Save source", "원문 저장");

  const toggle = () => {
    if (busy.current || client.getQueryData(pendingKey)) return;
    busy.current = true;
    const nextSaved = !saved;
    client.setQueryData(pendingKey, true);
    void client.cancelQueries({ queryKey: key, exact: true });
    void client.cancelQueries({ queryKey: [scope, "bookmark-page"] });
    client.setQueryData(key, nextSaved);
    setError(false);
    startTransition(async () => {
      try {
        await setLetterBookmarkAction(letterId, nextSaved);
        client.setQueryData(key, nextSaved);
        void client.invalidateQueries({ queryKey: [scope, "views"] });
        void client.invalidateQueries({ queryKey: [scope, "bookmark-page"] });
        onChange?.(nextSaved);
      } catch {
        client.setQueryData(key, saved);
        setError(true);
      } finally { busy.current = false; client.setQueryData(pendingKey, false); }
    });
  };

  return (
    <span className="letter-bookmark-control"><ActionButton actionId={`source.bookmark.${letterId}`} label={label} commandLabel={`${label} · ${sourceTitle || letterId}`}
      className={`letter-bookmark-button${compact ? " letter-bookmark-button--compact" : " button button--secondary"}${saved ? " is-saved" : ""}`}
      type="button"
      aria-pressed={saved}
      aria-label={error
        ? text("Bookmark could not be updated. Try again.", "북마크를 변경하지 못했습니다. 다시 시도하세요.")
        : text(`${label} this Drug Letter`, `이 의약품 경고서한 ${label}`)}
      title={error
        ? text("Bookmark could not be updated. Try again.", "북마크를 변경하지 못했습니다. 다시 시도하세요.")
        : label}
      disabled={pending || sharedPending}
      aria-busy={pending || undefined}
      onClick={toggle}
    >
      {pending
        ? <LoaderCircle className="spin" size={compact ? 15 : 16} aria-hidden="true" />
        : <Bookmark size={compact ? 15 : 16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />}
      <span>{label}</span>
    </ActionButton>{error && <span className="letter-bookmark-feedback" role="alert">{text("Save failed. Try again.", "저장 실패. 다시 시도하세요.")}</span>}</span>
  );
}
