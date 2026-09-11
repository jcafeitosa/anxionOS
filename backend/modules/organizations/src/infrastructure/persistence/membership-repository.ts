import { and, eq, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Membership } from "../../domain/entities/membership";
import {
	MembershipAlreadyActiveError,
	MembershipRevisionConflictError,
} from "../../domain/errors/membership-errors";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { type MembershipRow, memberships } from "./schema";

export function toMembership(row: MembershipRow): Membership {
	return {
		id: row.id,
		agencyId: row.agencyId,
		principalId: row.principalId,
		inviteEmail: row.inviteEmail,
		inviteTokenHash: row.inviteTokenHash,
		inviteExpiresAt: row.inviteExpiresAt,
		role: row.role,
		status: row.status,
		invitedAt: row.invitedAt,
		joinedAt: row.joinedAt,
		revokedAt: row.revokedAt,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/**
 * Extrai o nome da constraint de uma violacao `23505`. O driver nao expoe o
 * codigo no topo: drizzle envolve o erro do `pg` em `DrizzleQueryError` com
 * `cause = DatabaseError`, entao a cadeia de `cause` e' percorrida (mesmo
 * cuidado ja' tomado no `identity`, onde ler so' `error.code` deixava os
 * mapeamentos mortos em producao).
 */
function membershipUniquenessConstraint(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; depth < 5; depth += 1) {
		if (typeof current !== "object" || current === null) {
			return undefined;
		}
		const candidate = current as { code?: unknown; constraint?: unknown };
		if (candidate.code === "23505") {
			return typeof candidate.constraint === "string"
				? candidate.constraint
				: "unknown";
		}
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

/**
 * Converte violacao de unicidade de membership no erro de dominio. Sem isto o
 * `23505` cru subia ate' o boundary como **500** (a transicao `revoked -> active`
 * tornou a colisao alcancavel pela API — F-01 dos gates G3/G4/G5 da ANX-460).
 */
async function guardMembershipUniqueness<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		const constraint = membershipUniquenessConstraint(error);
		if (constraint) {
			throw new MembershipAlreadyActiveError(constraint);
		}
		throw error;
	}
}

export function createDrizzleMembershipRepository(
	db: NodePgDatabase<{ memberships: typeof memberships }>,
): MembershipRepository {
	return {
		async save(membership: Membership) {
			const existing = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.id, membership.id),
						eq(memberships.agencyId, membership.agencyId),
					),
				)
				.limit(1);
			if (existing[0]) {
				const expectedRevision = membership.revision - 1;
				const rows = await guardMembershipUniqueness(() =>
					db
						.update(memberships)
						.set({
							principalId: membership.principalId,
							inviteEmail: membership.inviteEmail,
							inviteTokenHash: membership.inviteTokenHash,
							inviteExpiresAt: membership.inviteExpiresAt,
							role: membership.role,
							status: membership.status,
							invitedAt: membership.invitedAt,
							joinedAt: membership.joinedAt,
							revokedAt: membership.revokedAt,
							revision: membership.revision,
							updatedAt: membership.updatedAt,
						})
						.where(
							and(
								eq(memberships.id, membership.id),
								eq(memberships.agencyId, membership.agencyId),
								eq(memberships.revision, expectedRevision),
							),
						)
						.returning(),
				);
				const row = rows[0];
				if (!row) {
					throw new MembershipRevisionConflictError();
				}
				return toMembership(row);
			}
			const rows = await guardMembershipUniqueness(() =>
				db
					.insert(memberships)
					.values({
						id: membership.id,
						tenantId: membership.agencyId,
						agencyId: membership.agencyId,
						principalId: membership.principalId,
						inviteEmail: membership.inviteEmail,
						inviteTokenHash: membership.inviteTokenHash,
						inviteExpiresAt: membership.inviteExpiresAt,
						role: membership.role,
						status: membership.status,
						invitedAt: membership.invitedAt,
						joinedAt: membership.joinedAt,
						revokedAt: membership.revokedAt,
						revision: membership.revision,
						createdAt: membership.createdAt,
						updatedAt: membership.updatedAt,
					})
					.returning(),
			);
			const row = rows[0];
			if (!row) throw new Error("Failed to create membership");
			return toMembership(row);
		},
		async findById(agencyId: string, membershipId: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.id, membershipId),
						eq(memberships.agencyId, agencyId),
					),
				)
				.limit(1);
			return rows[0] ? toMembership(rows[0]) : null;
		},
		async findByAgencyAndPrincipal(agencyId: string, principalId: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.agencyId, agencyId),
						eq(memberships.principalId, principalId),
					),
				)
				.limit(1);
			return rows[0] ? toMembership(rows[0]) : null;
		},
		async findInvitedByAgencyAndEmail(agencyId: string, email: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.agencyId, agencyId),
						eq(memberships.status, "invited"),
						sql`lower(${memberships.inviteEmail}) = lower(${email})`,
					),
				)
				.limit(1);
			return rows[0] ? toMembership(rows[0]) : null;
		},
		async findInvitedByTokenHash(tokenHash: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.inviteTokenHash, tokenHash),
						eq(memberships.status, "invited"),
					),
				)
				.limit(1);
			return rows[0] ? toMembership(rows[0]) : null;
		},
		async listByAgency(agencyId: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(eq(memberships.agencyId, agencyId));
			return rows.map(toMembership);
		},
		async listActiveByPrincipal(principalId: string) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.principalId, principalId),
						eq(memberships.status, "active"),
					),
				);
			return rows.map(toMembership);
		},
		async listInvitedForActor(input: { principalId: string; email: string }) {
			const rows = await db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.status, "invited"),
						or(
							eq(memberships.principalId, input.principalId),
							sql`lower(${memberships.inviteEmail}) = lower(${input.email})`,
						),
					),
				);
			return rows.map(toMembership);
		},
	};
}
