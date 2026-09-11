import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgMetricTimeseriesRepository,
	deriveLedgerPnlMetrics,
	derivePositionExposureMetrics,
	listMetricPoints,
	listPnlSeriesPoints,
	rebuildMetricTimeseries,
} from "@anxionos/performance";
import {
	assertDerivedMetricsMatch,
	metricsToMap,
} from "../convergence-support";
import {
	createPerformanceLedgerConsumer,
	createPerformancePositionConsumer,
	PERFORMANCE_TEST_ORG_ID,
	sampleTradeFillLines,
	shouldRunPgIntegrationTests,
	withPerformancePgHarness,
} from "../test-support";

describe("ANX-154 S4 Timescale convergence oracle", () => {
	test("hypertables exist after ensurePerformanceSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool }) => {
			const hypertables = await pool.query<{ hypertable_name: string }>(
				`SELECT hypertable_name
				 FROM timescaledb_information.hypertables
				 WHERE hypertable_name IN ('performance_metric_points', 'performance_pnl_series')
				 ORDER BY hypertable_name`,
			);
			expect(hypertables.rows.map((row) => row.hypertable_name)).toEqual([
				"performance_metric_points",
				"performance_pnl_series",
			]);
		});
	});

	test("live mirror: Timescale points match PG authoritative metric_series", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const portfolioId = `pf_prt_${randomUUID()}`;
				const positionId = `pf_pos_${randomUUID()}`;
				const journalEntryId = `acc_je_${randomUUID()}`;
				const lines = sampleTradeFillLines();
				const expectedLedgerMetrics = deriveLedgerPnlMetrics(lines);

				const ledgerConsumer = createPerformanceLedgerConsumer({
					unitOfWork,
					commandJournal,
				});
				const ledgerResult = await ledgerConsumer.handle({
					entryId: journalEntryId,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					valueDate: "2026-09-11",
					linesSummary: lines,
				});

				const positionConsumer = createPerformancePositionConsumer({
					unitOfWork,
					commandJournal,
				});
				const positionResult = await positionConsumer.handle({
					portfolioId,
					positionId,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					instrumentId: "BTC-USD",
					positionSide: "LONG",
					book: "primary",
					quantity: "1.5",
					revision: 1,
					fillId: `ex_fill_${randomUUID()}`,
					side: "BUY",
				});

				const expectedPositionMetrics = derivePositionExposureMetrics({
					quantity: "1.5",
					positionSide: "LONG",
					provisionalCash: undefined,
				});

				const pgOutcomeMetrics = await pool.query<{
					metric_name: string;
					metric_value: string;
				}>(
					`SELECT metric_name, metric_value
				 FROM performance_metric_series
				 WHERE outcome_snapshot_id = $1
				 ORDER BY metric_name`,
					[ledgerResult.outcomeSnapshotId],
				);
				assertDerivedMetricsMatch(
					metricsToMap(pgOutcomeMetrics.rows),
					expectedLedgerMetrics,
				);

				const tsOutcomeMetrics = await pool.query<{
					metric_name: string;
					metric_value: string;
				}>(
					`SELECT metric_name, metric_value
				 FROM performance_metric_points
				 WHERE outcome_snapshot_id = $1
				 ORDER BY metric_name`,
					[ledgerResult.outcomeSnapshotId],
				);
				assertDerivedMetricsMatch(
					metricsToMap(tsOutcomeMetrics.rows),
					expectedLedgerMetrics,
				);

				const pgPositionMetrics = await pool.query<{
					metric_name: string;
					metric_value: string;
				}>(
					`SELECT metric_name, metric_value
				 FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1
				 ORDER BY metric_name`,
					[positionResult.positionExposureSnapshotId],
				);
				assertDerivedMetricsMatch(
					metricsToMap(pgPositionMetrics.rows),
					expectedPositionMetrics,
				);

				const tsPositionMetrics = await pool.query<{
					metric_name: string;
					metric_value: string;
				}>(
					`SELECT metric_name, metric_value
				 FROM performance_metric_points
				 WHERE position_exposure_snapshot_id = $1
				 ORDER BY metric_name`,
					[positionResult.positionExposureSnapshotId],
				);
				assertDerivedMetricsMatch(
					metricsToMap(tsPositionMetrics.rows),
					expectedPositionMetrics,
				);

				const metricTimeseries = createPgMetricTimeseriesRepository(pool);
				const pnlSeries = await listPnlSeriesPoints(
					{ metricTimeseries },
					PERFORMANCE_TEST_ORG_ID,
					{ journalEntryId },
				);
				expect(pnlSeries.pnlSeriesPoints).toHaveLength(3);
				assertDerivedMetricsMatch(
					metricsToMap(
						pnlSeries.pnlSeriesPoints.map((point) => ({
							metric_name: point.metricName,
							metric_value: point.metricValue,
						})),
					),
					expectedLedgerMetrics,
				);

				const metricPoints = await listMetricPoints(
					{ metricTimeseries },
					PERFORMANCE_TEST_ORG_ID,
					{ limit: 20 },
				);
				expect(metricPoints.metricPoints.length).toBeGreaterThanOrEqual(6);
			},
		);
	});

	test("rebuildFromMetricSeries is idempotent and restores Timescale from PG", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const journalEntryId = `acc_je_${randomUUID()}`;
				const lines = sampleTradeFillLines();
				const ledgerConsumer = createPerformanceLedgerConsumer({
					unitOfWork,
					commandJournal,
				});
				await ledgerConsumer.handle({
					entryId: journalEntryId,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					valueDate: "2026-09-11",
					linesSummary: lines,
				});

				await pool.query(
					"TRUNCATE performance_pnl_series, performance_metric_points",
				);

				const metricTimeseries = createPgMetricTimeseriesRepository(pool);
				const firstRebuild = await rebuildMetricTimeseries(
					{ metricTimeseries },
					{ organizationId: PERFORMANCE_TEST_ORG_ID },
				);
				expect(firstRebuild.metricPointsInserted).toBe(3);
				expect(firstRebuild.pnlPointsInserted).toBe(3);
				expect(firstRebuild.idempotentReplay).toBe(false);

				const secondRebuild = await rebuildMetricTimeseries(
					{ metricTimeseries },
					{ organizationId: PERFORMANCE_TEST_ORG_ID },
				);
				expect(secondRebuild.metricPointsInserted).toBe(0);
				expect(secondRebuild.pnlPointsInserted).toBe(0);
				expect(secondRebuild.idempotentReplay).toBe(true);

				const pgCount = await pool.query<{ count: string }>(
					`SELECT COUNT(*)::text AS count
				 FROM performance_metric_series
				 WHERE organization_id = $1`,
					[PERFORMANCE_TEST_ORG_ID],
				);
				const tsCount = await pool.query<{ count: string }>(
					`SELECT COUNT(*)::text AS count
				 FROM performance_metric_points
				 WHERE organization_id = $1`,
					[PERFORMANCE_TEST_ORG_ID],
				);
				expect(tsCount.rows[0]?.count).toBe(pgCount.rows[0]?.count);
			},
		);
	});
});
