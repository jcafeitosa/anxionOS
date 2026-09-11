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

export const agentKindEnum = pgEnum("agents_agent_kind", [
	"AGENCY",
	"PLATFORM",
]);
export const agentLifecycleStatusEnum = pgEnum("agents_lifecycle_status", [
	"DRAFT",
	"CONFIGURED",
	"READY",
	"ACTIVE",
	"PAUSED",
	"DRAINING",
	"ARCHIVED",
]);
export const agentVersionStatusEnum = pgEnum("agents_version_status", [
	"draft",
	"published",
	"deprecated",
]);
export const autonomyLevelEnum = pgEnum("agents_autonomy_level", [
	"L0",
	"L1",
	"L2",
	"L3",
	"L4",
]);
export const skillVersionStatusEnum = pgEnum("agents_skill_version_status", [
	"draft",
	"candidate",
	"verified",
	"rejected",
	"expired",
	"revoked",
]);

export const agents = pgTable(
	"agents_agents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		organizationId: uuid("organization_id").notNull(),
		agencyId: uuid("agency_id"),
		kind: agentKindEnum("kind").notNull(),
		displayName: text("display_name").notNull(),
		status: agentLifecycleStatusEnum("status").notNull().default("DRAFT"),
		activeVersionId: uuid("active_version_id"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("agents_agents_tenant_id_idx").on(table.tenantId),
		index("agents_agents_organization_id_idx").on(table.organizationId),
		index("agents_agents_agency_id_idx").on(table.agencyId),
		index("agents_agents_status_idx").on(table.status),
	],
);

export const agentVersions = pgTable(
	"agents_agent_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		agentId: uuid("agent_id").notNull(),
		versionNumber: integer("version_number").notNull(),
		status: agentVersionStatusEnum("status").notNull().default("draft"),
		instructionRef: jsonb("instruction_ref").notNull(),
		skillRefs: jsonb("skill_refs").notNull().default([]),
		capabilityManifestHash: text("capability_manifest_hash").notNull(),
		modelSlots: jsonb("model_slots").notNull().default([]),
		autonomyLevel: autonomyLevelEnum("autonomy_level").notNull(),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_agent_versions_agent_version_uidx").on(
			table.agentId,
			table.versionNumber,
		),
		index("agents_agent_versions_tenant_id_idx").on(table.tenantId),
		index("agents_agent_versions_agent_id_idx").on(table.agentId),
	],
);

export const skills = pgTable(
	"agents_skills",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		organizationId: uuid("organization_id").notNull(),
		agencyId: uuid("agency_id"),
		slug: text("slug").notNull(),
		displayName: text("display_name").notNull(),
		description: text("description"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_skills_tenant_org_slug_uidx").on(
			table.tenantId,
			table.organizationId,
			table.slug,
		),
		index("agents_skills_tenant_id_idx").on(table.tenantId),
		index("agents_skills_organization_id_idx").on(table.organizationId),
		index("agents_skills_agency_id_idx").on(table.agencyId),
	],
);

export const skillVersions = pgTable(
	"agents_skill_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		skillId: uuid("skill_id")
			.notNull()
			.references(() => skills.id),
		versionNumber: integer("version_number").notNull(),
		status: skillVersionStatusEnum("status").notNull().default("draft"),
		schemaVersion: text("schema_version").notNull(),
		contentRef: jsonb("content_ref").notNull(),
		contentHash: text("content_hash").notNull(),
		permissionRequirements: jsonb("permission_requirements")
			.notNull()
			.default([]),
		sandboxPolicy: jsonb("sandbox_policy").notNull().default({}),
		evaluationRef: jsonb("evaluation_ref"),
		promotedAt: timestamp("promoted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_skill_versions_skill_version_uidx").on(
			table.skillId,
			table.versionNumber,
		),
		index("agents_skill_versions_tenant_id_idx").on(table.tenantId),
		index("agents_skill_versions_skill_id_idx").on(table.skillId),
		index("agents_skill_versions_status_idx").on(table.status),
	],
);

