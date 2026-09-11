import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { OFFICIAL_LEDGER_PNL_METRICS } from "@anxionos/performance";
import {
	createPerformanceLedgerConsumer,
	createPerformancePositionConsumer,
	expectDecimalEqual,
	PERFORMANCE_TEST_ORG_ID,
	recordSampleOutcomeSnapshot,
	recordSamplePositionExposureSnapshot,
	samplePositionUpdatedEvent,
	shouldRunPgIntegrationTests,
	withPerformancePgHarness,
} from "../test-support";
import { OFFICIAL_POSITION_EXPOSURE_METRICS } from "@anxionos/performance";

describe("performance lifecycle commands (ANX-154 S2)", () => {
	test("G3-PERF-S2-01: recordOutcomeSnapshot persists outcome and derived P&L metrics", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const result = await recordSampleOutcomeSnapshot({
				unitOfWork,
				commandJournal,
			});
			expect(result.outcomeSnapshotId).toMatch(/^perf_out_/);
			expect(result.idempotentReplay).toBeUndefined();

			const metrics = await pool.query<{
				metric_name: string;
				metric_value: string;
			}>(
				`SELECT metric_name, metric_value
				 FROM performance_metric_series
				 WHERE outcome_snapshot_id = $1
				 ORDER BY metric_name`,
				[result.outcomeSnapshotId],
			);
			expect(metrics.rowCount).toBe(3);
			const byName = new Map(
				metrics.rows.map((row) => [row.metric_name, row.metric_value]),
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL),
				"1.25",
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL),
				"250",
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA),
				"248.75",
			);
		});
	});

	test("G3-PERF-S2-01 replay: duplicate commandId returns idempotent replay without duplicate metrics", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const commandId = randomUUID();
			const journalEntryId = `acc_je_${randomUUID()}`;
			const first = await recordSampleOutcomeSnapshot(
				{ unitOfWork, commandJournal },
				{ commandId, journalEntryId },
			);
			const second = await recordSampleOutcomeSnapshot(
				{ unitOfWork, commandJournal },
				{ commandId, journalEntryId },
			);
			expect(second.idempotentReplay).toBe(true);
			expect(second.outcomeSnapshotId).toBe(first.outcomeSnapshotId);

			const metrics = await pool.query(
				`SELECT COUNT(*)::int AS count
				 FROM performance_metric_series
				 WHERE outcome_snapshot_id = $1`,
				[first.outcomeSnapshotId],
			);
			expect(metrics.rows[0]?.count).toBe(3);
		});
	});

	test("G3-PERF-S2-04: cross-tenant rejects mismatched organization on existing journal entry", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ unitOfWork, commandJournal }) => {
			const journalEntryId = `acc_je_${randomUUID()}`;
			await recordSampleOutcomeSnapshot(
				{ unitOfWork, commandJournal },
				{ journalEntryId },
			);

			const { recordOutcomeSnapshot } = await import("@anxionos/performance");
			const { sampleTradeFillLines } = await import("../test-support");
			await expect(
				recordOutcomeSnapshot(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: "00000000-0000-4000-8000-000000000099",
						journalEntryId,
						valueDate: "2026-09-11",
						linesSummary: sampleTradeFillLines(),
					},
				),
			).rejects.toThrow(/PERF_CROSS_TENANT|organization mismatch/i);
		});
	});

	test("G3-PERF-S2-02: position updated persists exposure snapshot and derived metrics", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const result = await recordSamplePositionExposureSnapshot({
				unitOfWork,
				commandJournal,
			});
			expect(result.positionExposureSnapshotId).toMatch(/^perf_pes_/);
			expect(result.idempotentReplay).toBeUndefined();

			const metrics = await pool.query<{
				metric_name: string;
				metric_value: string;
			}>(
				`SELECT metric_name, metric_value
				 FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1
				 ORDER BY metric_name`,
				[result.positionExposureSnapshotId],
			);
			expect(metrics.rowCount).toBe(3);
			const byName = new Map(
				metrics.rows.map((row) => [row.metric_name, row.metric_value]),
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY),
				"1.5",
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY),
				"1.5",
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.PROVISIONAL_CASH),
				"0",
			);
		});
	});

	test("G3-PERF-S2-02 replay: duplicate position revision is idempotent", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const positionId = `pf_pos_${randomUUID()}`;
			const first = await recordSamplePositionExposureSnapshot(
				{ unitOfWork, commandJournal },
				{ positionId, revision: 2 },
			);
			const second = await recordSamplePositionExposureSnapshot(
				{ unitOfWork, commandJournal },
				{ positionId, revision: 2 },
			);
			expect(second.idempotentReplay).toBe(true);
			expect(second.positionExposureSnapshotId).toBe(
				first.positionExposureSnapshotId,
			);

			const metrics = await pool.query(
				`SELECT COUNT(*)::int AS count
				 FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1`,
				[first.positionExposureSnapshotId],
			);
			expect(metrics.rows[0]?.count).toBe(3);
		});
	});

	test("G3-PERF-S2-03: stale position revision is rejected", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ unitOfWork, commandJournal }) => {
			const positionId = `pf_pos_${randomUUID()}`;
			await recordSamplePositionExposureSnapshot(
				{ unitOfWork, commandJournal },
				{ positionId, revision: 5 },
			);

			const { recordPositionExposureSnapshot } = await import("@anxionos/performance");
			const stale = samplePositionUpdatedEvent({
				positionId,
				revision: 3,
			});
			await expect(
				recordPositionExposureSnapshot(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: stale.organizationId,
						portfolioId: stale.portfolioId,
						positionId: stale.positionId,
						revision: stale.revision,
						instrumentId: stale.instrumentId,
						positionSide: stale.positionSide,
						book: stale.book,
						quantity: stale.quantity,
						fillId: stale.fillId,
						side: stale.side,
						provisionalCash: stale.provisionalCash,
					},
				),
			).rejects.toThrow(/PERF_STALE_POSITION|stale position revision/i);
		});
	});

	test("position-updated consumer maps portfolios bridge to exposure snapshot", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const consumer = createPerformancePositionConsumer({
				unitOfWork,
				commandJournal,
			});
			const position = samplePositionUpdatedEvent({
				revision: 1,
				quantity: "3.25",
				positionSide: "SHORT",
			});
			const result = await consumer.handle(position);
			expect(result.positionExposureSnapshotId).toMatch(/^perf_pes_/);

			const snapshot = await pool.query(
				`SELECT id FROM performance_position_exposure_snapshots
				 WHERE position_id = $1 AND revision = $2`,
				[position.positionId, position.revision],
			);
			expect(snapshot.rowCount).toBe(1);

			const metrics = await pool.query<{ metric_name: string; metric_value: string }>(
				`SELECT metric_name, metric_value
				 FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1`,
				[result.positionExposureSnapshotId],
			);
			const byName = new Map(
				metrics.rows.map((row) => [row.metric_name, row.metric_value]),
			);
			expectDecimalEqual(
				byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY),
				"-3.25",
			);
		});
	});

	test("ledger-posted consumer maps accounting bridge to outcome snapshot", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool, unitOfWork, commandJournal }) => {
			const consumer = createPerformanceLedgerConsumer({
				unitOfWork,
				commandJournal,
			});
			const journalEntryId = `acc_je_${randomUUID()}`;
			const lines = (await import("../test-support")).sampleTradeFillLines();
			const result = await consumer.handle({
				entryId: journalEntryId,
				organizationId: PERFORMANCE_TEST_ORG_ID,
				valueDate: "2026-09-11",
				linesSummary: lines,
			});
			expect(result.outcomeSnapshotId).toMatch(/^perf_out_/);

			const snapshot = await pool.query(
				`SELECT id FROM performance_outcome_snapshots WHERE journal_entry_id = $1`,
				[journalEntryId],
			);
			expect(snapshot.rowCount).toBe(1);
		});
	});
});
