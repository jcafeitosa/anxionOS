import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { PERFORMANCE_OWNER_DOMAIN } from "@anxionos/contracts/performance";
import {
	createInMemoryGraphStore,
	projectPerformanceGraphEvent,
} from "@anxionos/graph";
import { createPgMetricTimeseriesRepository } from "@anxionos/performance";
import { normalizeDecimalAmount } from "../../../modules/performance/src/domain/decimal-amount";
import { metricsToMap } from "../convergence-support";
import {
	createPerformanceLedgerConsumer,
	createPerformancePositionConsumer,
	PERFORMANCE_TEST_ORG_ID,
	sampleTradeFillLines,
	shouldRunPgIntegrationTests,
	withPerformancePgHarness,
} from "../test-support";

describe("ANX-154 S5 graph convergence oracle", () => {
	test("PG authoritative metrics ≡ graph projection from domain_journal events", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const portfolioId = `pf_prt_${randomUUID()}`;
				const positionId = `pf_pos_${randomUUID()}`;
				const journalEntryId = `acc_je_${randomUUID()}`;
				const lines = sampleTradeFillLines();

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
				await positionConsumer.handle({
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

				const journalRows = await pool.query<{
					event_id: string;
					event_type: string;
					schema_version: string;
					occurred_at: Date;
					payload: unknown;
				}>(
					`SELECT event_id, event_type, schema_version, occurred_at, payload
				 FROM domain_journal
				 WHERE owner_domain = $1
				   AND payload->>'organizationId' = $2
				 ORDER BY occurred_at ASC, event_id ASC`,
					[PERFORMANCE_OWNER_DOMAIN, PERFORMANCE_TEST_ORG_ID],
				);
				expect(journalRows.rowCount).toBeGreaterThanOrEqual(4);

				const graphStore = createInMemoryGraphStore();
				for (const row of journalRows.rows) {
					const envelope = domainEventEnvelopeSchema.parse({
						eventId: row.event_id,
						ownerDomain: PERFORMANCE_OWNER_DOMAIN,
						eventType: row.event_type,
						schemaVersion: row.schema_version,
						occurredAt: row.occurred_at.toISOString(),
						payload: row.payload,
					});
					await projectPerformanceGraphEvent({
						envelope,
						graphStore,
						projectionGeneration: 1,
					});
				}

				const pgMetrics = await pool.query<{
					id: string;
					metric_name: string;
					metric_value: string;
					outcome_snapshot_id: string | null;
					position_exposure_snapshot_id: string | null;
				}>(
					`SELECT id, metric_name, metric_value, outcome_snapshot_id, position_exposure_snapshot_id
				 FROM performance_metric_series
				 WHERE organization_id = $1
				 ORDER BY id`,
					[PERFORMANCE_TEST_ORG_ID],
				);
				expect(pgMetrics.rowCount).toBe(6);

				const graphMetrics = [...graphStore.records.values()].filter(
					(record) => record.nodeKey.type === "MetricSeries",
				);
				expect(graphMetrics).toHaveLength(pgMetrics.rowCount ?? 0);

				const pgById = metricsToMap(
					pgMetrics.rows.map((row) => ({
						metric_name: row.id,
						metric_value: row.metric_value,
					})),
				);
				for (const graphMetric of graphMetrics) {
					const pgRow = pgMetrics.rows.find(
						(row) => row.id === graphMetric.nodeKey.id,
					);
					expect(pgRow).toBeDefined();
					expect(
						normalizeDecimalAmount(String(graphMetric.payload.metricValue)),
					).toBe(normalizeDecimalAmount(String(pgRow!.metric_value)));
					expect(graphMetric.payload.metricName).toBe(pgRow!.metric_name);
					expect(pgById.has(pgRow!.id)).toBe(true);
				}

				const outcomeNode = await graphStore.getNode({
					scopeType: "AGENCY",
					scopeId: PERFORMANCE_TEST_ORG_ID,
					type: "Outcome",
					id: ledgerResult.outcomeSnapshotId,
				});
				expect(outcomeNode).not.toBeNull();

				const outcomeMetricEdges = graphStore.edges.filter(
					(edge) =>
						edge.edgeType === "HAS_METRIC" &&
						edge.from.type === "Outcome" &&
						edge.from.id === ledgerResult.outcomeSnapshotId,
				);
				expect(outcomeMetricEdges.length).toBe(3);

				const positionMetricEdges = graphStore.edges.filter(
					(edge) =>
						edge.edgeType === "HAS_METRIC" &&
						edge.from.type === "PositionExposureSnapshot",
				);
				expect(positionMetricEdges.length).toBe(3);

				const metricTimeseries = createPgMetricTimeseriesRepository(pool);
				const firstRebuild = await metricTimeseries.rebuildFromMetricSeries(
					PERFORMANCE_TEST_ORG_ID,
				);
				expect(firstRebuild.metricPointsInserted).toBe(0);
				expect(firstRebuild.pnlPointsInserted).toBe(0);
			},
		);
	});
});
