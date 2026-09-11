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
	filledQuantity: string;
	status: string;
	venueDispatchStatus?: string | null;
}
export interface ExecutionOrderAttemptRecord {
	id: string;
	organizationId: string;
	orderId: string;
	attemptNo: number;
	adapterKind: string;
	requestHash: string;
	status: string;
	responseCode?: string | null;
	errorCode?: string | null;
	sentAt: string;
}
export interface ExecutionReconciliationCaseRecord {
	id: string;
	organizationId: string;
	caseKind: string;
	status: string;
	orderId?: string | null;
	fillId?: string | null;
	venueAdapterRefId: string;
	venueFillId?: string | null;
	evidence?: string | null;
	disposition?: string | null;
	dispositionRationale?: string | null;
	openedAt: string;
	resolvedAt?: string | null;
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
export interface ExecutionOrderListRow extends ExecutionOrderRecord {
	executionMode: string;
	submittedAt: string;
}

export interface ExecutionOrderRepository {
	findById(id: string): Promise<ExecutionOrderRecord | null>;
	findByIdForUpdate(id: string): Promise<ExecutionOrderRecord | null>;
	findByClientOrderId(
		organizationId: string,
		clientOrderId: string,
	): Promise<ExecutionOrderRecord | null>;
	listOpenByOrganizationId(
		organizationId: string,
		limit?: number,
	): Promise<ExecutionOrderListRow[]>;
	save(record: ExecutionOrderRecord): Promise<ExecutionOrderRecord>;
	update(record: ExecutionOrderRecord): Promise<ExecutionOrderRecord>;
}
export interface ExecutionFillRepository {
	findByVenueFillId(venueFillId: string): Promise<ExecutionFillRecord | null>;
	findByOrderId(orderId: string): Promise<ExecutionFillRecord[]>;
	save(record: ExecutionFillRecord): Promise<ExecutionFillRecord>;
}
export interface ExecutionOrderAttemptRepository {
	findLatestByOrderId(
		orderId: string,
	): Promise<ExecutionOrderAttemptRecord | null>;
	countByOrderId(orderId: string): Promise<number>;
	save(
		record: ExecutionOrderAttemptRecord,
	): Promise<ExecutionOrderAttemptRecord>;
}
export interface ExecutionReconciliationCaseRepository {
	findById(id: string): Promise<ExecutionReconciliationCaseRecord | null>;
	findOpenByVenueFillId(
		organizationId: string,
		venueFillId: string,
	): Promise<ExecutionReconciliationCaseRecord | null>;
	listByOrganizationId(
		organizationId: string,
		limit?: number,
	): Promise<ExecutionReconciliationCaseRecord[]>;
	save(
		record: ExecutionReconciliationCaseRecord,
	): Promise<ExecutionReconciliationCaseRecord>;
	update(
		record: ExecutionReconciliationCaseRecord,
	): Promise<ExecutionReconciliationCaseRecord>;
}
export interface ExecutionTransactionContext {
	commandJournal: CommandJournalRepository;
	venueAdapterRefs: VenueAdapterRefRepository;
	sessions: ExecutionSessionRepository;
	orders: ExecutionOrderRepository;
	fills: ExecutionFillRepository;
	orderAttempts: ExecutionOrderAttemptRepository;
	reconciliationCases: ExecutionReconciliationCaseRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface ExecutionUnitOfWork {
	runInTransaction<T>(
		work: (ctx: ExecutionTransactionContext) => Promise<T>,
	): Promise<T>;
}
