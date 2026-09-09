"use server";

import { revalidatePath } from "next/cache";
import {
  archiveChatThread,
  branchChatThread,
  rateChatMessage,
  exportChatThread,
  cancelPendingChatMessage,
  clearChatThreadFocus,
  createChatThread,
  focusChatThreadOnCitation,
  getChatThreads,
  queryRag,
  updateChatThread,
} from "@/lib/api-client";
import { requirePortalRole } from "@/lib/backend-auth";
import type {
  ChatModelProfile,
  ChatRetrievalMode,
  RagConversationMessage,
  RagFilter,
  RagQueryOptions,
} from "@/lib/types";

const MODEL_PROFILES = new Set<ChatModelProfile>(["auto", "fast", "balanced", "deep"]);
const RETRIEVAL_MODES = new Set<ChatRetrievalMode>([
  "auto",
  "none",
  "metadata",
  "letter",
  "corpus",
]);

function normalizedId(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[0-9a-f-]{36}$/i.test(normalized)) throw new Error(`Invalid ${label}.`);
  return normalized;
}

export async function askDrugCorpus(
  question: string,
  filters: RagFilter,
  language: "auto" | "en" | "ko",
  maxSources = 6,
  conversationHistory: RagConversationMessage[] = [],
  options: RagQueryOptions = {},
) {
  await requirePortalRole("viewer");
  const normalized = question.trim().slice(0, 2000);
  if (normalized.length < 3) throw new Error("Enter a question of at least 3 characters.");
  const boundedSources = Math.min(10, Math.max(1, Math.round(maxSources)));
  const boundedHistory = conversationHistory
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000),
    }))
    .filter((message) => message.content);
  const modelProfile = MODEL_PROFILES.has(options.modelProfile ?? "auto")
    ? options.modelProfile ?? "auto"
    : "auto";
  const retrievalMode = RETRIEVAL_MODES.has(options.retrievalMode ?? "auto")
    ? options.retrievalMode ?? "auto"
    : "auto";
  const threadId = options.threadId ? normalizedId(options.threadId, "thread ID") : undefined;
  const clientMessageId = options.clientMessageId?.trim().slice(0, 100);

  return queryRag(normalized, filters, language, boundedSources, boundedHistory, {
    threadId,
    clientMessageId,
    modelProfile,
    retrievalMode,
  });
}

export async function updateChatPreferences(
  threadId: string,
  values: { modelPreference?: ChatModelProfile; retrievalPreference?: ChatRetrievalMode },
) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  const modelPreference = values.modelPreference && MODEL_PROFILES.has(values.modelPreference)
    ? values.modelPreference
    : undefined;
  const retrievalPreference = values.retrievalPreference
    && RETRIEVAL_MODES.has(values.retrievalPreference)
    ? values.retrievalPreference
    : undefined;
  if (!modelPreference && !retrievalPreference) throw new Error("No valid chat preference supplied.");
  const thread = await updateChatThread(id, { modelPreference, retrievalPreference });
  revalidatePath(`/chat/${id}`);
  return thread;
}

export async function createChatConversation(values: {
  title: string;
  modelPreference: ChatModelProfile;
  retrievalPreference: ChatRetrievalMode;
  activeLetterIds?: string[];
}) {
  await requirePortalRole("viewer");
  const title = values.title.trim().slice(0, 200);
  if (!title) throw new Error("A chat title is required.");
  const modelPreference = MODEL_PROFILES.has(values.modelPreference)
    ? values.modelPreference
    : "auto";
  const retrievalPreference = RETRIEVAL_MODES.has(values.retrievalPreference)
    ? values.retrievalPreference
    : "auto";
  const activeLetterIds = (values.activeLetterIds ?? [])
    .slice(0, 10)
    .map((id) => normalizedId(id, "letter ID"));
  const thread = await createChatThread({
    title,
    modelPreference,
    retrievalPreference,
    activeLetterIds,
  });
  revalidatePath("/dashboard");
  revalidatePath("/ask");
  return thread;
}

export async function archiveChatConversation(threadId: string) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  await archiveChatThread(id);
  revalidatePath("/dashboard");
  revalidatePath("/ask");
  revalidatePath(`/chat/${id}`);
}

export async function searchChatConversations(query: string) {
  await requirePortalRole("viewer");
  const search = query.trim().slice(0, 200);
  if (!search) return { items: [], unavailable: false };
  const result = await getChatThreads({ limit: 100, search });
  return {
    items: result.data.items,
    unavailable: result.mode !== "live",
  };
}

export async function browseChatConversations(query = "", page = 1, archivedOnly = false) {
  await requirePortalRole("viewer");
  const result = await getChatThreads({ search: query.trim().slice(0, 200), page, limit: 20, archivedOnly });
  if (result.mode !== "live") throw new Error("Conversation library unavailable");
  return result.data;
}

export async function manageChatConversation(threadId: string, values: { title?: string; pinned?: boolean; archived?: boolean }) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  const thread = await updateChatThread(id, values);
  revalidatePath(`/chat/${id}`);
  return thread;
}

export async function branchChatConversation(threadId: string, messageId: string, includeMessage = true) {
  await requirePortalRole("viewer");
  return branchChatThread(normalizedId(threadId, "thread ID"), normalizedId(messageId, "message ID"), includeMessage);
}

export async function submitChatFeedback(threadId: string, messageId: string, rating: "helpful" | "unhelpful" | null) {
  await requirePortalRole("viewer");
  return rateChatMessage(normalizedId(threadId, "thread ID"), normalizedId(messageId, "message ID"), rating);
}

export async function selectChatSources(threadId: string, letterIds: string[]) {
  await requirePortalRole("viewer");
  if (letterIds.length > 10) throw new Error("Select up to 10 letters");
  return updateChatThread(normalizedId(threadId, "thread ID"), {
    activeLetterIds: letterIds.map((id) => normalizedId(id, "letter ID")),
    retrievalPreference: letterIds.length ? "letter" : "auto",
  });
}

export async function downloadChatConversation(threadId: string, format: "markdown" | "json" = "markdown") {
  await requirePortalRole("viewer");
  if (format !== "markdown" && format !== "json") throw new Error("Invalid export format");
  return exportChatThread(normalizedId(threadId, "thread ID"), format);
}

export async function focusChatDocument(
  threadId: string,
  assistantMessageId: string,
  chunkId: string,
) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  const messageId = normalizedId(assistantMessageId, "assistant message ID");
  const sourceChunkId = normalizedId(chunkId, "source chunk ID");
  const thread = await focusChatThreadOnCitation(id, {
    assistantMessageId: messageId,
    chunkId: sourceChunkId,
  });
  revalidatePath(`/chat/${id}`);
  return thread;
}

export async function clearChatDocumentFocus(threadId: string) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  const thread = await clearChatThreadFocus(id);
  revalidatePath(`/chat/${id}`);
  return thread;
}

export async function cancelChatRequest(threadId: string, clientMessageId: string) {
  await requirePortalRole("viewer");
  const id = normalizedId(threadId, "thread ID");
  const messageId = clientMessageId.trim().slice(0, 100);
  if (!messageId) throw new Error("A client message ID is required.");
  const message = await cancelPendingChatMessage(id, messageId);
  revalidatePath(`/chat/${id}`);
  return message;
}
