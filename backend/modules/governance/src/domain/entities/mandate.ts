import type { MandateKind, MandateStatus } from "@anxionos/contracts/governance";

export interface Mandate {
	id: string;
	tenantId: string;
	agencyId: string;
	agentId: string;
	grantId: string;
	mandateKind: MandateKind;
	status: MandateStatus;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export function isMandateActive(mandate: Mandate): boolean {
	return mandate.status === "active";
}
