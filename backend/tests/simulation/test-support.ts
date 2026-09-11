import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureSimulationSchema } from "@anxionos/simulation";
import { SimulationRunRevisionConflictError } from "../../modules/simulation/src/domain/errors/simulation-run-errors";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../../modules/simulation/src/domain/ports/command-journal";
import type {
	SimulationManifestRecord,
	SimulationManifestRepository,
	SimulationRunRecord,
	SimulationRunRepository,
	SimulationSnapshotRecord,
	SimulationSnapshotRepository,
	SimulationTransactionContext,
	SimulationUnitOfWork,
} from "../../modules/simulation/src/domain/ports/simulation-unit-of-work";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const SIMULATION_TRUNCATE_SQL =
	"TRUNCATE simulation_snapshots, simulation_runs, simulation_manifests, simulation_command_journal, domain_journal, outbox, inbox CASCADE";

export async function withSimulationPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureSimulationSchema(pool);
		await pool.query(SIMULATION_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

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

export function createInMemorySimulationManifestRepository(
	seed: SimulationManifestRecord[] = [],
): SimulationManifestRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
		async findByOrganizationAndId(organizationId, id) {
			const record = records.get(id);
			if (!record || record.organizationId !== organizationId) {
				return null;
			}
			return record;
		},
	};
}

export function createInMemorySimulationRunRepository(
	seed: SimulationRunRecord[] = [],
): SimulationRunRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
		async update(record) {
			const existing = records.get(record.id);
			const expectedRevision = record.revision - 1;
			if (
				!existing ||
				existing.organizationId !== record.organizationId ||
				existing.revision !== expectedRevision
			) {
				throw new SimulationRunRevisionConflictError();
			}
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
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
		async findByOrganizationAndBacktestRequestId(
			organizationId,
			backtestRequestId,
		) {
			for (const record of records.values()) {
				if (
					record.organizationId === organizationId &&
					record.backtestRequestId === backtestRequestId
				) {
					return record;
				}
			}
			return null;
		},
		async listByOrganizationId(organizationId, filter = {}) {
			const limit = filter.limit ?? 50;
			let rows = [...records.values()].filter(
				(record) => record.organizationId === organizationId,
			);
			if (filter.status) {
				rows = rows.filter((record) => record.status === filter.status);
			}
			if (filter.backtestRequestId) {
				rows = rows.filter(
					(record) => record.backtestRequestId === filter.backtestRequestId,
				);
			}
			if (filter.strategyId) {
				rows = rows.filter((record) => record.strategyId === filter.strategyId);
			}
			rows.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
			return rows.slice(0, limit);
		},
	};
}

export function createInMemorySimulationSnapshotRepository(
	seed: SimulationSnapshotRecord[] = [],
): SimulationSnapshotRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
		async findByOrganizationAndRunId(organizationId, simulationRunId) {
			for (const record of records.values()) {
				if (
					record.organizationId === organizationId &&
					record.simulationRunId === simulationRunId
				) {
					return record;
				}
			}
			return null;
		},
	};
}

export function createRecordingSimulationUnitOfWork(deps: {
	commandJournal: CommandJournalRepository;
	manifests?: SimulationManifestRepository;
	runs?: SimulationRunRepository;
	snapshots?: SimulationSnapshotRepository;
}): { unitOfWork: SimulationUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	const manifests =
		deps.manifests ?? createInMemorySimulationManifestRepository();
	const runs = deps.runs ?? createInMemorySimulationRunRepository();
	const snapshots =
		deps.snapshots ?? createInMemorySimulationSnapshotRepository();
	const unitOfWork: SimulationUnitOfWork = {
		async runInTransaction(work) {
			const context: SimulationTransactionContext = {
				commandJournal: deps.commandJournal,
				manifests,
				runs,
				snapshots,
				async publishEvents(envelopes) {
					published.push(...envelopes);
				},
			};
			return work(context);
		},
	};
	return { unitOfWork, published };
}
