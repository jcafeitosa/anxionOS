import { randomUUID } from "node:crypto";
import { expect } from "bun:test";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createLedgerPostedConsumer,
	createPerformanceUnitOfWork,
	createPgCommandJournalRepository,
	createPositionUpdatedConsumer,
	recordOutcomeSnapshot,
	recordPositionExposureSnapshot,
} from "@anxionos/performance";
import { buildTradeFillLines } from "../../modules/accounting/src/application/commands/post-trade-fill";
import { normalizeDecimalAmount } from "../../modules/performance/src/domain/decimal-amount";
import { ensurePerformanceSchema } from "../../modules/performance/src/infrastructure/migrate";
import {
	createPgMetricSeriesRepository,
	createPgOutcomeSnapshotRepository,
	createPgPositionExposureSnapshotRepository,
} from "../../modules/performance/src/infrastructure/persistence/repositories";
import type {
	MetricSeriesRecord,
	OutcomeSnapshotRecord,
	PositionExposureSnapshotRecord,
} from "../../modules/performance/src/domain/ports/performance-unit-of-work";

export function expectDecimalEqual(
	actual: string | undefined,
	expected: string,
): void {
	expect(normalizeDecimalAmount(actual ?? "0")).toBe(expected);
}

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const PERFORMANCE_TRUNCATE_SQL =
	"TRUNCATE performance_pnl_series, performance_metric_points, performance_metric_series, performance_position_exposure_snapshots, performance_outcome_snapshots, performance_command_journal, domain_journal, outbox CASCADE";

export const PERFORMANCE_TEST_ORG_ID = "00000000-0000-4000-8000-000000000008";

export async function withPerformancePgHarness<T>(
	work: (ctx: {
		pool: ReturnType<typeof createPgPool>;
		unitOfWork: ReturnType<typeof createPerformanceUnitOfWork>;
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
		await ensurePerformanceSchema(pool);
		await pool.query(PERFORMANCE_TRUNCATE_SQL);
		const unitOfWork = createPerformanceUnitOfWork(pool);
		const commandJournal = createPgCommandJournalRepository(pool);
		return await work({ pool, unitOfWork, commandJournal });
	} finally {
		await pool.end();
	}
}

export function sampleTradeFillLines() {
	return buildTradeFillLines({
		side: "BUY",
		notionalAmount: "250.00",
		asset: "USD",
		feeAmount: "1.25",
		feeAsset: "USD",
	});
}

export async function recordSampleOutcomeSnapshot(
	deps: {
		unitOfWork: ReturnType<typeof createPerformanceUnitOfWork>;
		commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	},
	overrides?: { commandId?: string; journalEntryId?: string },
) {
	const journalEntryId = overrides?.journalEntryId ?? `acc_je_${randomUUID()}`;
	return recordOutcomeSnapshot(deps, {
		commandId: overrides?.commandId ?? randomUUID(),
		organizationId: PERFORMANCE_TEST_ORG_ID,
		journalEntryId,
		valueDate: "2026-09-11",
		linesSummary: sampleTradeFillLines(),
	});
}

export function createPerformanceLedgerConsumer(
	deps: {
		unitOfWork: ReturnType<typeof createPerformanceUnitOfWork>;
		commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	},
) {
	return createLedgerPostedConsumer(deps);
}

export function createPerformancePositionConsumer(
	deps: {
		unitOfWork: ReturnType<typeof createPerformanceUnitOfWork>;
		commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	},
) {
	return createPositionUpdatedConsumer(deps);
}

export function samplePositionUpdatedEvent(overrides?: {
	portfolioId?: string;
	positionId?: string;
	revision?: number;
	quantity?: string;
	positionSide?: "LONG" | "SHORT" | "CASH";
	provisionalCash?: boolean;
}) {
	return {
		portfolioId: overrides?.portfolioId ?? `pf_prt_${randomUUID()}`,
		positionId: overrides?.positionId ?? `pf_pos_${randomUUID()}`,
		organizationId: PERFORMANCE_TEST_ORG_ID,
		instrumentId: "BTC-USD",
		positionSide: overrides?.positionSide ?? "LONG",
		book: "primary",
		quantity: overrides?.quantity ?? "1.5",
		revision: overrides?.revision ?? 1,
		fillId: `ex_fill_${randomUUID()}`,
		side: "BUY" as const,
		provisionalCash: overrides?.provisionalCash,
	};
}

export function createInMemoryOutcomeSnapshotRepository(
	seed: OutcomeSnapshotRecord[] = [],
) {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async findById(id: string) {
			return records.get(id) ?? null;
		},
		async findByOrganizationAndId(organizationId: string, id: string) {
			const record = records.get(id);
			if (!record || record.organizationId !== organizationId) {
				return null;
			}
			return record;
		},
		async findByJournalEntryId(journalEntryId: string) {
			return (
				[...records.values()].find(
					(record) => record.journalEntryId === journalEntryId,
				) ?? null
			);
		},
		async listByOrganizationId(
			organizationId: string,
			filter: { journalEntryId?: string; limit?: number } = {},
		) {
			const limit = filter.limit ?? 50;
			return [...records.values()]
				.filter((record) => record.organizationId === organizationId)
				.filter(
					(record) =>
						!filter.journalEntryId ||
						record.journalEntryId === filter.journalEntryId,
				)
				.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
				.slice(0, limit);
		},
		async save(record: OutcomeSnapshotRecord) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
	};
}

