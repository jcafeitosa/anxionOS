import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const goalStatusEnum = pgEnum("orchestration_goal_status", [
	"draft",
	"active",
	"completed",
	"archived",
]);

export const checkoutStatusEnum = pgEnum("orchestration_checkout_status", [
	"UNCLAIMED",
	"LEASED",
	"COMPLETED",
	"BLOCKED",
]);

export const runStatusEnum = pgEnum("orchestration_run_status", [
	"SCHEDULED",
	"WAKING",
	"ACTIVE",
	"PAUSED",
	"WAITING_HUMAN_INPUT",
	"COMPLETED",
	"ORPHANED",
	"BUDGET_STOPPED",
	"TERMINATED",
]);

export const gateIdEnum = pgEnum("orchestration_gate_id", [
	"G0",
	"G1",
	"G2",
	"G3",
	"G4",
	"G5",
	"G6",
	"G7",
]);

export const gateDispositionEnum = pgEnum("orchestration_gate_disposition", [
	"PASS",
	"CHANGES_REQUIRED",
	"BLOCKED",
	"NOT_APPLICABLE",
]);

export const hierarchyModeEnum = pgEnum("orchestration_hierarchy_mode", [
	"HIERARCHY_TREE",
	"HIERARCHY_CIRCULAR",
]);

export const heartbeatStatusEnum = pgEnum("orchestration_heartbeat_status", [
	"pending",
	"processing",
	"done",
	"cancelled",
]);

export const goals = pgTable(
	"orchestration_goals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		parentGoalId: uuid("parent_goal_id"),
		title: text("title").notNull(),
		priority: integer("priority").notNull().default(0),
		status: goalStatusEnum("status").notNull().default("draft"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("orchestration_goals_organization_id_idx").on(table.organizationId),
		index("orchestration_goals_parent_goal_id_idx").on(table.parentGoalId),
	],
);

export const tasks = pgTable(
	"orchestration_tasks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		goalId: uuid("goal_id").notNull(),
		goalAncestry: jsonb("goal_ancestry").notNull(),
		parentTaskId: uuid("parent_task_id"),
		issueIdentifier: text("issue_identifier").notNull(),
		title: text("title").notNull(),
		checkoutStatus: checkoutStatusEnum("checkout_status")
			.notNull()
			.default("UNCLAIMED"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("orchestration_tasks_organization_id_idx").on(table.organizationId),
		uniqueIndex("orchestration_tasks_issue_identifier_uidx").on(
			table.issueIdentifier,
		),
		index("orchestration_tasks_goal_id_idx").on(table.goalId),
		index("orchestration_tasks_checkout_status_idx").on(table.checkoutStatus),
	],
);

export const runs = pgTable(
	"orchestration_runs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id").notNull(),
		agentId: text("agent_id").notNull(),
		organizationId: text("organization_id").notNull(),
		goalAncestry: jsonb("goal_ancestry").notNull(),
		issueIdentifier: text("issue_identifier").notNull(),
		parentRunId: uuid("parent_run_id"),
		status: runStatusEnum("status").notNull().default("SCHEDULED"),
		coalesceKey: text("coalesce_key").notNull(),
		waitingHumanContext: jsonb("waiting_human_context"),
		revision: integer("revision").notNull().default(1),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("orchestration_runs_task_id_idx").on(table.taskId),
		index("orchestration_runs_agent_id_idx").on(table.agentId),
		index("orchestration_runs_issue_identifier_idx").on(table.issueIdentifier),
		index("orchestration_runs_status_active_idx").on(table.status),
	],
);

export const taskLeases = pgTable(
	"orchestration_task_leases",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id").notNull(),
		runId: uuid("run_id").notNull(),
		agentId: text("agent_id").notNull(),
		leaseToken: uuid("lease_token").notNull(),
		leasedAt: timestamp("leased_at", { withTimezone: true }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		heartbeatDueAt: timestamp("heartbeat_due_at", { withTimezone: true }),
		releasedAt: timestamp("released_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("orchestration_task_leases_expires_at_idx").on(table.expiresAt),
	],
);

export const runHeartbeats = pgTable(
	"orchestration_run_heartbeats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		runId: uuid("run_id").notNull(),
		taskId: uuid("task_id").notNull(),
		agentId: text("agent_id").notNull(),
		coalesceKey: text("coalesce_key").notNull(),
		waitingHumanContext: jsonb("waiting_human_context"),
		nextWakeAt: timestamp("next_wake_at", { withTimezone: true }).notNull(),
		status: heartbeatStatusEnum("status").notNull().default("pending"),
		attempt: integer("attempt").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		processedAt: timestamp("processed_at", { withTimezone: true }),
	},
	(table) => [
		index("orchestration_run_heartbeats_pending_wake_idx").on(table.nextWakeAt),
	],
);

export const gateBindings = pgTable(
	"orchestration_gate_bindings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		gateId: gateIdEnum("gate_id").notNull(),
		issueIdentifier: text("issue_identifier").notNull(),
		runId: uuid("run_id"),
		disposition: gateDispositionEnum("disposition").notNull(),
		reviewerId: text("reviewer_id").notNull(),
		artifactDigest: text("artifact_digest"),
		artifactRevision: integer("artifact_revision"),
		notApplicableReason: text("not_applicable_reason"),
		hierarchyModeAtRecord: hierarchyModeEnum(
			"hierarchy_mode_at_record",
		).notNull(),
		schemaVersion: text("schema_version").notNull().default("1.0.0"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
	},
	(table) => [
		index("orchestration_gate_bindings_issue_gate_idx").on(
			table.issueIdentifier,
			table.gateId,
			table.recordedAt,
		),
		index("orchestration_gate_bindings_digest_idx").on(table.artifactDigest),
	],
);

export const commandJournal = pgTable("orchestration_command_journal", {
	commandId: uuid("command_id").primaryKey(),
	commandName: text("command_name").notNull(),
	aggregateId: uuid("aggregate_id").notNull(),
	aggregateType: text("aggregate_type").notNull(),
	revision: integer("revision").notNull(),
	responseSnapshot: jsonb("response_snapshot"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const taskboardMirror = pgTable(
	"orchestration_taskboard_mirror",
	{
		issueIdentifier: text("issue_identifier").notNull(),
		boardVersion: integer("board_version").notNull(),
		status: text("status").notNull(),
		threadId: text("thread_id"),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		ingestedAt: timestamp("ingested_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({
			columns: [table.issueIdentifier, table.boardVersion, table.status],
		}),
	],
);

export type GoalRow = typeof goals.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type TaskLeaseRow = typeof taskLeases.$inferSelect;
export type RunHeartbeatRow = typeof runHeartbeats.$inferSelect;
export type GateBindingRow = typeof gateBindings.$inferSelect;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type TaskboardMirrorRow = typeof taskboardMirror.$inferSelect;
