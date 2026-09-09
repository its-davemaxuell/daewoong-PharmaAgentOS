-- Apply before deploying the chat workspace API. Existing RLS/grants continue to apply.
BEGIN;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS feedback_rating varchar(10);
CREATE INDEX IF NOT EXISTS ix_chat_threads_owner_pinned_activity
  ON public.chat_threads (owner_subject, pinned_at DESC NULLS LAST, last_message_at DESC);
COMMIT;
