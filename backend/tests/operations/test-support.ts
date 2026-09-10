import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../../modules/operations/src/domain/ports/command-journal";
import type {
	HealthCheckRecord,
	HealthCheckRepository,
	HealthCheckUpdateInput,
	IncidentRecord,
	IncidentRepository,
	IncidentUpdateInput,
	OperationsTransactionContext,
	OperationsUnitOfWork,
} from "../../modules/operations/src/domain/ports/operations-unit-of-work";
import { HealthCheckRevisionConflictError } from "../../modules/operations/src/domain/errors/health-check-errors";
import { IncidentRevisionConflictError } from "../../modules/operations/src/domain/errors/incident-errors";

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalEntry[] = [],
): CommandJournalRepository {
	const records = new Map(
		seed.map((record) => [record.commandId, { ...record }]),
	);
	return {
		async findByCommandId(commandId) {
			return records.get(commandId) ?? null;
		},
		async save(entry) {
			records.set(entry.commandId, { ...entry });
		},
	};
}

export function createInMemoryHealthCheckRepository(
	seed: HealthCheckRecord[] = [],
): HealthCheckRepository {
	const records = new Map(
		seed.map((record) => [
			`${record.organizationId}:${record.serviceId}`,
			{ ...record },
		]),
	);
	return {
		async findByOrganizationAndServiceId(organizationId, serviceId) {
			return records.get(`${organizationId}:${serviceId}`) ?? null;
		},
		async save(record) {
			const stored = { ...record };
			records.set(`${record.organizationId}:${record.serviceId}`, stored);
			return stored;
		},
		async update(record: HealthCheckUpdateInput) {
			const key = `${record.organizationId}:${record.serviceId}`;
			const existing = records.get(key);
			if (!existing || existing.revision !== record.expectedRevision) {
				throw new HealthCheckRevisionConflictError();
			}
			const stored = { ...record };
			records.set(key, stored);
			return stored;
		},
	};
}

export function createInMemoryIncidentRepository(
	seed: IncidentRecord[] = [],
): IncidentRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async findById(id) {
			return records.get(id) ?? null;
		},
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
		async update(record: IncidentUpdateInput) {
			const existing = records.get(record.id);
			if (!existing || existing.revision !== record.expectedRevision) {
				throw new IncidentRevisionConflictError();
			}
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
	};
}

export function createRecordingOperationsUnitOfWork(deps: {
	commandJournal: CommandJournalRepository;
	healthChecks: HealthCheckRepository;
	incidents?: IncidentRepository;
}): { unitOfWork: OperationsUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	const incidents =
		deps.incidents ?? createInMemoryIncidentRepository();
	const unitOfWork: OperationsUnitOfWork = {
		async runInTransaction(work) {
			const context: OperationsTransactionContext = {
				commandJournal: deps.commandJournal,
				healthChecks: deps.healthChecks,
				incidents,
				async publishEvents(envelopes) {
					published.push(...envelopes);
				},
			};
			return work(context);
		},
	};
	return { unitOfWork, published };
}
