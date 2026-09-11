// Deterministic fictional API; binds loopback only and never contacts production.
import { createServer } from "node:http";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { longThreadFixture, longThreadId, researchFixture, researchId } from "./motion-fixtures.mjs";

const stamp = "2026-09-01T00:00:00Z";
const id = "11111111-1111-4111-8111-111111111111";
const source = { id, company_name: "Fictional Pharma", normalized_product_classes: ["Drugs"], scope_status: "IN_SCOPE_DRUGS", country: "Korea", subject: "Fictional quality review", posted_date: "2026-09-01", issue_date: "2026-08-01", canonical_url: "https://www.fda.gov/inspections/fictional-example", drug_subtypes: ["Finished drugs"], current_version_id: "version-1", source_version: "v1", source_hash: "a".repeat(64), has_response: true };
const facets = { country: [{ value: "Korea", count: 10041 }], subtype: [{ value: "Finished drugs", count: 10041 }], category: [], lifecycle: [], review: [], document: [{ value: "response", count: 1 }] };
const thread = { id, title: "Fictional saved question", created_at: stamp, updated_at: stamp, active_letter_ids: [], messages: [
  { id: "q1", role: "user", sequence: 1, status: "complete", content: "What does this fictional source establish?", created_at: stamp },
  { id: "a1", role: "assistant", sequence: 2, status: "complete", content: "Fictional answer [1]", created_at: stamp, generation_used: true, effective_model_id: "fixture", citations: [{ id: "source-1", letter_id: id, company: "Fictional Pharma", excerpt: "Fictional passage for interaction testing only.", anchor: "p1", source_url: "javascript:alert(1)" }] },
] };
const reviewCase = { id, title: "Fictional cleaning-validation review", objective: "Inspect this fictional source and prepare questions for the quality team.", status: "DRAFT", owner_subject: "fixture-viewer", workflow_key: "regulatory-review", current_state_hash: "a".repeat(64), sources: [{ id, case_id: id, warning_letter_id: id, document_id: id, document_version_id: id, document_version_number: 1, source_role: "primary", source_sha256: "a".repeat(64), source_url: source.canonical_url, pinned_by: "Fixture reviewer", created_at: stamp, immutable: true }], created_at: stamp, updated_at: stamp };
const savedBySession = new Map();
const api = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Content-Type", "application/json"); res.setHeader("x-request-id", "fixture-request");
  let data = { items: [], has_more: false, total: 0 };
  if (url.pathname === "/api/v1/saved-views") {
    // Loopback fixture only: separate test contexts by their signed-session subject.
    const subject = JSON.parse(Buffer.from(String(req.headers.authorization).split(".")[1], "base64url").toString()).sub;
    if (req.method === "POST") {
      let body = ""; req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const input = JSON.parse(body);
        const sourceId = input.name?.startsWith("Drug letter bookmark:") ? input.name.slice("Drug letter bookmark:".length) : null;
        const view = { ...input, id: randomUUID(), source_id: sourceId, view_kind: sourceId ? "source_bookmark" : "source_view", open_url: "/drug-letters", revision: 1, updated_at: stamp };
        savedBySession.set(subject, [...(savedBySession.get(subject) || []), view]);
        res.end(JSON.stringify(view));
      });
      return;
    }
    const ids = [...url.searchParams.getAll("source_ids"), ...url.searchParams.getAll("source_id")];
    data = { items: (savedBySession.get(subject) || []).filter(view => !ids.length || ids.includes(view.source_id)), has_more: false, total: 0 };
  } else if (url.pathname === "/api/v1/workspace/inbox") {
    data = { items: [], counts: { new: 0, later: 0, completed: 0, excluded: 0 }, has_more: false, page: 1, starts_at: stamp };
  } else if (url.pathname === "/api/v1/letters/search") {
    const query = url.searchParams.get("q") || "";
    if (query === "failure") { res.statusCode = 500; return res.end(JSON.stringify({ detail: "Fixture unavailable" })); }
    const fixtureSize = /^fixture-(100|1000|10000)$/.test(query) ? Number(query.slice(8)) : 10041;
    const total = query === "no-match" ? 0 : url.searchParams.get("document") === "response" ? 1 : fixtureSize;
    const pageSize = Number(url.searchParams.get("page_size") || 20);
    const page = Math.min(Number(url.searchParams.get("page") || 1), Math.max(1, Math.ceil(total / pageSize)));
    data = { total, collectionTotal: 10041, page, pageSize, facets, items: Array.from({ length: Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize)) }, (_, index) => ({ ...source, id: index === 0 && page === 1 ? id : `${id.slice(0, 24)}${String((page - 1) * pageSize + index + 1).padStart(12, "0")}`, company_name: `${source.company_name} ${(page - 1) * pageSize + index + 1}${query.startsWith("fixture-") ? " · 장기 보존 원문 검토 자료 및 제조 품질 검증 / Long retained evidence and manufacturing quality validation source title" : ""}`, has_response: page === 1 && index === 0 })) };
  } else if (url.pathname === "/api/v1/letters" || url.pathname === "/api/v1/letters/catalog") {
    data = { items: [{ ...source, categories: ["Validation"], regulations: ["21 CFR 211.67"] }], total: 1, has_more: false };
  } else if (url.pathname === "/api/v1/dashboard") {
    data = { counts: { new_letters: 1, updated_letters: 0, responses_added: 1, closeouts_added: 0, pending_reviews: 0, total_drug_letters: 1, scope_exceptions: 0 }, category_distribution: [{ category: "Validation", count: 1 }], last_successful_discovery: stamp };
  } else if (url.pathname === "/api/v1/cases") {
    data = { items: [reviewCase], next_cursor: null, has_more: false };
  } else if (url.pathname === `/api/v1/cases/${id}`) data = reviewCase;
  else if (url.pathname === `/api/v1/cases/${id}/events`) data = { items: [], next_cursor: null, has_more: false };
  else if (url.pathname.startsWith(`/api/v1/cases/${id}/`)) { res.statusCode = 404; data = { detail: "No fixture artifact created" }; }
  else if (url.pathname === "/api/v1/control-tower/summary") data = { inventory: { agents: 1 }, operational_health: { running: 0 }, quality: { evaluations: 0 }, security: { pending_reviews: 0 }, cost_performance: { total_cost_usd: 0 }, business_value: { completed_cases: 0 }, generated_at: stamp };
  else if (url.pathname === "/api/v1/control-tower/inventory") data = { items: [{ id, kind: "AGENT_VERSION", key: "fictional-review-agent", version: "1.0.0", sha256: "a".repeat(64), release_status: "DRAFT" }] };
  else if (url.pathname === "/api/v1/eval-suites") data = { items: [{ id, suite_key: "fictional-evidence-checks", version: "1.0.0", name: "Fictional evidence review", target_kind: "AGENT_VERSION", suite_sha256: "a".repeat(64), cases: [{ id }] }] };
  else if (url.pathname.startsWith("/api/v1/letters/")) {
    data = { ...source, current_version: { id: "version-1", version_number: 1, canonical_hash: "a".repeat(64), anchors: [] }, normalized_markdown: "Fictional source passage for testing.\n\nNo real regulatory finding is represented.", documents: [] };
  } else if (url.pathname === `/api/v1/research/runs/${researchId}`) data = researchFixture;
  else if (url.pathname === "/api/v1/research/runs") data = { items: [researchFixture] };
  else if (url.pathname === `/api/v1/chat/threads/${longThreadId}`) data = longThreadFixture(thread);
  else if (url.pathname === `/api/v1/chat/threads/${id}`) data = thread;
  else if (url.pathname === "/api/v1/chat/threads") data = { items: [thread], total: 1, page: 1, limit: 100, has_more: false };
  else if (url.pathname === "/api/v1/approvals") {
    const status = url.searchParams.get("status");
    if (status === "REJECTED") res.statusCode = 403;
    else if (status === "CANCELLED") res.statusCode = 500;
    else if (status === "APPROVED") data = { invalid: true };
    else if (status !== "EXPIRED") data = { items: [{ id, case_id: id, case_title: "Fictional quality review", plan_id: id, plan_version: 1, plan_sha256: "b".repeat(64), bound_state_hash: "c".repeat(64), approval_type: "PLAN_APPROVAL", status: "PENDING", requested_by: "Fixture reviewer", expires_at: "2030-09-10T00:00:00Z", expired: false, created_at: stamp }] };
  }
  const send = () => res.end(JSON.stringify(data));
  if (url.searchParams.get("q") === "slow") setTimeout(send, 800); else send();
});
api.listen(8100, "127.0.0.1");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, PORTAL_STARTUP_ENABLED: process.env.PORTAL_STARTUP_ENABLED || "false", EXTERNAL_API_BASE_URL: "http://127.0.0.1:8100", API_BASE_URL: "http://127.0.0.1:8100", API_SESSION_PRIVATE_KEY: privateKey, API_SESSION_ISSUER: "fixture", API_SESSION_AUDIENCE: "fixture", PORTAL_SESSION_SECRET: "fixture-only-not-for-production-".repeat(2), RESEARCH_WORKER_MODE: "poll" },
});
function stop() { web.kill(); api.close(); }
process.on("SIGINT", stop); process.on("SIGTERM", stop); process.on("exit", stop);
web.on("exit", code => { api.close(); process.exitCode = code ?? 0; });
