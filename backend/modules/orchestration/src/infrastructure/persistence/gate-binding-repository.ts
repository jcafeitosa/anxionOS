import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { GateBindingRepository } from "../../domain/ports/gate-binding-repository";
import { gateBindings } from "./schema";

function toGateBinding(row: import("./schema").GateBindingRow) {
	return {
		id: row.id,
		organizationId: row.organizationId,
		gateId: row.gateId,
		issueIdentifier: row.issueIdentifier,
		runId: row.runId,
		disposition: row.disposition,
		reviewerId: row.reviewerId,
		artifactDigest: row.artifactDigest,
		artifactRevision: row.artifactRevision,
		notApplicableReason: row.notApplicableReason,
		hierarchyModeAtRecord: row.hierarchyModeAtRecord,
		schemaVersion: row.schemaVersion,
		recordedAt: row.recordedAt,
		invalidatedAt: row.invalidatedAt,
	};
}
export function createDrizzleGateBindingRepository(
	db: NodePgDatabase<Record<string, unknown>>,
): GateBindingRepository {
	return {
		async append(binding) {
			const rows = await db
				.insert(gateBindings)
				.values({
					organizationId: binding.organizationId,
					gateId: binding.gateId,
					issueIdentifier: binding.issueIdentifier,
					runId: binding.runId ?? null,
					disposition: binding.disposition,
					reviewerId: binding.reviewerId,
					artifactDigest: binding.artifactDigest ?? null,
					artifactRevision: binding.artifactRevision ?? null,
					notApplicableReason: binding.notApplicableReason ?? null,
					hierarchyModeAtRecord: binding.hierarchyModeAtRecord,
					schemaVersion: "1.0.0",
					recordedAt: binding.recordedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to append gate binding");
			return toGateBinding(row);
		},
		async findVigentePass(organizationId, issueIdentifier, gateId) {
			const rows = await db
				.select()
				.from(gateBindings)
				.where(
					and(
						eq(gateBindings.organizationId, organizationId),
						eq(gateBindings.issueIdentifier, issueIdentifier),
						eq(gateBindings.gateId, gateId),
						eq(gateBindings.disposition, "PASS"),
						isNull(gateBindings.invalidatedAt),
					),
				)
				.orderBy(desc(gateBindings.recordedAt))
				.limit(1);
			return rows[0] ? toGateBinding(rows[0]) : null;
		},
		async findVigentePassByIssue(issueIdentifier, gateId) {
			const rows = await db
				.select()
				.from(gateBindings)
				.where(
					and(
						eq(gateBindings.issueIdentifier, issueIdentifier),
						eq(gateBindings.gateId, gateId),
						eq(gateBindings.disposition, "PASS"),
						isNull(gateBindings.invalidatedAt),
					),
				)
				.orderBy(desc(gateBindings.recordedAt))
				.limit(1);
			return rows[0] ? toGateBinding(rows[0]) : null;
		},
		async listByIssue(organizationId, issueIdentifier) {
			const rows = await db
				.select()
				.from(gateBindings)
				.where(
					and(
						eq(gateBindings.organizationId, organizationId),
						eq(gateBindings.issueIdentifier, issueIdentifier),
					),
				);
			return rows.map(toGateBinding);
		},
		async invalidatePassBindings(
			organizationId,
			issueIdentifier,
			gateId,
			invalidatedAt,
		) {
			const rows = await db
				.update(gateBindings)
				.set({ invalidatedAt })
				.where(
					and(
						eq(gateBindings.organizationId, organizationId),
						eq(gateBindings.issueIdentifier, issueIdentifier),
						eq(gateBindings.gateId, gateId),
						eq(gateBindings.disposition, "PASS"),
						isNull(gateBindings.invalidatedAt),
					),
				)
				.returning({ id: gateBindings.id });
			return rows.length;
		},
		async countByOrganizationSince(organizationId, since) {
			const rows = await db
				.select({ total: count() })
				.from(gateBindings)
				.where(
					and(
						eq(gateBindings.organizationId, organizationId),
						gte(gateBindings.recordedAt, since),
					),
				);
			return Number(rows[0]?.total ?? 0);
		},
	};
}
