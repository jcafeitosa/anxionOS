import { and, eq, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Membership } from "../../domain/entities/membership";
import { MembershipRevisionConflictError } from "../../domain/errors/membership-errors";
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
				const rows = await db
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
					.returning();
				const row = rows[0];
				if (!row) {
					throw new MembershipRevisionConflictError();
				}
				return toMembership(row);
			}
			const rows = await db
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
				.returning();
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
