import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface VenueAdapterRefRecord {
	id: string;
	organizationId: string;
	adapterKind: string;
	status: string;
}
export interface ExecutionSessionRecord {
	id: string;
	organizationId: string;
	status: string;
	intentHash: string;
	riskPermitId: string;
	authorityEpoch: number;
	riskEpoch: number;
	executionMode: string;
	venueAdapterRefId: string;
}
export interface ExecutionOrderRecord {
	id: string;
	organizationId: string;
	sessionId: string;
	clientOrderId: string;
	instrumentId: string;
	side: string;
	quantity: string;
	price: string;
	status: string;
}
export interface ExecutionFillRecord {
	id: string;
	organizationId: string;
	orderId: string;
	venueFillId: string;
	quantity: string;
	price: string;
	notionalAmount: string;
	asset: string;
	status: string;
	filledAt: string;
}
export interface VenueAdapterRefRepository {
	findSimulatedByOrganization(
		organizationId: string,
	): Promise<VenueAdapterRefRecord | null>;
	save(record: VenueAdapterRefRecord): Promise<VenueAdapterRefRecord>;
}
export interface ExecutionSessionRepository {
	findById(id: string): Promise<ExecutionSessionRecord | null>;
	save(record: ExecutionSessionRecord): Promise<ExecutionSessionRecord>;
}
export interface ExecutionOrderRepository {
	findByClientOrderId(
		organizationId: string,
		clientOrderId: string,
	): Promise<ExecutionOrderRecord | null>;
	save(record: ExecutionOrderRecord): Promise<ExecutionOrderRecord>;
}
export interface ExecutionFillRepository {
	findByVenueFillId(venueFillId: string): Promise<ExecutionFillRecord | null>;
	save(record: ExecutionFillRecord): Promise<ExecutionFillRecord>;
}
export interface ExecutionTransactionContext {
	commandJournal: CommandJournalRepository;
	venueAdapterRefs: VenueAdapterRefRepository;
	sessions: ExecutionSessionRepository;
	orders: ExecutionOrderRepository;
	fills: ExecutionFillRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface ExecutionUnitOfWork {
	runInTransaction<T>(
		work: (ctx: ExecutionTransactionContext) => Promise<T>,
	): Promise<T>;
}
