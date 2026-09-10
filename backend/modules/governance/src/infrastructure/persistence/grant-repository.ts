import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Grant } from "../../domain/entities/grant";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import { type GrantRow, grants } from "./schema";

export class GrantRevisionConflictError extends Error {
	constructor() {
		super("Grant revision conflict");
		this.name = "GrantRevisionConflictError";
	}
}

export function toGrant(row: GrantRow): Grant {
	return {
		id: row.id,
		scopeId: row.scopeId,
		scopeKind: row.scopeKind,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		granteePrincipalId: row.granteePrincipalId,
		granteeAgentId: row.granteeAgentId,
		capability: row.capability,
		resourceRef: row.resourceRef,
		status: row.status,
		validFrom: row.validFrom,
		validUntil: row.validUntil,
		derivedFromMembershipId: row.derivedFromMembershipId,
		authorityEpochAtIssue: row.authorityEpochAtIssue,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleGrantRepository(
	db: NodePgDatabase<{ grants: typeof grants }>,
): GrantRepository {
	return {
		async save(grant: Grant) {
			const existing = await db
				.select()
				.from(grants)
				.where(eq(grants.id, grant.id))
				.limit(1);
			if (existing[0]) {
				const expectedRevision = grant.revision - 1;
				const rows = await db
					.update(grants)
					.set({
						status: grant.status,
						validUntil: grant.validUntil,
						revision: grant.revision,
						updatedAt: grant.updatedAt,
					})
					.where(
						and(eq(grants.id, grant.id), eq(grants.revision, expectedRevision)),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					throw new GrantRevisionConflictError();
				}
				return toGrant(row);
			}
			const rows = await db
				.insert(grants)
				.values({
					id: grant.id,
					tenantId: grant.tenantId,
					agencyId: grant.agencyId,
					scopeId: grant.scopeId,
					scopeKind: grant.scopeKind,
					granteePrincipalId: grant.granteePrincipalId,
					granteeAgentId: grant.granteeAgentId,
					capability: grant.capability,
					resourceRef: grant.resourceRef,
					status: grant.status,
					validFrom: grant.validFrom,
					validUntil: grant.validUntil,
					derivedFromMembershipId: grant.derivedFromMembershipId,
					authorityEpochAtIssue: grant.authorityEpochAtIssue,
					revision: grant.revision,
					createdAt: grant.createdAt,
					updatedAt: grant.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create grant");
			return toGrant(row);
		},
		async findById(grantId: string) {
			const rows = await db
				.select()
				.from(grants)
				.where(eq(grants.id, grantId))
				.limit(1);
			return rows[0] ? toGrant(rows[0]) : null;
		},
		async listEffective(scopeId: string, principalId: string) {
			const rows = await db
				.select()
				.from(grants)
				.where(
					and(
						eq(grants.scopeId, scopeId),
						eq(grants.granteePrincipalId, principalId),
						eq(grants.status, "active"),
					),
				);
			return rows.map(toGrant);
		},
		async listEffectiveForAgent(scopeId: string, subjectAgentId: string) {
			const rows = await db
				.select()
				.from(grants)
				.where(
					and(
						eq(grants.scopeId, scopeId),
						eq(grants.granteeAgentId, subjectAgentId),
						eq(grants.status, "active"),
					),
				);
			return rows.map(toGrant);
		},
		async findActiveByDerivedFromMembershipId(membershipId: string) {
			const rows = await db
				.select()
				.from(grants)
				.where(
					and(
						eq(grants.derivedFromMembershipId, membershipId),
						eq(grants.status, "active"),
					),
				);
			return rows.map(toGrant);
		},
	};
}
