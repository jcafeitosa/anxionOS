import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const aiAccounts = pgTable(
	"connections_ai_accounts",
	{
		id: text("id").primaryKey(),
		organizationId: uuid("organization_id").notNull(),
		ownerPrincipalId: uuid("owner_principal_id").notNull(),
		providerId: text("provider_id").notNull(),
		displayName: text("display_name").notNull(),
		status: text("status").notNull(),
		revision: integer("revision").notNull(),
	},
	(table) => [
		index("connections_ai_accounts_org_owner_idx").on(
			table.organizationId,
			table.ownerPrincipalId,
		),
	],
);

export const connectionBindings = pgTable(
	"connections_connection_bindings",
	{
		id: text("id").primaryKey(),
		connectionId: text("connection_id").notNull(),
		bindingVersion: integer("binding_version").notNull(),
		organizationId: uuid("organization_id").notNull(),
		aiAccountId: text("ai_account_id").notNull(),
		kind: text("kind").notNull(),
		environment: text("environment").notNull(),
		adapterId: text("adapter_id").notNull(),
		status: text("status").notNull(),
		revision: integer("revision").notNull(),
		secretId: text("secret_id").notNull(),
		secretGeneration: integer("secret_generation").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
	},
	(table) => [
		index("connections_bindings_org_status_idx").on(
			table.organizationId,
			table.status,
		),
	],
);

export const inferenceRequests = pgTable(
	"connections_inference_requests",
	{
		id: uuid("id").primaryKey(),
		organizationId: uuid("organization_id").notNull(),
		bindingId: text("binding_id").notNull(),
		bindingVersion: integer("binding_version").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		operation: text("operation").notNull(),
		status: text("status").notNull(),
		modelRef: text("model_ref"),
		latencyMs: integer("latency_ms"),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => [
		index("connections_inference_org_idempotency_idx").on(
			table.organizationId,
			table.idempotencyKey,
		),
	],
);

export const usageRecords = pgTable("connections_usage_records", {
	id: text("id").primaryKey(),
	organizationId: uuid("organization_id").notNull(),
	aiAccountId: text("ai_account_id").notNull(),
	connectionBindingId: text("connection_binding_id").notNull(),
	bindingVersion: integer("binding_version").notNull(),
	inferenceRequestId: uuid("inference_request_id").notNull(),
	consumerKind: text("consumer_kind").notNull(),
	consumerPrincipalId: uuid("consumer_principal_id").notNull(),
	operation: text("operation").notNull(),
	quantity: text("quantity").notNull(),
	unit: text("unit").notNull(),
});

export const commandJournal = pgTable("connections_command_journal", {
	commandId: uuid("command_id").primaryKey(),
	organizationId: uuid("organization_id").notNull(),
	commandName: text("command_name").notNull(),
	responseSnapshot: jsonb("response_snapshot").notNull(),
});
