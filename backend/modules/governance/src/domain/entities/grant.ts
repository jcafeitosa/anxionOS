import type {
	GovernanceScopeKind,
	GrantStatus,
} from "@anxionos/contracts/governance";

export interface Grant {
	id: string;
	tenantId: string;
	agencyId: string;
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

export function isGrantEffectiveAt(grant: Grant, asOf: Date): boolean {
	if (!isGrantActive(grant)) {
		return false;
	}
	if (grant.validUntil && grant.validUntil <= asOf) {
		return false;
	}
	return grant.validFrom <= asOf;
}

export function isGrantRevoked(grant: Grant): boolean {
	return grant.status === "revoked";
}

export function canRevokeGrant(grant: Grant): boolean {
	return grant.status === "active";
}