export const agentSkillBindings = pgTable(
	"agents_agent_skill_bindings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		agentVersionId: uuid("agent_version_id")
			.notNull()
			.references(() => agentVersions.id),
		skillVersionId: uuid("skill_version_id")
			.notNull()
			.references(() => skillVersions.id),
		bindingConfig: jsonb("binding_config").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_agent_skill_bindings_version_skill_uidx").on(
			table.agentVersionId,
			table.skillVersionId,
		),
		index("agents_agent_skill_bindings_tenant_id_idx").on(table.tenantId),
		index("agents_agent_skill_bindings_agent_version_id_idx").on(
			table.agentVersionId,
		),
		index("agents_agent_skill_bindings_skill_version_id_idx").on(
			table.skillVersionId,
		),
	],
);

export const commandJournal = pgTable(
	"agents_command_journal",
	{
		tenantId: uuid("tenant_id").notNull(),
		commandId: uuid("command_id").notNull(),
		commandName: text("command_name").notNull(),
		aggregateId: uuid("aggregate_id").notNull(),
		aggregateType: text("aggregate_type").notNull(),
		revision: integer("revision").notNull(),
		responseSnapshot: jsonb("response_snapshot"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.tenantId, table.commandId] })],
);

export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
export type AgentVersionRow = typeof agentVersions.$inferSelect;
export type NewAgentVersionRow = typeof agentVersions.$inferInsert;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type NewCommandJournalRow = typeof commandJournal.$inferInsert;
export type SkillRow = typeof skills.$inferSelect;
export type NewSkillRow = typeof skills.$inferInsert;
export type SkillVersionRow = typeof skillVersions.$inferSelect;
export type NewSkillVersionRow = typeof skillVersions.$inferInsert;
export type AgentSkillBindingRow = typeof agentSkillBindings.$inferSelect;
export type NewAgentSkillBindingRow = typeof agentSkillBindings.$inferInsert;

export const routineTriggerKindEnum = pgEnum("agents_routine_trigger_kind", [
	"schedule",
	"event",
	"webhook",
	"taskboard",
	"manual",
]);
export const routineStatusEnum = pgEnum("agents_routine_status", [
	"active",
	"paused",
]);
export const agentBudgetStatusEnum = pgEnum("agents_budget_status", [
	"active",
	"paused",
	"exhausted",
]);

export const agentRoutines = pgTable(
	"agents_routines",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		organizationId: uuid("organization_id").notNull(),
		agentId: uuid("agent_id").notNull(),
		slug: text("slug").notNull(),
		displayName: text("display_name").notNull(),
		triggerKind: routineTriggerKindEnum("trigger_kind").notNull(),
		triggerConfig: jsonb("trigger_config").notNull().default({}),
		cooldownSeconds: integer("cooldown_seconds").notNull().default(0),
		status: routineStatusEnum("status").notNull().default("active"),
		lastDedupeKey: text("last_dedupe_key"),
		lastRunId: uuid("last_run_id"),
		lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_routines_agent_slug_uidx").on(
			table.agentId,
			table.slug,
		),
		index("agents_routines_tenant_id_idx").on(table.tenantId),
		index("agents_routines_organization_id_idx").on(table.organizationId),
		index("agents_routines_agent_id_idx").on(table.agentId),
	],
);

export const agentBudgetPolicies = pgTable(
	"agents_budget_policies",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		organizationId: uuid("organization_id").notNull(),
		agentId: uuid("agent_id").notNull(),
		wakeupUnitCap: integer("wakeup_unit_cap").notNull(),
		tokenUnitCap: integer("token_unit_cap").notNull(),
		timeSecondsCap: integer("time_seconds_cap").notNull(),
		wakeupUnitsConsumed: integer("wakeup_units_consumed").notNull().default(0),
		tokenUnitsConsumed: integer("token_units_consumed").notNull().default(0),
		timeSecondsConsumed: integer("time_seconds_consumed").notNull().default(0),
		status: agentBudgetStatusEnum("status").notNull().default("active"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("agents_budget_policies_agent_uidx").on(table.agentId),
		index("agents_budget_policies_tenant_id_idx").on(table.tenantId),
		index("agents_budget_policies_organization_id_idx").on(
			table.organizationId,
		),
	],
);

export type AgentRoutineRow = typeof agentRoutines.$inferSelect;
export type NewAgentRoutineRow = typeof agentRoutines.$inferInsert;
export type AgentBudgetPolicyRow = typeof agentBudgetPolicies.$inferSelect;
export type NewAgentBudgetPolicyRow = typeof agentBudgetPolicies.$inferInsert;
