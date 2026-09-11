import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
import type { EvidenceManifestRepository } from "./evidence-manifest";
import type { SubmitPreconditionsRepository } from "./submit-preconditions";
export interface DecisionRecord {
	id: string;
	organizationId: string;
	grantId: string;
	expectedAuthorityEpoch: number;
	correlationId: string;
	status: string;
	revision: number;
	proposerId?: string;
	runId?: string;
	approvalPath: boolean;
}
export interface ProposalRecord {
	id: string;
	decisionId: string;
	organizationId: string;
	proposalKind: string;
	status: string;
}
export interface TradeIntentRecord {
	id: string;
	decisionId: string;
	organizationId: string;
	intentHash: string;
	instrumentId: string;
	side: string;
	quantity: string;
	price: string;
	executionMode: string;
}
export interface ApprovalRecord {
	id: string;
	decisionId: string;
	organizationId: string;
	proposerId: string;
	approverId?: string;
	status: string;
	runId?: string;
	operationId?: string;
}
export interface DispositionRecord {
	id: string;
	decisionId: string;
	organizationId: string;
	dispositionKind: string;
	outcome: string;
	reason: string;
	approverId: string;
	intentHash?: string;
}
export interface DecisionRepository {
	findById(id: string): Promise<DecisionRecord | null>;
	save(record: DecisionRecord): Promise<DecisionRecord>;
	updateStatus(
		id: string,
		status: string,
		revision: number,
	): Promise<DecisionRecord>;
	updateApprovalPath(
		id: string,
		input: {
			status: string;
			revision: number;
			proposerId?: string;
			runId?: string;
			approvalPath: boolean;
		},
	): Promise<DecisionRecord>;
}
export interface ProposalRepository {
	save(record: ProposalRecord): Promise<ProposalRecord>;
	findOpenByDecisionId(decisionId: string): Promise<ProposalRecord | null>;
}
export interface TradeIntentRepository {
	findByDecisionId(decisionId: string): Promise<TradeIntentRecord | null>;
	save(record: TradeIntentRecord): Promise<TradeIntentRecord>;
}
export interface ApprovalRepository {
	findPendingByDecisionId(decisionId: string): Promise<ApprovalRecord | null>;
	save(record: ApprovalRecord): Promise<ApprovalRecord>;
	grant(id: string, approverId: string): Promise<ApprovalRecord>;
}
export interface DispositionRepository {
	findByDecisionId(decisionId: string): Promise<DispositionRecord | null>;
	save(record: DispositionRecord): Promise<DispositionRecord>;
}
export interface DecisionsTransactionContext {
	commandJournal: CommandJournalRepository;
	decisions: DecisionRepository;
	proposals: ProposalRepository;
	tradeIntents: TradeIntentRepository;
	approvals: ApprovalRepository;
	dispositions: DispositionRepository;
	submitPreconditions: SubmitPreconditionsRepository;
	evidenceManifests: EvidenceManifestRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface DecisionsUnitOfWork {
	runInTransaction<T>(
		work: (ctx: DecisionsTransactionContext) => Promise<T>,
	): Promise<T>;
}
