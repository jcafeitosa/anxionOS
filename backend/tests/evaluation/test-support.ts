import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createEvaluationUnitOfWork,
	createPgCommandJournalRepository,
	ensureEvaluationSchema,
} from "@anxionos/evaluation";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import type {
	CertificationRepository,
	CertificationRow,
} from "../../modules/evaluation/src/domain/ports/certification";
import type {
	CertificationSubjectQueryPort,
	StrategyVersionCertificationSubject,
} from "../../modules/evaluation/src/domain/ports/certification-subject";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../../modules/evaluation/src/domain/ports/command-journal";
import type {
	EvaluationRecordRepository,
	EvaluationRecordRow,
	EvaluationScoreRepository,
	EvaluationScoreRow,
	EvaluationTransactionContext,
	EvaluationUnitOfWork,
} from "../../modules/evaluation/src/domain/ports/evaluation-unit-of-work";
import type { ScoringPolicyQueryPort } from "../../modules/evaluation/src/domain/ports/scoring-policy";

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalEntry[] = [],
): CommandJournalRepository {
	const byCommandId = new Map(
		seed.map((record) => [record.commandId, { ...record }]),
	);
	const byOutcomeSnapshotId = new Map(
		seed
			.filter((record) => record.outcomeSnapshotId)
			.map((record) => [record.outcomeSnapshotId!, { ...record }]),
	);
	return {
		async findByCommandId(commandId) {
			return byCommandId.get(commandId) ?? null;
		},
		async findByOutcomeSnapshotId(outcomeSnapshotId) {
			return byOutcomeSnapshotId.get(outcomeSnapshotId) ?? null;
		},
		async save(entry) {
			byCommandId.set(entry.commandId, { ...entry });
			if (entry.outcomeSnapshotId) {
				byOutcomeSnapshotId.set(entry.outcomeSnapshotId, { ...entry });
			}
		},
	};
}

export function createInMemoryEvaluationRecordRepository(
	seed: EvaluationRecordRow[] = [],
): EvaluationRecordRepository {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	const byOutcome = new Map(
		seed.map((record) => [record.outcomeSnapshotId, { ...record }]),
	);
	return {
		async findById(id) {
			return records.get(id) ?? null;
		},
		async findByOutcomeSnapshotId(outcomeSnapshotId) {
			return byOutcome.get(outcomeSnapshotId) ?? null;
		},
		async save(record) {
			const stored = { ...record };
			records.set(record.id, stored);
			byOutcome.set(record.outcomeSnapshotId, stored);
			return stored;
		},
	};
}

export function createInMemoryEvaluationScoreRepository(
	seed: EvaluationScoreRow[] = [],
): EvaluationScoreRepository {
	const byRecordId = new Map(
		seed.map((record) => [record.evaluationRecordId, { ...record }]),
	);
	return {
		async findByEvaluationRecordId(evaluationRecordId) {
			return byRecordId.get(evaluationRecordId) ?? null;
		},
		async save(record) {
			const stored = { ...record };
			byRecordId.set(record.evaluationRecordId, stored);
			return stored;
		},
	};
}

export function createInMemoryCertificationRepository(
	seed: CertificationRow[] = [],
): CertificationRepository {
	const byId = new Map(seed.map((row) => [row.id, { ...row }]));
	return {
		async findById(id) {
			return byId.get(id) ?? null;
		},
		async findBySubject(input) {
			for (const row of byId.values()) {
				if (
					row.organizationId === input.organizationId &&
					row.subjectType === input.subjectType &&
					row.strategyId === input.strategyId &&
					row.strategyVersionId === input.strategyVersionId &&
					(row.policyHash ?? "") === (input.policyHash ?? "") &&
					row.status === "issued"
				) {
					return { ...row };
				}
			}
			return null;
		},
		async save(row) {
			const stored = { ...row };
			byId.set(row.id, stored);
			return stored;
		},
	};
}

export function createStubCertificationSubjectQuery(
	subjects: StrategyVersionCertificationSubject[] = [],
): CertificationSubjectQueryPort {
	const byKey = new Map(
		subjects.map((subject) => [
			`${subject.organizationId}:${subject.strategyId}:${subject.strategyVersionId}`,
			subject,
		]),
	);
	return {
		async findStrategyVersionSubject(input) {
			return (
				byKey.get(
					`${input.organizationId}:${input.strategyId}:${input.strategyVersionId}`,
				) ?? null
			);
		},
	};
}

export function createStubScoringPolicyQuery(
	publishedHashes: string[] = [],
): ScoringPolicyQueryPort {
	const published = new Set(publishedHashes);
	return {
		async isPublishedPolicyHash(input) {
			return published.has(input.policyHash);
		},
	};
}

export function createRecordingEvaluationUnitOfWork(deps: {
	commandJournal: CommandJournalRepository;
	evaluationRecords?: EvaluationRecordRepository;
	evaluationScores?: EvaluationScoreRepository;
	certifications?: CertificationRepository;
}): {
	unitOfWork: EvaluationUnitOfWork;
	published: DomainEventEnvelope[];
	evaluationRecords: EvaluationRecordRepository;
	evaluationScores: EvaluationScoreRepository;
	certifications: CertificationRepository;
} {
	const published: DomainEventEnvelope[] = [];
	const evaluationRecords =
		deps.evaluationRecords ?? createInMemoryEvaluationRecordRepository();
	const evaluationScores =
		deps.evaluationScores ?? createInMemoryEvaluationScoreRepository();
	const certifications =
		deps.certifications ?? createInMemoryCertificationRepository();
	const unitOfWork: EvaluationUnitOfWork = {
		async runInTransaction(work) {
			const context: EvaluationTransactionContext = {
				commandJournal: deps.commandJournal,
				evaluationRecords,
				evaluationScores,
				certifications,
				async publishEvents(envelopes) {
					published.push(...envelopes);
				},
			};
			return work(context);
		},
	};
	return {
		unitOfWork,
		published,
		evaluationRecords,
		evaluationScores,
		certifications,
	};
}

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const EVALUATION_TRUNCATE_SQL =
	"TRUNCATE evaluation_certifications, evaluation_scores, evaluation_records, evaluation_command_journal, domain_journal, outbox CASCADE";

export const EVALUATION_TEST_ORG_ID = "00000000-0000-4000-8000-000000000009";

export async function withEvaluationPgHarness<T>(
	work: (ctx: {
		pool: ReturnType<typeof createPgPool>;
		unitOfWork: ReturnType<typeof createEvaluationUnitOfWork>;
		commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	}) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureEvaluationSchema(pool);
		await pool.query(EVALUATION_TRUNCATE_SQL);
		const unitOfWork = createEvaluationUnitOfWork(pool);
		const commandJournal = createPgCommandJournalRepository(pool);
		return await work({ pool, unitOfWork, commandJournal });
	} finally {
		await pool.end();
	}
}
