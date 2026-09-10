export type DelegationStatus = "active" | "revoked" | "expired";

export interface Delegation {
	id: string;
	tenantId: string;
	agencyId: string;
	parentGrantId: string;
	delegatePrincipalId: string;
	capabilitySubset: string[];
	intentHash: string | null;
	validUntil: Date;
	status: DelegationStatus;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export function isDelegationActive(delegation: Delegation): boolean {
	return delegation.status === "active";
}
