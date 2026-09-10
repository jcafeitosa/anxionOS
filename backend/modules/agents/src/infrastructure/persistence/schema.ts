import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const agentKindEnum = pgEnum("agents_agent_kind", ["AGENCY", "PLATFORM"]);
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

export const commandJournal = pgTable("agents_command_journal", {
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

export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
export type AgentVersionRow = typeof agentVersions.$inferSelect;
export type NewAgentVersionRow = typeof agentVersions.$inferInsert;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type NewCommandJournalRow = typeof commandJournal.$inferInsert;
