import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Delegation } from "../../domain/entities/delegation";
import type { DelegationRepository } from "../../domain/ports/delegation-repository";
import { type DelegationRow, delegations } from "./schema";

function toDelegation(row: DelegationRow): Delegation {
	return {
		id: row.id,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		parentGrantId: row.parentGrantId,
		delegatePrincipalId: row.delegatePrincipalId,
		capabilitySubset: row.capabilitySubset,
		intentHash: row.intentHash,
		validUntil: row.validUntil,
		status: row.status,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleDelegationRepository(
	db: NodePgDatabase<{ delegations: typeof delegations }>,
): DelegationRepository {
	return {
		async save(delegation) {
			const existing = await db
				.select()
				.from(delegations)
				.where(eq(delegations.id, delegation.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(delegations)
					.set({
						capabilitySubset: delegation.capabilitySubset,
						intentHash: delegation.intentHash,
						validUntil: delegation.validUntil,
						status: delegation.status,
						revision: delegation.revision,
						updatedAt: delegation.updatedAt,
					})
					.where(eq(delegations.id, delegation.id))
					.returning();
				return toDelegation(rows[0]!);
			}
			const rows = await db
				.insert(delegations)
				.values({
					id: delegation.id,
					tenantId: delegation.tenantId,
					agencyId: delegation.agencyId,
					parentGrantId: delegation.parentGrantId,
					delegatePrincipalId: delegation.delegatePrincipalId,
					capabilitySubset: delegation.capabilitySubset,
					intentHash: delegation.intentHash,
					validUntil: delegation.validUntil,
					status: delegation.status,
					revision: delegation.revision,
					createdAt: delegation.createdAt,
					updatedAt: delegation.updatedAt,
				})
				.returning();
			return toDelegation(rows[0]!);
		},
		async findById(delegationId) {
			const rows = await db
				.select()
				.from(delegations)
				.where(eq(delegations.id, delegationId))
				.limit(1);
			return rows[0] ? toDelegation(rows[0]) : null;
		},
	};
}
