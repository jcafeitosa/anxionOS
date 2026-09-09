import type { ChangeProposal } from "../entities/change-proposal";

export interface ChangeProposalRepository {
	save(proposal: ChangeProposal): Promise<ChangeProposal>;
	findById(proposalId: string): Promise<ChangeProposal | null>;
	findPendingByScope(scopeId: string): Promise<ChangeProposal[]>;
}