export function createInMemoryPositionExposureSnapshotRepository(
	seed: PositionExposureSnapshotRecord[] = [],
) {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async findByOrganizationAndId(organizationId: string, id: string) {
			const record = records.get(id);
			if (!record || record.organizationId !== organizationId) {
				return null;
			}
			return record;
		},
		async findByPositionRevision(positionId: string, revision: number) {
			return (
				[...records.values()].find(
					(record) =>
						record.positionId === positionId && record.revision === revision,
				) ?? null
			);
		},
		async findLatestRevision(positionId: string) {
			const matches = [...records.values()]
				.filter((record) => record.positionId === positionId)
				.sort((left, right) => right.revision - left.revision);
			return matches[0] ?? null;
		},
		async listByOrganizationId(
			organizationId: string,
			filter: {
				portfolioId?: string;
				positionId?: string;
				limit?: number;
			} = {},
		) {
			const limit = filter.limit ?? 50;
			return [...records.values()]
				.filter((record) => record.organizationId === organizationId)
				.filter(
					(record) =>
						!filter.portfolioId || record.portfolioId === filter.portfolioId,
				)
				.filter(
					(record) =>
						!filter.positionId || record.positionId === filter.positionId,
				)
				.sort((left, right) => {
					const observed = right.observedAt.localeCompare(left.observedAt);
					return observed !== 0 ? observed : right.revision - left.revision;
				})
				.slice(0, limit);
		},
		async save(record: PositionExposureSnapshotRecord) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
	};
}

export function createInMemoryMetricSeriesRepository(
	seed: MetricSeriesRecord[] = [],
) {
	const records = new Map(seed.map((record) => [record.id, { ...record }]));
	return {
		async findByOutcomeAndMetric(outcomeSnapshotId: string, metricName: string) {
			return (
				[...records.values()].find(
					(record) =>
						record.outcomeSnapshotId === outcomeSnapshotId &&
						record.metricName === metricName,
				) ?? null
			);
		},
		async findByPositionExposureAndMetric(
			positionExposureSnapshotId: string,
			metricName: string,
		) {
			return (
				[...records.values()].find(
					(record) =>
						record.positionExposureSnapshotId === positionExposureSnapshotId &&
						record.metricName === metricName,
				) ?? null
			);
		},
		async listByOutcomeSnapshotId(outcomeSnapshotId: string) {
			return [...records.values()]
				.filter((record) => record.outcomeSnapshotId === outcomeSnapshotId)
				.sort((left, right) => left.metricName.localeCompare(right.metricName));
		},
		async listByPositionExposureSnapshotId(positionExposureSnapshotId: string) {
			return [...records.values()]
				.filter(
					(record) =>
						record.positionExposureSnapshotId === positionExposureSnapshotId,
				)
				.sort((left, right) => left.metricName.localeCompare(right.metricName));
		},
		async save(record: MetricSeriesRecord) {
			const stored = { ...record };
			records.set(record.id, stored);
			return stored;
		},
	};
}

export function createPgPerformanceQueryDeps(
	pool: ReturnType<typeof createPgPool>,
) {
	return {
		outcomeSnapshots: createPgOutcomeSnapshotRepository(pool),
		positionExposureSnapshots: createPgPositionExposureSnapshotRepository(pool),
		metricSeries: createPgMetricSeriesRepository(pool),
	};
}

export async function recordSamplePositionExposureSnapshot(
	deps: {
		unitOfWork: ReturnType<typeof createPerformanceUnitOfWork>;
		commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	},
	overrides?: {
		commandId?: string;
		positionId?: string;
		revision?: number;
		quantity?: string;
		positionSide?: "LONG" | "SHORT" | "CASH";
		provisionalCash?: boolean;
	},
) {
	const position = samplePositionUpdatedEvent(overrides);
	return recordPositionExposureSnapshot(deps, {
		commandId: overrides?.commandId ?? randomUUID(),
		organizationId: position.organizationId,
		portfolioId: position.portfolioId,
		positionId: position.positionId,
		revision: position.revision,
		instrumentId: position.instrumentId,
		positionSide: position.positionSide,
		book: position.book,
		quantity: position.quantity,
		fillId: position.fillId,
		side: position.side,
		provisionalCash: position.provisionalCash,
	});
}
