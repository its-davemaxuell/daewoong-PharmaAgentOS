"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { workspaceJson } from "@/lib/workspace-client";
import type { LetterQuery } from "@/lib/letter-query";
import { useWorkspaceScope } from "./provider";
export function SaveViewButton({ query }: { query: LetterQuery }) {
  const { text } = useI18n();
  const scope = useWorkspaceScope();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    const f = query.filters;
    const keys: Record<string, string> = { query: "query", subtype: "drug_subtype", category: "category", country: "country", lifecycle: "lifecycle_state", review: "review_state", document: "linked_document", postedFrom: "posted_from", postedTo: "posted_to" };
    const criteria = Object.fromEntries(Object.entries(f).filter(([, value]) => value).map(([key, value]) => [keys[key], value]));
    try { await workspaceJson("saved-views", { method: "POST", body: JSON.stringify({ name, criteria, cadence: "off", display: { sort: query.sort, pageSize: query.pageSize } }) }); setMessage(text("View saved", "보기가 저장되었습니다")); setOpen(false); await client.invalidateQueries({ queryKey: [scope, "views"] }); }
    catch { setMessage(text("Could not save. Use a unique name and try again.", "저장하지 못했습니다. 다른 이름으로 다시 시도하세요.")); } finally { setBusy(false); }
  }
  return <div className="workspace-save-view"><button onClick={() => setOpen(value => !value)}>{text("Save view", "보기 저장")}</button>{open && <form onSubmit={event => { event.preventDefault(); void save(); }}><input aria-label={text("View name", "보기 이름")} value={name} maxLength={255} onChange={event => setName(event.target.value)} /><button disabled={busy || !name.trim()}>{busy ? text("Saving…", "저장 중…") : text("Save", "저장")}</button></form>}<span role="status">{message}</span></div>;
}
