import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const principalStatusEnum = pgEnum("identity_principal_status", [
	"active",
	"suspended",
	"revoked",
]);

export const principalKindEnum = pgEnum("identity_principal_kind", [
	"human",
	"service",
]);

export const serviceIdentityStatusEnum = pgEnum(
	"identity_service_identity_status",
	["active", "revoked"],
);

export const sessionRefStatusEnum = pgEnum("identity_session_ref_status", [
	"active",
	"revoked",
]);

export const serviceCredentialStatusEnum = pgEnum(
	"identity_service_credential_status",
	["active", "rotated", "revoked", "expired"],
);

export const principals = pgTable("identity_principals", {
	id: uuid("id").primaryKey().defaultRandom(),
	/** Null for service principals — they hold no Better Auth session. */
	authUserId: text("auth_user_id").unique(),
	email: text("email").notNull().unique(),
	kind: principalKindEnum("kind").notNull().default("human"),
	status: principalStatusEnum("status").notNull().default("active"),
	revision: integer("revision").notNull().default(1),
	suspendedAt: timestamp("suspended_at", { withTimezone: true }),
	suspensionReason: text("suspension_reason"),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	revocationReason: text("revocation_reason"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const serviceIdentities = pgTable("identity_service_identities", {
	id: uuid("id").primaryKey().defaultRandom(),
	principalId: uuid("principal_id")
		.notNull()
		.references(() => principals.id),
	label: text("label").notNull(),
	status: serviceIdentityStatusEnum("status").notNull().default("active"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/**
 * R03 SessionRef: logical reference only. `external_ref_hash` is a one-way hash
 * of the session owner's opaque reference — never a token or raw session id.
 */
export const sessionRefs = pgTable(
	"identity_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		principalId: uuid("principal_id")
			.notNull()
			.references(() => principals.id),
		status: sessionRefStatusEnum("status").notNull().default("active"),
		externalRefHash: text("external_ref_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		revocationReason: text("revocation_reason"),
	},
	(table) => [
		uniqueIndex("identity_sessions_external_ref_hash_idx").on(
			table.externalRefHash,
		),
	],
);

/** R03 ServiceCredentialRef: hash only — the plaintext secret is never stored. */
export const serviceCredentials = pgTable(
	"identity_service_credentials",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		serviceIdentityId: uuid("service_identity_id")
			.notNull()
			.references(() => serviceIdentities.id),
		prefix: text("prefix").notNull(),
		secretHash: text("secret_hash").notNull(),
		status: serviceCredentialStatusEnum("status").notNull().default("active"),
		issuedAt: timestamp("issued_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		rotatedAt: timestamp("rotated_at", { withTimezone: true }),
		rotatedToId: uuid("rotated_to_id"),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("identity_service_credentials_prefix_idx").on(table.prefix),
	],
);

/** Idempotency ledger (R04: Idempotency-Key → commandId → replayed response). */
export const commandJournal = pgTable("identity_command_journal", {
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

export type PrincipalRow = typeof principals.$inferSelect;
export type NewPrincipalRow = typeof principals.$inferInsert;
export type ServiceIdentityRow = typeof serviceIdentities.$inferSelect;
export type SessionRefRow = typeof sessionRefs.$inferSelect;
export type ServiceCredentialRow = typeof serviceCredentials.$inferSelect;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
