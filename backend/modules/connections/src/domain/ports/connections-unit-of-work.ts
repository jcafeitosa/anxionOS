import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";

export interface AiAccountRecord {
	id: string;
	organizationId: string;
	ownerPrincipalId: string;
	providerId: string;
	displayName: string;
	status: string;
	revision: number;
}

export interface ConnectionBindingRecord {
	id: string;
	connectionId: string;
	bindingVersion: number;
	organizationId: string;
	aiAccountId: string;
	kind: string;
	environment: string;
	adapterId: string;
	status: string;
	revision: number;
	secretId: string;
	secretGeneration: number;
}

export interface InferenceRequestRecord {
	id: string;
	organizationId: string;
	bindingId: string;
	bindingVersion: number;
	idempotencyKey: string;
	operation: string;
	status: string;
	modelRef: string | null;
	latencyMs: number | null;
}

export interface AiAccountRepository {
	findDraftByNaturalKey(input: {
		organizationId: string;
		ownerPrincipalId: string;
		providerId: string;
		displayName: string;
	}): Promise<AiAccountRecord | null>;
	save(record: AiAccountRecord): Promise<AiAccountRecord>;
}

export interface ConnectionBindingRepository {
	findActiveById(
		bindingId: string,
		organizationId: string,
	): Promise<ConnectionBindingRecord | null>;
	save(record: ConnectionBindingRecord): Promise<ConnectionBindingRecord>;
}

export interface InferenceRequestRepository {
	findByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<InferenceRequestRecord | null>;
	save(record: InferenceRequestRecord): Promise<InferenceRequestRecord>;
	update(record: InferenceRequestRecord): Promise<InferenceRequestRecord>;
}

export interface UsageRecordRepository {
	save(record: {
		id: string;
		organizationId: string;
		aiAccountId: string;
		connectionBindingId: string;
		bindingVersion: number;
		inferenceRequestId: string;
		consumerKind: string;
		consumerPrincipalId: string;
		operation: string;
		quantity: string;
		unit: string;
	}): Promise<void>;
}

export interface ConnectionsTransactionContext {
	commandJournal: CommandJournalRepository;
	aiAccounts: AiAccountRepository;
	bindings: ConnectionBindingRepository;
	inferenceRequests: InferenceRequestRepository;
	usageRecords: UsageRecordRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface ConnectionsUnitOfWork {
	runInTransaction<T>(
		work: (ctx: ConnectionsTransactionContext) => Promise<T>,
	): Promise<T>;
}
