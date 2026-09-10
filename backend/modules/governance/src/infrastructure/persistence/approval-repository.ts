import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Approval } from "../../domain/entities/approval";
import type { ApprovalRepository } from "../../domain/ports/approval-repository";
import { type ApprovalRow, approvals } from "./schema";

export function toApproval(row: ApprovalRow): Approval {
	return {
		id: row.id,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		changeProposalId: row.changeProposalId,
		actionRef: row.actionRef,
		resolverPrincipalId: row.resolverPrincipalId,
		decision: row.decision,
		reason: row.reason,
		resolvedAt: row.resolvedAt,
		revision: row.revision,
	};
}

export function createDrizzleApprovalRepository(
	db: NodePgDatabase<{ approvals: typeof approvals }>,
): ApprovalRepository {
	return {
		async save(approval: Approval) {
			const existing = await db
				.select()
				.from(approvals)
				.where(eq(approvals.id, approval.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(approvals)
					.set({
						decision: approval.decision,
						reason: approval.reason,
						resolvedAt: approval.resolvedAt,
						revision: approval.revision,
					})
					.where(eq(approvals.id, approval.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update approval");
				return toApproval(row);
			}
			const rows = await db
				.insert(approvals)
				.values({
					id: approval.id,
					tenantId: approval.tenantId,
					agencyId: approval.agencyId,
					changeProposalId: approval.changeProposalId,
					actionRef: approval.actionRef,
					resolverPrincipalId: approval.resolverPrincipalId,
					decision: approval.decision,
					reason: approval.reason,
					resolvedAt: approval.resolvedAt,
					revision: approval.revision,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create approval");
			return toApproval(row);
		},
		async findByChangeProposalId(changeProposalId: string) {
			const rows = await db
				.select()
				.from(approvals)
				.where(eq(approvals.changeProposalId, changeProposalId))
				.limit(1);
			return rows[0] ? toApproval(rows[0]) : null;
		},
	};
}
