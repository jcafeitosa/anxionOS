import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Agency } from "../../domain/entities/agency";
import { AgencyRevisionConflictError } from "../../domain/errors/agency-errors";
import type { AgencyRepository } from "../../domain/ports/agency-repository";
import { type AgencyRow, agencies } from "./schema";

export function toAgency(row: AgencyRow): Agency {
	return {
		id: row.id,
		ownerPrincipalId: row.ownerPrincipalId,
		displayName: row.displayName,
		marketScope: row.marketScope,
		status: row.status,
		onboardingStep: row.onboardingStep,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAgencyRepository(
	db: NodePgDatabase<{ agencies: typeof agencies }>,
): AgencyRepository {
	return {
		async save(agency: Agency) {
			const existing = await db
				.select()
				.from(agencies)
				.where(eq(agencies.id, agency.id))
				.limit(1);
			if (existing[0]) {
				// Guarda otimista: grava apenas se a revisao em banco ainda for a
				// anterior a' que este agregado carrega. Sem ela, `UPDATE` cego
				// sobrescrevia alteracao concorrente (lost update) e o evento saia
				// com `previous*` obsoleto (S4c/ANX-460). Mesmo desenho de
				// `membership-repository.save`.
				const expectedRevision = agency.revision - 1;
				const rows = await db
					.update(agencies)
					.set({
						ownerPrincipalId: agency.ownerPrincipalId,
						displayName: agency.displayName,
						marketScope: agency.marketScope,
						status: agency.status,
						onboardingStep: agency.onboardingStep,
						revision: agency.revision,
						updatedAt: agency.updatedAt,
					})
					.where(
						and(
							eq(agencies.id, agency.id),
							eq(agencies.revision, expectedRevision),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) throw new AgencyRevisionConflictError();
				return toAgency(row);
			}
			const rows = await db
				.insert(agencies)
				.values({
					id: agency.id,
					tenantId: agency.id,
					agencyId: agency.id,
					ownerPrincipalId: agency.ownerPrincipalId,
					displayName: agency.displayName,
					marketScope: agency.marketScope,
					status: agency.status,
					onboardingStep: agency.onboardingStep,
					revision: agency.revision,
					createdAt: agency.createdAt,
					updatedAt: agency.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agency");
			return toAgency(row);
		},
		async findByAgencyId(agencyId: string) {
			const rows = await db
				.select()
				.from(agencies)
				.where(eq(agencies.id, agencyId))
				.limit(1);
			return rows[0] ? toAgency(rows[0]) : null;
		},
		async findByOwnerPrincipalId(ownerPrincipalId: string) {
			const rows = await db
				.select()
				.from(agencies)
				.where(eq(agencies.ownerPrincipalId, ownerPrincipalId));
			return rows.map(toAgency);
		},
	};
}
