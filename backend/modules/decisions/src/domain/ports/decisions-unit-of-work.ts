import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface DecisionRecord {
	id: string;
	organizationId: string;
	grantId: string;
	expectedAuthorityEpoch: number;
	correlationId: string;
	status: string;
	revision: number;
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
export interface DecisionRepository {
	findById(id: string): Promise<DecisionRecord | null>;
	save(record: DecisionRecord): Promise<DecisionRecord>;
	updateStatus(
		id: string,
		status: string,
		revision: number,
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
export interface DecisionsTransactionContext {
	commandJournal: CommandJournalRepository;
	decisions: DecisionRepository;
	proposals: ProposalRepository;
	tradeIntents: TradeIntentRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface DecisionsUnitOfWork {
	runInTransaction<T>(
		work: (ctx: DecisionsTransactionContext) => Promise<T>,
	): Promise<T>;
}
