import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const principalStatusEnum = pgEnum("identity_principal_status", [
	"active",
	"suspended",
]);

export const serviceIdentityStatusEnum = pgEnum("identity_service_identity_status", [
	"active",
	"revoked",
]);

export const principals = pgTable("identity_principals", {
	id: uuid("id").primaryKey().defaultRandom(),
	authUserId: text("auth_user_id").notNull().unique(),
	email: text("email").notNull().unique(),
	status: principalStatusEnum("status").notNull().default("active"),
	suspendedAt: timestamp("suspended_at", { withTimezone: true }),
	suspensionReason: text("suspension_reason"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const serviceIdentities = pgTable("identity_service_identities", {
	id: uuid("id").primaryKey().defaultRandom(),
	principalId: uuid("principal_id").notNull(),
	label: text("label").notNull(),
	status: serviceIdentityStatusEnum("status").notNull().default("active"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type PrincipalRow = typeof principals.$inferSelect;
export type NewPrincipalRow = typeof principals.$inferInsert;
export type ServiceIdentityRow = typeof serviceIdentities.$inferSelect;
