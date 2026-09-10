import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Agency } from "../../domain/entities/agency";
import type { AgencyRepository } from "../../domain/ports/agency-repository";
import { agencies, type AgencyRow } from "./schema";

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
			const existing = await db.select().from(agencies).where(eq(agencies.id, agency.id)).limit(1);
			if (existing[0]) {
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
					.where(eq(agencies.id, agency.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update agency");
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
			const rows = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
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
