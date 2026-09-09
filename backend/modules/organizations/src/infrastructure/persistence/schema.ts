import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, } from "drizzle-orm/pg-core";
export const agencyStatusEnum = pgEnum("organizations_agency_status", [
    "draft",
    "connections_pending",
    "ready",
    "draining",
    "archived",
]);
export const marketScopeEnum = pgEnum("organizations_market_scope", [
    "stocks",
    "crypto",
    "both",
]);
export const onboardingStepEnum = pgEnum("organizations_onboarding_step", [
    "created",
    "markets_set",
    "blueprint_pending",
    "mandate_pending",
    "ready",
]);
export const membershipRoleEnum = pgEnum("organizations_membership_role", [
    "owner",
    "admin",
    "operator",
    "viewer",
]);
export const membershipStatusEnum = pgEnum("organizations_membership_status", [
    "invited",
    "active",
    "revoked",
]);
export const agencies = pgTable("organizations_agencies", {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerPrincipalId: uuid("owner_principal_id").notNull(),
    displayName: text("display_name").notNull(),
    marketScope: marketScopeEnum("market_scope").notNull(),
    status: agencyStatusEnum("status").notNull().default("draft"),
    onboardingStep: onboardingStepEnum("onboarding_step")
        .notNull()
        .default("created"),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("organizations_agencies_owner_principal_id_idx").on(table.ownerPrincipalId),
    index("organizations_agencies_status_idx").on(table.status),
]);
export const owners = pgTable("organizations_owners", {
    id: uuid("id").primaryKey().defaultRandom(),
    principalId: uuid("principal_id").notNull(),
    defaultOrganizationId: uuid("default_organization_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("organizations_owners_principal_id_unique").on(table.principalId),
]);
export const memberships = pgTable("organizations_memberships", {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull(),
    principalId: uuid("principal_id"),
    inviteEmail: text("invite_email"),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("organizations_memberships_agency_id_idx").on(table.agencyId),
    index("organizations_memberships_principal_id_idx").on(table.principalId),
]);
export const commandJournal = pgTable("organizations_command_journal", {
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

export type AgencyRow = typeof agencies.$inferSelect;
export type NewAgencyRow = typeof agencies.$inferInsert;
export type OwnerRow = typeof owners.$inferSelect;
export type NewOwnerRow = typeof owners.$inferInsert;
export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembershipRow = typeof memberships.$inferInsert;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type NewCommandJournalRow = typeof commandJournal.$inferInsert;
