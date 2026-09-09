import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
export const governanceScopeKindEnum = pgEnum("governance_scope_kind", [
    "agency",
    "organization",
]);
export const grantStatusEnum = pgEnum("governance_grant_status", [
    "active",
    "revoked",
    "expired",
]);
export const changeProposalKindEnum = pgEnum("governance_change_proposal_kind", [
    "SOFTWARE",
    "INSTITUTIONAL",
    "HIERARCHY_MODE",
]);
export const changeProposalStatusEnum = pgEnum("governance_change_proposal_status", [
    "pending",
    "approved",
    "rejected",
    "superseded",
]);
export const approvalDecisionEnum = pgEnum("governance_approval_decision", [
    "APPROVED",
    "REJECTED",
]);
export const grants = pgTable("governance_grants", {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeId: uuid("scope_id").notNull(),
    scopeKind: governanceScopeKindEnum("scope_kind").notNull(),
    granteePrincipalId: uuid("grantee_principal_id").notNull(),
    granteeAgentId: uuid("grantee_agent_id"),
    capability: text("capability").notNull(),
    resourceRef: text("resource_ref"),
    status: grantStatusEnum("status").notNull().default("active"),
    validFrom: timestamp("valid_from", { withTimezone: true })
        .notNull()
        .defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    derivedFromMembershipId: uuid("derived_from_membership_id"),
    authorityEpochAtIssue: integer("authority_epoch_at_issue").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("governance_grants_scope_id_idx").on(table.scopeId),
    index("governance_grants_grantee_principal_id_idx").on(table.granteePrincipalId),
    index("governance_grants_status_idx").on(table.status),
    index("governance_grants_derived_from_membership_id_idx").on(table.derivedFromMembershipId),
]);
export const changeProposals = pgTable("governance_change_proposals", {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeId: uuid("scope_id").notNull(),
    kind: changeProposalKindEnum("kind").notNull(),
    payloadHash: text("payload_hash").notNull(),
    proposerPrincipalId: uuid("proposer_principal_id").notNull(),
    status: changeProposalStatusEnum("status").notNull().default("pending"),
    requiredApprovals: integer("required_approvals").notNull().default(1),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("governance_change_proposals_scope_id_idx").on(table.scopeId),
    index("governance_change_proposals_status_idx").on(table.status),
]);
export const approvals = pgTable("governance_approvals", {
    id: uuid("id").primaryKey().defaultRandom(),
    changeProposalId: uuid("change_proposal_id").notNull(),
    actionRef: text("action_ref"),
    resolverPrincipalId: uuid("resolver_principal_id").notNull(),
    decision: approvalDecisionEnum("decision").notNull(),
    reason: text("reason"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull(),
    revision: integer("revision").notNull().default(1),
}, (table) => [
    index("governance_approvals_change_proposal_id_idx").on(table.changeProposalId),
]);
export const authorityEpochs = pgTable("governance_authority_epochs", {
    scopeId: uuid("scope_id").primaryKey(),
    epoch: integer("epoch").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const commandJournal = pgTable("governance_command_journal", {
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

export type GrantRow = typeof grants.$inferSelect;
export type NewGrantRow = typeof grants.$inferInsert;
export type ChangeProposalRow = typeof changeProposals.$inferSelect;
export type NewChangeProposalRow = typeof changeProposals.$inferInsert;
export type ApprovalRow = typeof approvals.$inferSelect;
export type NewApprovalRow = typeof approvals.$inferInsert;
export type AuthorityEpochRow = typeof authorityEpochs.$inferSelect;
export type NewAuthorityEpochRow = typeof authorityEpochs.$inferInsert;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type NewCommandJournalRow = typeof commandJournal.$inferInsert;
