import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../../modules/operations/src/domain/ports/command-journal";
import type {
	DeletionRequestRecord,
	DeletionRequestRepository,
	ExportJobRecord,
	ExportJobRepository,
	HealthCheckRecord,
	HealthCheckRepository,
	HealthCheckUpdateInput,
	IncidentRecord,
	IncidentRepository,
	IncidentUpdateInput,
	RecoveryTaskRecord,
	RecoveryTaskRepository,
	RecoveryTaskUpdateInput,
	RetentionPolicyRecord,
	RetentionPolicyRepository,
	OperationsTransactionContext,
	OperationsUnitOfWork,
} from "../../modules/operations/src/domain/ports/operations-unit-of-work";
import { HealthCheckRevisionConflictError } from "../../modules/operations/src/domain/errors/health-check-errors";
import { IncidentRevisionConflictError } from "../../modules/operations/src/domain/errors/incident-errors";
import { RecoveryTaskRevisionConflictError } from "../../modules/operations/src/domain/errors/recovery-errors";

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
		async findByOrganizationAndId(organizationId, id) {
			const record = records.get(id);
			if (!record || record.organizationId !== organizationId) {
				return null;
			}
			return record;
		},
		async listByOrganizationId(organizationId) {
			return [...records.values()]
				.filter((record) => record.organizationId === organizationId)
				.sort((left, right) => right.openedAt.localeCompare(left.openedAt));
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

export function createInMemoryRecoveryTaskRepository(
	seed: RecoveryTaskRecord[] = [],
): RecoveryTaskRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async findById(id) {
			return records.get(id) ?? null;
		},
		async findByOrganizationAndId(organizationId, id) {
			const record = records.get(id);
			if (!record || record.organizationId !== organizationId) {
				return null;
			}
			return record;
		},
		async listByOrganizationAndIncidentId(organizationId, incidentId) {
			return [...records.values()]
				.filter(
					(record) =>
						record.organizationId === organizationId &&
						record.incidentId === incidentId,
				)
				.sort((left, right) => left.startedAt.localeCompare(right.startedAt));
		},
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
		async update(record: RecoveryTaskUpdateInput) {
			const existing = records.get(record.id);
			if (!existing || existing.revision !== record.expectedRevision) {
				throw new RecoveryTaskRevisionConflictError();
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
	recoveryTasks?: RecoveryTaskRepository;
	retentionPolicies?: RetentionPolicyRepository;
	exportJobs?: ExportJobRepository;
	deletionRequests?: DeletionRequestRepository;
}): { unitOfWork: OperationsUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	const incidents =
		deps.incidents ?? createInMemoryIncidentRepository();
	const recoveryTasks =
		deps.recoveryTasks ?? createInMemoryRecoveryTaskRepository();
	const retentionPolicies =
		deps.retentionPolicies ?? createInMemoryRetentionPolicyRepository();
	const exportJobs =
		deps.exportJobs ?? createInMemoryExportJobRepository();
	const deletionRequests =
		deps.deletionRequests ?? createInMemoryDeletionRequestRepository();
	const unitOfWork: OperationsUnitOfWork = {
		async runInTransaction(work) {
			const context: OperationsTransactionContext = {
				commandJournal: deps.commandJournal,
				healthChecks: deps.healthChecks,
				incidents,
				recoveryTasks,
				retentionPolicies,
				exportJobs,
				deletionRequests,
				async publishEvents(envelopes) {
					published.push(...envelopes);
				},
			};
			return work(context);
		},
	};
	return { unitOfWork, published };
}

// ANX-313 S3 — in-memory repositories for retention/export/deletion
export function createInMemoryRetentionPolicyRepository() {
	const rows = new Map<string, RetentionPolicyRecord>();
	return {
		async findById(id) {
			return rows.get(id) ?? null;
		},
		async findByOrganizationAndScope(organizationId, scope) {
			for (const row of rows.values()) {
				if (row.organizationId === organizationId && row.scope === scope && row.status === "ACTIVE") {
					return row;
				}
			}
			return null;
		},
		async save(record) {
			rows.set(record.id, record);
			return record;
		},
		async updateStatus(id, status) {
			const row = rows.get(id);
			if (row) rows.set(id, { ...row, status });
		},
	};
}
export function createInMemoryExportJobRepository() {
	const rows = new Map<string, ExportJobRecord>();
	return {
		async findById(id) {
			return rows.get(id) ?? null;
		},
		async save(record) {
			rows.set(record.id, record);
			return record;
		},
		async updateStatus(id, status, manifestJson, completedAt) {
			const row = rows.get(id);
			if (row) rows.set(id, { ...row, status, manifestJson, completedAt });
		},
	};
}
export function createInMemoryDeletionRequestRepository() {
	const rows = new Map<string, DeletionRequestRecord>();
	return {
		async findById(id) {
			return rows.get(id) ?? null;
		},
		async findByOrganizationAndSubject(organizationId, subjectId) {
			for (const row of rows.values()) {
				if (row.organizationId === organizationId && row.subjectId === subjectId) {
					return row;
				}
			}
			return null;
		},
		async save(record) {
			rows.set(record.id, record);
			return record;
		},
		async updateStatus(id, status, approvedBy, executedAt) {
			const row = rows.get(id);
			if (row) rows.set(id, { ...row, status, approvedBy, executedAt });
		},
	};
}
