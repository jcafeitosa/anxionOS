import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ChangeProposal } from "../../domain/entities/change-proposal";
import type { ChangeProposalRepository } from "../../domain/ports/change-proposal-repository";
import { type ChangeProposalRow, changeProposals } from "./schema";

export class ChangeProposalRevisionConflictError extends Error {
	constructor() {
		super("ChangeProposal revision conflict");
		this.name = "ChangeProposalRevisionConflictError";
	}
}

export function toChangeProposal(row: ChangeProposalRow): ChangeProposal {
	return {
		id: row.id,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		scopeId: row.scopeId,
		kind: row.kind,
		payloadHash: row.payloadHash,
		proposerPrincipalId: row.proposerPrincipalId,
		status: row.status,
		requiredApprovals: row.requiredApprovals,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleChangeProposalRepository(
	db: NodePgDatabase<{ changeProposals: typeof changeProposals }>,
): ChangeProposalRepository {
	return {
		async save(proposal: ChangeProposal) {
			const existing = await db
				.select()
				.from(changeProposals)
				.where(eq(changeProposals.id, proposal.id))
				.limit(1);
			if (existing[0]) {
				const expectedRevision = proposal.revision - 1;
				const rows = await db
					.update(changeProposals)
					.set({
						status: proposal.status,
						revision: proposal.revision,
						updatedAt: proposal.updatedAt,
					})
					.where(
						and(
							eq(changeProposals.id, proposal.id),
							eq(changeProposals.revision, expectedRevision),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					throw new ChangeProposalRevisionConflictError();
				}
				return toChangeProposal(row);
			}
			const rows = await db
				.insert(changeProposals)
				.values({
					id: proposal.id,
					tenantId: proposal.tenantId,
					agencyId: proposal.agencyId,
					scopeId: proposal.scopeId,
					kind: proposal.kind,
					payloadHash: proposal.payloadHash,
					proposerPrincipalId: proposal.proposerPrincipalId,
					status: proposal.status,
					requiredApprovals: proposal.requiredApprovals,
					revision: proposal.revision,
					createdAt: proposal.createdAt,
					updatedAt: proposal.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create change proposal");
			return toChangeProposal(row);
		},
		async findById(proposalId: string) {
			const rows = await db
				.select()
				.from(changeProposals)
				.where(eq(changeProposals.id, proposalId))
				.limit(1);
			return rows[0] ? toChangeProposal(rows[0]) : null;
		},
		async findPendingByScope(scopeId: string) {
			const rows = await db
				.select()
				.from(changeProposals)
				.where(
					and(
						eq(changeProposals.scopeId, scopeId),
						eq(changeProposals.status, "pending"),
					),
				);
			return rows.map(toChangeProposal);
		},
	};
}
