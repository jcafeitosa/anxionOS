import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
export const governanceScopeKindEnum = pgEnum("governance_scope_kind", [
	"agency",
	// ANX-462: escopo de plataforma de primeira classe (migration 0008).
	// ANX-469: `organization` removido — nenhum modulo possui entidade
	// Organization, o valor nao tinha produtor nem consumidor de autorizacao e
	// era um tipo morto (migration 0010). O unico par valido e' agency|platform.
	"platform",
]);
export const grantStatusEnum = pgEnum("governance_grant_status", [
	"active",
	"revoked",
	"expired",
]);
export const mandateKindEnum = pgEnum("governance_mandate_kind", [
	"ceo",
	"operator",
	"audit",
]);
export const mandateStatusEnum = pgEnum("governance_mandate_status", [
	"active",
	"suspended",
	"revoked",
]);
export const changeProposalKindEnum = pgEnum(
	"governance_change_proposal_kind",
	["SOFTWARE", "INSTITUTIONAL", "HIERARCHY_MODE"],
);
export const changeProposalStatusEnum = pgEnum(
	"governance_change_proposal_status",
	["pending", "approved", "rejected", "superseded"],
);
export const approvalDecisionEnum = pgEnum("governance_approval_decision", [
	"APPROVED",
	"REJECTED",
]);
export const autonomyLevelEnum = pgEnum("governance_autonomy_level", [
	"L0",
	"L1",
	"L2",
	"L3",
	"L4",
]);
export const autonomyAssignmentStatusEnum = pgEnum(
	"governance_autonomy_assignment_status",
	["active", "superseded", "revoked"],
);
export const grants = pgTable(
	"governance_grants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
		scopeId: uuid("scope_id").notNull(),
		scopeKind: governanceScopeKindEnum("scope_kind").notNull(),
		granteePrincipalId: uuid("grantee_principal_id").notNull(),
		granteeAgentId: uuid("grantee_agent_id"),
		// ANX-469: emissor do grant; NULL quando derivado pelo sistema.
		issuedByPrincipalId: uuid("issued_by_principal_id"),
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
	},
	(table) => [
		index("governance_grants_tenant_id_idx").on(table.tenantId),
		index("governance_grants_agency_id_idx").on(table.agencyId),
		index("governance_grants_scope_id_idx").on(table.scopeId),
		index("governance_grants_grantee_principal_id_idx").on(
			table.granteePrincipalId,
		),
		index("governance_grants_status_idx").on(table.status),
		index("governance_grants_derived_from_membership_id_idx").on(
			table.derivedFromMembershipId,
		),
	],
);
export const changeProposals = pgTable(
	"governance_change_proposals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
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
	},
	(table) => [
		index("governance_change_proposals_tenant_id_idx").on(table.tenantId),
		index("governance_change_proposals_agency_id_idx").on(table.agencyId),
		index("governance_change_proposals_scope_id_idx").on(table.scopeId),
		index("governance_change_proposals_status_idx").on(table.status),
	],
);
export const approvals = pgTable(
	"governance_approvals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
		changeProposalId: uuid("change_proposal_id").notNull(),
		actionRef: text("action_ref"),
		resolverPrincipalId: uuid("resolver_principal_id").notNull(),
		decision: approvalDecisionEnum("decision").notNull(),
		reason: text("reason"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull(),
		revision: integer("revision").notNull().default(1),
	},
	(table) => [
		index("governance_approvals_tenant_id_idx").on(table.tenantId),
		index("governance_approvals_agency_id_idx").on(table.agencyId),
		index("governance_approvals_change_proposal_id_idx").on(
			table.changeProposalId,
		),
	],
);
export const mandates = pgTable(
	"governance_mandates",
	{
		id: uuid("id").primaryKey(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
		agentId: uuid("agent_id").notNull(),
		grantId: uuid("grant_id").notNull(),
		mandateKind: mandateKindEnum("mandate_kind").notNull(),
		status: mandateStatusEnum("status").notNull().default("active"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("governance_mandates_tenant_id_idx").on(table.tenantId),
		index("governance_mandates_agency_id_idx").on(table.agencyId),
		index("governance_mandates_agent_id_idx").on(table.agentId),
		index("governance_mandates_grant_id_idx").on(table.grantId),
	],
);
export const delegations = pgTable(
	"governance_delegations",
	{
		id: uuid("id").primaryKey(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
		parentGrantId: uuid("parent_grant_id").notNull(),
		delegatePrincipalId: uuid("delegate_principal_id").notNull(),
		capabilitySubset: jsonb("capability_subset").$type<string[]>().notNull(),
		intentHash: text("intent_hash"),
		validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
		status: grantStatusEnum("status").notNull().default("active"),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("governance_delegations_tenant_id_idx").on(table.tenantId),
		index("governance_delegations_agency_id_idx").on(table.agencyId),
		index("governance_delegations_parent_grant_id_idx").on(table.parentGrantId),
		index("governance_delegations_delegate_principal_id_idx").on(
			table.delegatePrincipalId,
		),
	],
);
export const autonomyAssignments = pgTable(
	"governance_autonomy_assignments",
	{
		id: uuid("id").primaryKey(),
		tenantId: uuid("tenant_id").notNull(),
		agencyId: uuid("agency_id").notNull(),
		scopeId: uuid("scope_id").notNull(),
		subjectAgentId: uuid("subject_agent_id").notNull(),
		level: autonomyLevelEnum("level").notNull(),
		status: autonomyAssignmentStatusEnum("status").notNull().default("active"),
		evidenceHash: text("evidence_hash"),
		approvalId: uuid("approval_id"),
		authorityEpochAtAssignment: integer(
			"authority_epoch_at_assignment",
		).notNull(),
		revision: integer("revision").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("governance_autonomy_assignments_tenant_id_idx").on(table.tenantId),
		index("governance_autonomy_assignments_agency_id_idx").on(table.agencyId),
		index("governance_autonomy_assignments_scope_id_idx").on(table.scopeId),
		index("governance_autonomy_assignments_subject_agent_id_idx").on(
			table.subjectAgentId,
		),
		index("governance_autonomy_assignments_status_idx").on(table.status),
	],
);
export const authorityEpochs = pgTable("governance_authority_epochs", {
	tenantId: uuid("tenant_id").notNull(),
	agencyId: uuid("agency_id").notNull(),
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
export type MandateRow = typeof mandates.$inferSelect;
export type NewMandateRow = typeof mandates.$inferInsert;
export type DelegationRow = typeof delegations.$inferSelect;
export type NewDelegationRow = typeof delegations.$inferInsert;
export type AuthorityEpochRow = typeof authorityEpochs.$inferSelect;
export type NewAuthorityEpochRow = typeof authorityEpochs.$inferInsert;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type NewCommandJournalRow = typeof commandJournal.$inferInsert;
export type AutonomyAssignmentRow = typeof autonomyAssignments.$inferSelect;
export type NewAutonomyAssignmentRow = typeof autonomyAssignments.$inferInsert;
