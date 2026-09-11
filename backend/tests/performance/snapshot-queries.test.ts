import { describe, expect, test } from "bun:test";
import {
	getOutcomeSnapshot,
	getPositionExposureSnapshot,
	listOutcomeSnapshotMetrics,
	listOutcomeSnapshots,
	listPositionExposureSnapshotMetrics,
	listPositionExposureSnapshots,
	OFFICIAL_LEDGER_PNL_METRICS,
	OFFICIAL_POSITION_EXPOSURE_METRICS,
} from "@anxionos/performance";
import {
	createInMemoryMetricSeriesRepository,
	createInMemoryOutcomeSnapshotRepository,
	createInMemoryPositionExposureSnapshotRepository,
	PERFORMANCE_TEST_ORG_ID,
} from "./test-support";

const otherOrganizationId = "00000000-0000-4000-8000-000000000099";

const sampleOutcomeSnapshot = {
	id: "perf_out_11111111-1111-4111-8111-111111111111",
	organizationId: PERFORMANCE_TEST_ORG_ID,
	journalEntryId: "acc_je_11111111-1111-4111-8111-111111111111",
	valueDate: "2026-09-11",
	linesSummary: [
		{
			accountCode: "trading.cash",
			debit: "100",
			credit: "0",
			asset: "USD",
			amount: "100",
		},
	],
	recordedAt: "2026-09-11T12:00:00.000Z",
};

const samplePositionExposureSnapshot = {
	id: "perf_pes_22222222-2222-4222-8222-222222222222",
	organizationId: PERFORMANCE_TEST_ORG_ID,
	portfolioId: "pf_prt_33333333-3333-4333-8333-333333333333",
	positionId: "pf_pos_44444444-4444-4444-8444-444444444444",
	revision: 2,
	instrumentId: "BTC-USD",
	positionSide: "LONG",
	book: "primary",
	quantity: "1.5",
	fillId: "ex_fill_55555555-5555-4555-8555-555555555555",
	side: "BUY",
	provisionalCash: false,
	observedAt: "2026-09-11T13:00:00.000Z",
};

const sampleOutcomeMetrics = [
	{
		id: "perf_mtr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		organizationId: PERFORMANCE_TEST_ORG_ID,
		outcomeSnapshotId: sampleOutcomeSnapshot.id,
		metricName: OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL,
		metricValue: "1.25",
		observedAt: "2026-09-11T12:00:00.000Z",
	},
	{
		id: "perf_mtr_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		organizationId: PERFORMANCE_TEST_ORG_ID,
		outcomeSnapshotId: sampleOutcomeSnapshot.id,
		metricName: OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA,
		metricValue: "248.75",
		observedAt: "2026-09-11T12:00:00.000Z",
	},
];

const samplePositionMetrics = [
	{
		id: "perf_mtr_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
		organizationId: PERFORMANCE_TEST_ORG_ID,
		positionExposureSnapshotId: samplePositionExposureSnapshot.id,
		metricName: OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY,
		metricValue: "1.5",
		observedAt: "2026-09-11T13:00:00.000Z",
	},
];

