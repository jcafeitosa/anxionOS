CREATE TYPE "agents_routine_trigger_kind" AS ENUM('schedule', 'event', 'webhook', 'taskboard', 'manual');
CREATE TYPE "agents_routine_status" AS ENUM('active', 'paused');
CREATE TYPE "agents_budget_status" AS ENUM('active', 'paused', 'exhausted');

CREATE TABLE "agents_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"trigger_kind" "agents_routine_trigger_kind" NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cooldown_seconds" integer DEFAULT 0 NOT NULL,
	"status" "agents_routine_status" DEFAULT 'active' NOT NULL,
	"last_dedupe_key" text,
	"last_run_id" uuid,
	"last_triggered_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "agents_routines_agent_slug_uidx" ON "agents_routines" ("agent_id","slug");
CREATE INDEX "agents_routines_tenant_id_idx" ON "agents_routines" ("tenant_id");
CREATE INDEX "agents_routines_organization_id_idx" ON "agents_routines" ("organization_id");
CREATE INDEX "agents_routines_agent_id_idx" ON "agents_routines" ("agent_id");

CREATE TABLE "agents_budget_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"wakeup_unit_cap" integer NOT NULL,
	"token_unit_cap" integer NOT NULL,
	"time_seconds_cap" integer NOT NULL,
	"wakeup_units_consumed" integer DEFAULT 0 NOT NULL,
	"token_units_consumed" integer DEFAULT 0 NOT NULL,
	"time_seconds_consumed" integer DEFAULT 0 NOT NULL,
	"status" "agents_budget_status" DEFAULT 'active' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "agents_budget_policies_agent_uidx" ON "agents_budget_policies" ("agent_id");
CREATE INDEX "agents_budget_policies_tenant_id_idx" ON "agents_budget_policies" ("tenant_id");
CREATE INDEX "agents_budget_policies_organization_id_idx" ON "agents_budget_policies" ("organization_id");
