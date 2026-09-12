-- orchestration module baseline schema
-- Transcribed from the module's own Drizzle schema (the authority):
--   modules/orchestration/src/infrastructure/persistence/schema.ts

DO $$ BEGIN
 CREATE TYPE orchestration_goal_status AS ENUM ('draft','active','completed','archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_checkout_status AS ENUM ('UNCLAIMED','LEASED','COMPLETED','BLOCKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_run_status AS ENUM ('SCHEDULED','WAKING','ACTIVE','PAUSED','WAITING_HUMAN_INPUT','COMPLETED','ORPHANED','BUDGET_STOPPED','TERMINATED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_gate_id AS ENUM ('G0','G1','G2','G3','G4','G5','G6','G7');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_gate_disposition AS ENUM ('PASS','CHANGES_REQUIRED','BLOCKED','NOT_APPLICABLE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_hierarchy_mode AS ENUM ('HIERARCHY_TREE','HIERARCHY_CIRCULAR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE orchestration_heartbeat_status AS ENUM ('pending','processing','done','cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS orchestration_goals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id TEXT NOT NULL,
	parent_goal_id UUID,
	title TEXT NOT NULL,
	priority INTEGER NOT NULL DEFAULT 0,
	status orchestration_goal_status NOT NULL DEFAULT 'draft',
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orchestration_goals_organization_id_idx
 ON orchestration_goals (organization_id);
CREATE INDEX IF NOT EXISTS orchestration_goals_parent_goal_id_idx
 ON orchestration_goals (parent_goal_id);

CREATE TABLE IF NOT EXISTS orchestration_tasks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id TEXT NOT NULL,
	goal_id UUID NOT NULL,
	goal_ancestry JSONB NOT NULL,
	parent_task_id UUID,
	issue_identifier TEXT NOT NULL,
	title TEXT NOT NULL,
	checkout_status orchestration_checkout_status NOT NULL DEFAULT 'UNCLAIMED',
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orchestration_tasks_organization_id_idx
 ON orchestration_tasks (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS orchestration_tasks_issue_identifier_uidx
 ON orchestration_tasks (issue_identifier);
CREATE INDEX IF NOT EXISTS orchestration_tasks_goal_id_idx
 ON orchestration_tasks (goal_id);
CREATE INDEX IF NOT EXISTS orchestration_tasks_checkout_status_idx
 ON orchestration_tasks (checkout_status);

CREATE TABLE IF NOT EXISTS orchestration_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	task_id UUID NOT NULL,
	agent_id TEXT NOT NULL,
	organization_id TEXT NOT NULL,
	goal_ancestry JSONB NOT NULL,
	issue_identifier TEXT NOT NULL,
	parent_run_id UUID,
	status orchestration_run_status NOT NULL DEFAULT 'SCHEDULED',
	coalesce_key TEXT NOT NULL,
	waiting_human_context JSONB,
	revision INTEGER NOT NULL DEFAULT 1,
	started_at TIMESTAMPTZ,
	completed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orchestration_runs_task_id_idx
 ON orchestration_runs (task_id);
CREATE INDEX IF NOT EXISTS orchestration_runs_agent_id_idx
 ON orchestration_runs (agent_id);
CREATE INDEX IF NOT EXISTS orchestration_runs_issue_identifier_idx
 ON orchestration_runs (issue_identifier);
CREATE INDEX IF NOT EXISTS orchestration_runs_status_active_idx
 ON orchestration_runs (status);

CREATE TABLE IF NOT EXISTS orchestration_task_leases (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	task_id UUID NOT NULL,
	run_id UUID NOT NULL,
	agent_id TEXT NOT NULL,
	lease_token UUID NOT NULL,
	leased_at TIMESTAMPTZ NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	heartbeat_due_at TIMESTAMPTZ,
	released_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orchestration_task_leases_expires_at_idx
 ON orchestration_task_leases (expires_at);

CREATE TABLE IF NOT EXISTS orchestration_run_heartbeats (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	run_id UUID NOT NULL,
	task_id UUID NOT NULL,
	agent_id TEXT NOT NULL,
	coalesce_key TEXT NOT NULL,
	waiting_human_context JSONB,
	next_wake_at TIMESTAMPTZ NOT NULL,
	status orchestration_heartbeat_status NOT NULL DEFAULT 'pending',
	attempt INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orchestration_run_heartbeats_pending_wake_idx
 ON orchestration_run_heartbeats (next_wake_at);

CREATE TABLE IF NOT EXISTS orchestration_gate_bindings (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id TEXT NOT NULL,
	gate_id orchestration_gate_id NOT NULL,
	issue_identifier TEXT NOT NULL,
	run_id UUID,
	disposition orchestration_gate_disposition NOT NULL,
	reviewer_id TEXT NOT NULL,
	artifact_digest TEXT,
	artifact_revision INTEGER,
	not_applicable_reason TEXT,
	hierarchy_mode_at_record orchestration_hierarchy_mode NOT NULL,
	schema_version TEXT NOT NULL DEFAULT '1.0.0',
	recorded_at TIMESTAMPTZ NOT NULL,
	invalidated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orchestration_gate_bindings_issue_gate_idx
 ON orchestration_gate_bindings (issue_identifier, gate_id, recorded_at);
CREATE INDEX IF NOT EXISTS orchestration_gate_bindings_digest_idx
 ON orchestration_gate_bindings (artifact_digest);

CREATE TABLE IF NOT EXISTS orchestration_command_journal (
	command_id UUID PRIMARY KEY,
	command_name TEXT NOT NULL,
	aggregate_id UUID NOT NULL,
	aggregate_type TEXT NOT NULL,
	revision INTEGER NOT NULL,
	response_snapshot JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orchestration_taskboard_mirror (
	issue_identifier TEXT NOT NULL,
	board_version INTEGER NOT NULL,
	status TEXT NOT NULL,
	thread_id TEXT,
	occurred_at TIMESTAMPTZ NOT NULL,
	ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (issue_identifier, board_version, status)
);