-- Additive personal workspace schema. Execute as the migration owner.
BEGIN;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS view_kind varchar(32) NOT NULL DEFAULT 'source_view';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS source_id varchar(36);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS display json NOT NULL DEFAULT '{}';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
UPDATE public.subscriptions SET view_kind='source_bookmark', source_id=substring(name from 22)
WHERE name ~ '^Drug letter bookmark:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND source_id IS NULL;
CREATE INDEX IF NOT EXISTS ix_subscription_owner_updated ON public.subscriptions(owner_id, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS ix_research_owner_updated ON public.research_runs(owner_id, updated_at DESC, id);
CREATE TABLE IF NOT EXISTS public.workspace_inbox_preferences (
 owner_id varchar(255) PRIMARY KEY, starts_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.workspace_triage (
 owner_id varchar(255) NOT NULL, event_id varchar(36) NOT NULL REFERENCES public.change_events(id),
 state varchar(20) NOT NULL DEFAULT 'new' CHECK (state IN ('new','later','done','dismissed')),
 reason varchar(1000) NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,event_id)
);
CREATE TABLE IF NOT EXISTS public.research_brief_snapshots (
 id varchar(36) PRIMARY KEY, owner_id varchar(255) NOT NULL,
 run_id varchar(36) NOT NULL REFERENCES public.research_runs(id) ON DELETE RESTRICT,
 run_revision integer NOT NULL, title varchar(200) NOT NULL, snapshot json NOT NULL,
 content_hash varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,run_id,run_revision)
);
CREATE INDEX IF NOT EXISTS ix_brief_owner_created ON public.research_brief_snapshots(owner_id,created_at DESC,id);
CREATE OR REPLACE FUNCTION public.guard_research_brief_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Research brief snapshots are immutable'; END $$;
DROP TRIGGER IF EXISTS immutable_research_brief_snapshot ON public.research_brief_snapshots;
CREATE TRIGGER immutable_research_brief_snapshot BEFORE UPDATE OR DELETE ON public.research_brief_snapshots
FOR EACH ROW EXECUTE FUNCTION public.guard_research_brief_snapshot();
ALTER TABLE public.workspace_inbox_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_brief_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_inbox_preferences,public.workspace_triage,public.research_brief_snapshots FROM PUBLIC;
DO $boundary$
DECLARE role_name text; table_name text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','fda_readonly_runtime','fda_worker_runtime','pharma_orchestrator_runtime','pharma_mcp_runtime'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON public.workspace_inbox_preferences,public.workspace_triage,public.research_brief_snapshots FROM %I',role_name);
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='fda_api_runtime') THEN
  GRANT SELECT,INSERT ON public.workspace_inbox_preferences,public.research_brief_snapshots TO fda_api_runtime;
  GRANT SELECT,INSERT,UPDATE ON public.workspace_triage TO fda_api_runtime;
  FOREACH table_name IN ARRAY ARRAY['workspace_inbox_preferences','workspace_triage','research_brief_snapshots'] LOOP
   EXECUTE format('DROP POLICY IF EXISTS pharma_workspace_api ON public.%I',table_name);
   EXECUTE format('CREATE POLICY pharma_workspace_api ON public.%I TO fda_api_runtime USING (true) WITH CHECK (true)',table_name);
  END LOOP;
 END IF;
END $boundary$;
COMMIT;
