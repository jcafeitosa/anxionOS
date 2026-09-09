import type { Approval } from "../entities/approval";

export interface ApprovalRepository {
	save(approval: Approval): Promise<Approval>;
	findByChangeProposalId(changeProposalId: string): Promise<Approval | null>;
}
