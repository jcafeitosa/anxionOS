import type { ChangeProposalKind, ChangeProposalStatus } from "@anxionos/contracts/governance";

export interface ChangeProposal {
	id: string;
	scopeId: string;
	kind: ChangeProposalKind;
	payloadHash: string;
	proposerPrincipalId: string;
	status: ChangeProposalStatus;
	requiredApprovals: number;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export function isChangeProposalPending(proposal: ChangeProposal): boolean {
	return proposal.status === "pending";
}

export function defaultRequiredApprovals(kind: ChangeProposalKind): number {
	switch (kind) {
		case "SOFTWARE":
		case "INSTITUTIONAL":
		case "HIERARCHY_MODE":
			return 1;
		default: {
			const exhaustive: never = kind;
			return exhaustive;
		}
	}
}
