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
	/**
	 * ANX-469 — principal que emitiu o grant quando a emissao tem ator
	 * identificado. `null` em grants derivados pelo sistema (baseline de
	 * membership, break-glass e filhos de delegation), que nao tem principal
	 * emissor e por isso so' sao revogaveis por `owner`/`admin` da agencia.
	 */
	issuedByPrincipalId: string | null;
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
