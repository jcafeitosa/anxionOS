import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Mandate } from "../../domain/entities/mandate";
import type { MandateRepository } from "../../domain/ports/mandate-repository";
import { type MandateRow, mandates } from "./schema";

function toMandate(row: MandateRow): Mandate {
	return {
		id: row.id,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		agentId: row.agentId,
		grantId: row.grantId,
		mandateKind: row.mandateKind,
		status: row.status,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleMandateRepository(
	db: NodePgDatabase<{ mandates: typeof mandates }>,
): MandateRepository {
	return {
		async save(mandate) {
			const existing = await db
				.select()
				.from(mandates)
				.where(eq(mandates.id, mandate.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(mandates)
					.set({
						status: mandate.status,
						revision: mandate.revision,
						updatedAt: mandate.updatedAt,
					})
					.where(eq(mandates.id, mandate.id))
					.returning();
				return toMandate(rows[0]!);
			}
			const rows = await db
				.insert(mandates)
				.values({
					id: mandate.id,
					tenantId: mandate.tenantId,
					agencyId: mandate.agencyId,
					agentId: mandate.agentId,
					grantId: mandate.grantId,
					mandateKind: mandate.mandateKind,
					status: mandate.status,
					revision: mandate.revision,
					createdAt: mandate.createdAt,
					updatedAt: mandate.updatedAt,
				})
				.returning();
			return toMandate(rows[0]!);
		},
		async findById(mandateId) {
			const rows = await db
				.select()
				.from(mandates)
				.where(eq(mandates.id, mandateId))
				.limit(1);
			return rows[0] ? toMandate(rows[0]) : null;
		},
		async findActiveByAgentAndAgency(agentId, agencyId) {
			const rows = await db
				.select()
				.from(mandates)
				.where(
					and(
						eq(mandates.agentId, agentId),
						eq(mandates.agencyId, agencyId),
						eq(mandates.status, "active"),
					),
				)
				.limit(1);
			return rows[0] ? toMandate(rows[0]) : null;
		},
	};
}
