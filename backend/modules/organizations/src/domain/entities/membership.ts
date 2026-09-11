import type {
	MembershipRole,
	MembershipStatus,
} from "@anxionos/contracts/organizations";

const MEMBERSHIP_STATUS_TRANSITIONS: Record<
	MembershipStatus,
	MembershipStatus[]
> = {
	invited: ["active", "revoked"],
	active: ["revoked"],
	// D-ORG-046 (ANX-460): `revoked -> active` existe para REATIVACAO assistida de
	// quem ja' consentiu antes (o principal ja' esta' vinculado a' membership).
	// Nao e' caminho de primeira vinculacao: `activateMembership` recusa quando
	// `principalId` e' nulo, e quem ativa pela primeira vez e' o proprio
	// convidado via `acceptInviteByToken` (G5-F2).
	revoked: ["active"],
};

export function canTransitionMembershipStatus(
	from: MembershipStatus,
	to: MembershipStatus,
): boolean {
	if (from === to) {
		return true;
	}
	return MEMBERSHIP_STATUS_TRANSITIONS[from].includes(to);
}

/** INV-ORG-02: at least one active owner must remain on the agency. */
export function wouldViolateOwnerRequired(
	memberships: readonly Membership[],
	targetMembershipId: string,
): boolean {
	const target = memberships.find(
		(membership) => membership.id === targetMembershipId,
	);
	if (!target || target.role !== "owner" || target.status !== "active") {
		return false;
	}
	const activeOwners = memberships.filter(
		(membership) =>
			membership.role === "owner" && membership.status === "active",
	);
	return activeOwners.length <= 1;
}

export function countActiveOwners(memberships: readonly Membership[]): number {
	return memberships.filter(
		(membership) =>
			membership.role === "owner" && membership.status === "active",
	).length;
}

export interface Membership {
	id: string;
	agencyId: string;
	principalId: string | null;
	inviteEmail: string | null;
	inviteTokenHash: string | null;
	inviteExpiresAt: Date | null;
	role: MembershipRole;
	status: MembershipStatus;
	invitedAt: Date | null;
	joinedAt: Date | null;
	revokedAt: Date | null;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface NewMembership {
	agencyId: string;
	principalId?: string | null;
	inviteEmail?: string | null;
	inviteTokenHash?: string | null;
	inviteExpiresAt?: Date | null;
	role: MembershipRole;
	status: MembershipStatus;
}