describe("performance snapshot queries (ANX-154 HTTP read)", () => {
	test("getOutcomeSnapshot returns agency-scoped snapshot", async () => {
		const outcomeSnapshots = createInMemoryOutcomeSnapshotRepository([
			sampleOutcomeSnapshot,
		]);
		const snapshot = await getOutcomeSnapshot(
			{ outcomeSnapshots },
			PERFORMANCE_TEST_ORG_ID,
			sampleOutcomeSnapshot.id,
		);
		expect(snapshot.outcomeSnapshotId).toBe(sampleOutcomeSnapshot.id);
		expect(snapshot.journalEntryId).toBe(sampleOutcomeSnapshot.journalEntryId);
	});

	test("getOutcomeSnapshot rejects cross-tenant lookup", async () => {
		const outcomeSnapshots = createInMemoryOutcomeSnapshotRepository([
			sampleOutcomeSnapshot,
		]);
		await expect(
			getOutcomeSnapshot(
				{ outcomeSnapshots },
				otherOrganizationId,
				sampleOutcomeSnapshot.id,
			),
		).rejects.toMatchObject({ code: "PERF_SNAPSHOT_NOT_FOUND" });
	});

	test("listOutcomeSnapshots filters by journalEntryId", async () => {
		const other = {
			...sampleOutcomeSnapshot,
			id: "perf_out_99999999-9999-4999-8999-999999999999",
			journalEntryId: "acc_je_other",
			recordedAt: "2026-09-10T12:00:00.000Z",
		};
		const outcomeSnapshots = createInMemoryOutcomeSnapshotRepository([
			other,
			sampleOutcomeSnapshot,
		]);
		const result = await listOutcomeSnapshots(
			{ outcomeSnapshots },
			PERFORMANCE_TEST_ORG_ID,
			{ journalEntryId: sampleOutcomeSnapshot.journalEntryId },
		);
		expect(result.outcomeSnapshots).toHaveLength(1);
		expect(result.outcomeSnapshots[0]?.outcomeSnapshotId).toBe(
			sampleOutcomeSnapshot.id,
		);
	});

	test("listOutcomeSnapshotMetrics returns derived metrics for snapshot", async () => {
		const outcomeSnapshots = createInMemoryOutcomeSnapshotRepository([
			sampleOutcomeSnapshot,
		]);
		const metricSeries =
			createInMemoryMetricSeriesRepository(sampleOutcomeMetrics);
		const result = await listOutcomeSnapshotMetrics(
			{ outcomeSnapshots, metricSeries },
			PERFORMANCE_TEST_ORG_ID,
			sampleOutcomeSnapshot.id,
		);
		expect(result.metrics).toHaveLength(2);
		expect(result.metrics.map((metric) => metric.metricName)).toEqual([
			OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA,
			OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL,
		]);
	});

	test("getPositionExposureSnapshot returns agency-scoped snapshot", async () => {
		const positionExposureSnapshots =
			createInMemoryPositionExposureSnapshotRepository([
				samplePositionExposureSnapshot,
			]);
		const snapshot = await getPositionExposureSnapshot(
			{ positionExposureSnapshots },
			PERFORMANCE_TEST_ORG_ID,
			samplePositionExposureSnapshot.id,
		);
		expect(snapshot.positionExposureSnapshotId).toBe(
			samplePositionExposureSnapshot.id,
		);
		expect(snapshot.revision).toBe(2);
	});

	test("listPositionExposureSnapshots filters by positionId", async () => {
		const other = {
			...samplePositionExposureSnapshot,
			id: "perf_pes_88888888-8888-4888-8888-888888888888",
			positionId: "pf_pos_other",
		};
		const positionExposureSnapshots =
			createInMemoryPositionExposureSnapshotRepository([
				other,
				samplePositionExposureSnapshot,
			]);
		const result = await listPositionExposureSnapshots(
			{ positionExposureSnapshots },
			PERFORMANCE_TEST_ORG_ID,
			{ positionId: samplePositionExposureSnapshot.positionId },
		);
		expect(result.positionExposureSnapshots).toHaveLength(1);
		expect(result.positionExposureSnapshots[0]?.positionId).toBe(
			samplePositionExposureSnapshot.positionId,
		);
	});

	test("listPositionExposureSnapshotMetrics returns derived metrics", async () => {
		const positionExposureSnapshots =
			createInMemoryPositionExposureSnapshotRepository([
				samplePositionExposureSnapshot,
			]);
		const metricSeries = createInMemoryMetricSeriesRepository(
			samplePositionMetrics,
		);
		const result = await listPositionExposureSnapshotMetrics(
			{ positionExposureSnapshots, metricSeries },
			PERFORMANCE_TEST_ORG_ID,
			samplePositionExposureSnapshot.id,
		);
		expect(result.metrics).toHaveLength(1);
		expect(result.metrics[0]?.metricName).toBe(
			OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY,
		);
	});
});
