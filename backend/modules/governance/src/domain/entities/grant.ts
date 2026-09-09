import type { GovernanceScopeKind, GrantStatus } from "@anxionos/contracts/governance";

export interface Grant {
	id: string;
	scopeId: string;
	scopeKind: GovernanceScopeKind;
	granteePrincipalId: string;
	granteeAgentId: string | null;
	capability: string;
	resourceRef: string | null;
	status: GrantStatus;
	validFrom: Date;
	validUntil: Date | null;
	derivedFromMembershipId: string | null;
	authorityEpochAtIssue: number;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export function isGrantActive(grant: Grant): boolean {
	return grant.status === "active";
}

export function isGrantRevoked(grant: Grant): boolean {
	return grant.status === "revoked";
}

export function canRevokeGrant(grant: Grant): boolean {
	return grant.status === "active";
}
