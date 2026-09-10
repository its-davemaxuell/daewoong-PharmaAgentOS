"use client";

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
}: {
  letterId: string;
  initiallySaved: boolean;
  compact?: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const { text } = useI18n();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const label = saved ? text("Source saved", "원문 저장됨") : text("Save source", "원문 저장");

  const toggle = () => {
    if (busy.current) return;
    busy.current = true;
    const nextSaved = !saved;
    setError(false);
    startTransition(async () => {
      try {
        await setLetterBookmarkAction(letterId, nextSaved);
        setSaved(nextSaved);
        onChange?.(nextSaved);
      } catch {
        setError(true);
      } finally { busy.current = false; }
    });
  };

  return (
    <span className="letter-bookmark-control"><button
      className={`letter-bookmark-button${compact ? " letter-bookmark-button--compact" : " button button--secondary"}${saved ? " is-saved" : ""}`}
      type="button"
      aria-pressed={saved}
      aria-label={error
        ? text("Bookmark could not be updated. Try again.", "북마크를 변경하지 못했습니다. 다시 시도하세요.")
        : text(`${label} this Drug Letter`, `이 의약품 경고서한 ${label}`)}
      title={error
        ? text("Bookmark could not be updated. Try again.", "북마크를 변경하지 못했습니다. 다시 시도하세요.")
        : label}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={toggle}
    >
      {pending
        ? <LoaderCircle className="spin" size={compact ? 15 : 16} aria-hidden="true" />
        : <Bookmark size={compact ? 15 : 16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />}
      <span>{label}</span>
    </button>{error && <span className="letter-bookmark-feedback" role="alert">{text("Save failed. Try again.", "저장 실패. 다시 시도하세요.")}</span>}</span>
  );
}
