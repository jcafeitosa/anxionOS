import type { ApprovalDecision } from "@anxionos/contracts/governance";

export interface Approval {
	id: string;
	tenantId: string;
	agencyId: string;
	changeProposalId: string;
	actionRef: string | null;
	resolverPrincipalId: string;
	decision: ApprovalDecision;
	reason: string | null;
	resolvedAt: Date;
	revision: number;
}
