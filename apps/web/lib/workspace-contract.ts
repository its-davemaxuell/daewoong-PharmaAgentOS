function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function strings(value: Record<string, unknown>, keys: string[]) { return keys.every(key => typeof value[key] === "string"); }
function items(value: unknown, validate: (item: Record<string, unknown>) => boolean) { return Array.isArray(value) && value.every(item => record(item) && validate(item)); }
const localHref = (value: unknown) => typeof value === "string" && /^\/(drug-letters|research|saved-work|saved-views|chat)(\/|\?|$)/.test(value) && !value.includes("\\");

/** Reject malformed successful responses before they can masquerade as empty data. */
export function validateWorkspaceResponse(path: string, value: unknown) {
  if (!record(value)) throw new Error("Invalid workspace response");
  let valid = true;
  if (path.startsWith("workspace/search")) {
    valid = items(value.groups, group => typeof group.kind === "string" && typeof group.has_more === "boolean" && items(group.items, item => strings(item, ["id", "title", "kind"]) && localHref(item.href)));
  } else if (path.startsWith("workspace/inbox")) {
    const triage = (item: Record<string, unknown>) => strings(item, ["id", "state", "reason"]) && ["new", "later", "done", "dismissed"].includes(String(item.state)) && Number.isSafeInteger(item.revision);
    valid = "items" in value ? record(value.counts) && typeof value.has_more === "boolean" && items(value.items, item => triage(item) && strings(item, ["title", "letter_id", "event_type"])) : triage(value);
  } else if (path.startsWith("research/briefs")) {
    const brief = (item: Record<string, unknown>) => strings(item, ["id", "title", "run_id", "content_hash", "created_at"]) && /^[a-f0-9]{64}$/.test(String(item.content_hash)) && Number.isSafeInteger(item.run_revision);
    valid = "items" in value ? typeof value.has_more === "boolean" && items(value.items, brief) : brief(value);
    if ("snapshot" in value) valid = valid && record(value.snapshot) && record(value.snapshot.result) && value.snapshot.review_state === "draft" && items(value.snapshot.result.findings, finding => typeof finding.statement === "string" && Array.isArray(finding.citation_ids) && finding.citation_ids.every(id => typeof id === "string"));
  } else if (path.startsWith("saved-views")) {
    const view = (item: Record<string, unknown>) => strings(item, ["id", "name", "description"]) && localHref(item.open_url);
    valid = "items" in value ? typeof value.has_more === "boolean" && items(value.items, view) : view(value);
  }
  if (!valid) throw new Error("Invalid workspace response");
  return value;
}
