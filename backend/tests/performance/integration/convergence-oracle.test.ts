import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	deriveLedgerPnlMetrics,
	derivePositionExposureMetrics,
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
	assertDerivedMetricsMatch,
	detectLedgerPositionDivergence,
	extractLedgerConvergenceFields,
	extractPositionConvergenceFields,
	metricsToMap,
} from "../convergence-support";
import {
	createPerformanceLedgerConsumer,
	createPerformancePositionConsumer,
	createPgPerformanceQueryDeps,
	expectDecimalEqual,
	PERFORMANCE_TEST_ORG_ID,
	sampleTradeFillLines,
	shouldRunPgIntegrationTests,
	withPerformancePgHarness,
} from "../test-support";

describe("ANX-154 convergence oracle (institutional fixture)", () => {
	test("end-to-end: derived metrics, PG persistence, and HTTP read queries converge", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const queryDeps = createPgPerformanceQueryDeps(pool);
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
				expect(ledgerResult.outcomeSnapshotId).toMatch(/^perf_out_/);

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
				expect(positionResult.positionExposureSnapshotId).toMatch(/^perf_pes_/);

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
				const outcomeByName = metricsToMap(pgOutcomeMetrics.rows);
				assertDerivedMetricsMatch(outcomeByName, expectedLedgerMetrics);

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
				const positionByName = metricsToMap(pgPositionMetrics.rows);
				assertDerivedMetricsMatch(positionByName, expectedPositionMetrics);

				const outcomeSnapshot = await getOutcomeSnapshot(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					ledgerResult.outcomeSnapshotId,
				);
				expect(outcomeSnapshot.journalEntryId).toBe(journalEntryId);
				expect(outcomeSnapshot.linesSummary).toEqual(lines);

				const outcomeMetrics = await listOutcomeSnapshotMetrics(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					ledgerResult.outcomeSnapshotId,
				);
				expect(outcomeMetrics.metrics).toHaveLength(3);
				for (const metric of expectedLedgerMetrics) {
					const read = outcomeMetrics.metrics.find(
						(item) => item.metricName === metric.metricName,
					);
					expect(read).toBeDefined();
					expectDecimalEqual(read?.metricValue, metric.metricValue);
				}

				const listedOutcomes = await listOutcomeSnapshots(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					{ journalEntryId },
				);
				expect(listedOutcomes.outcomeSnapshots).toHaveLength(1);
				expect(listedOutcomes.outcomeSnapshots[0]?.outcomeSnapshotId).toBe(
					ledgerResult.outcomeSnapshotId,
				);

				const positionSnapshot = await getPositionExposureSnapshot(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					positionResult.positionExposureSnapshotId,
				);
				expect(positionSnapshot.portfolioId).toBe(portfolioId);
				expect(positionSnapshot.positionId).toBe(positionId);
				expect(positionSnapshot.revision).toBe(1);

				const positionMetrics = await listPositionExposureSnapshotMetrics(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					positionResult.positionExposureSnapshotId,
				);
				expect(positionMetrics.metrics).toHaveLength(3);
				for (const metric of expectedPositionMetrics) {
					const read = positionMetrics.metrics.find(
						(item) => item.metricName === metric.metricName,
					);
					expect(read).toBeDefined();
					expectDecimalEqual(read?.metricValue, metric.metricValue);
				}

				const listedPositions = await listPositionExposureSnapshots(
					queryDeps,
					PERFORMANCE_TEST_ORG_ID,
					{ portfolioId, positionId },
				);
				expect(listedPositions.positionExposureSnapshots).toHaveLength(1);
				expect(
					listedPositions.positionExposureSnapshots[0]
						?.positionExposureSnapshotId,
				).toBe(positionResult.positionExposureSnapshotId);
			},
		);
	});

	test("G5-PERF-02: coherent BUY ledger + LONG position converges within agency context", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const lines = sampleTradeFillLines();
				const ledgerConsumer = createPerformanceLedgerConsumer({
					unitOfWork,
					commandJournal,
				});
				const ledgerResult = await ledgerConsumer.handle({
					entryId: `acc_je_${randomUUID()}`,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					valueDate: "2026-09-11",
					linesSummary: lines,
				});

				const positionConsumer = createPerformancePositionConsumer({
					unitOfWork,
					commandJournal,
				});
				await positionConsumer.handle({
					portfolioId: `pf_prt_${randomUUID()}`,
					positionId: `pf_pos_${randomUUID()}`,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					instrumentId: "BTC-USD",
					positionSide: "LONG",
					book: "primary",
					quantity: "1.5",
					revision: 1,
					fillId: `ex_fill_${randomUUID()}`,
					side: "BUY",
				});

				const ledgerMetrics = metricsToMap(
					(
						await pool.query<{ metric_name: string; metric_value: string }>(
							`SELECT metric_name, metric_value
						 FROM performance_metric_series
						 WHERE outcome_snapshot_id = $1`,
							[ledgerResult.outcomeSnapshotId],
						)
					).rows,
				);
				const positionMetrics = metricsToMap(
					(
						await pool.query<{ metric_name: string; metric_value: string }>(
							`SELECT metric_name, metric_value
						 FROM performance_metric_series
						 WHERE organization_id = $1
						   AND position_exposure_snapshot_id IS NOT NULL
						 ORDER BY observed_at DESC
						 LIMIT 3`,
							[PERFORMANCE_TEST_ORG_ID],
						)
					).rows,
				);

				const divergence = detectLedgerPositionDivergence({
					tradeSide: "BUY",
					...extractLedgerConvergenceFields(ledgerMetrics),
					...extractPositionConvergenceFields(positionMetrics),
				});
				expect(divergence).toEqual([]);
			},
		);
	});

	test("G5-PERF-02: divergent BUY ledger vs SHORT position is detected", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const lines = sampleTradeFillLines();
				const ledgerConsumer = createPerformanceLedgerConsumer({
					unitOfWork,
					commandJournal,
				});
				const ledgerResult = await ledgerConsumer.handle({
					entryId: `acc_je_${randomUUID()}`,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					valueDate: "2026-09-11",
					linesSummary: lines,
				});

				const positionConsumer = createPerformancePositionConsumer({
					unitOfWork,
					commandJournal,
				});
				await positionConsumer.handle({
					portfolioId: `pf_prt_${randomUUID()}`,
					positionId: `pf_pos_${randomUUID()}`,
					organizationId: PERFORMANCE_TEST_ORG_ID,
					instrumentId: "BTC-USD",
					positionSide: "SHORT",
					book: "primary",
					quantity: "1.5",
					revision: 1,
					fillId: `ex_fill_${randomUUID()}`,
					side: "BUY",
				});

				const ledgerMetrics = metricsToMap(
					(
						await pool.query<{ metric_name: string; metric_value: string }>(
							`SELECT metric_name, metric_value
						 FROM performance_metric_series
						 WHERE outcome_snapshot_id = $1`,
							[ledgerResult.outcomeSnapshotId],
						)
					).rows,
				);
				const positionMetrics = metricsToMap(
					(
						await pool.query<{ metric_name: string; metric_value: string }>(
							`SELECT metric_name, metric_value
						 FROM performance_metric_series
						 WHERE organization_id = $1
						   AND position_exposure_snapshot_id IS NOT NULL
						 ORDER BY observed_at DESC
						 LIMIT 3`,
							[PERFORMANCE_TEST_ORG_ID],
						)
					).rows,
				);

				const divergence = detectLedgerPositionDivergence({
					tradeSide: "BUY",
					...extractLedgerConvergenceFields(ledgerMetrics),
					...extractPositionConvergenceFields(positionMetrics),
				});
				expect(divergence.length).toBeGreaterThan(0);
				expect(
					divergence.some((reason) => reason.includes("signed_quantity")),
				).toBe(true);
				expectDecimalEqual(
					positionMetrics.get(
						OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY,
					),
					"-1.5",
				);
				expectDecimalEqual(
					ledgerMetrics.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA),
					"248.75",
				);
			},
		);
	});
});
