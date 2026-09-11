import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
} from "@anxionos/contracts/simulation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
	createSimulationEventConsumerDeps,
	processSimulationBacktestRequestedEvent,
} from "../../apps/api/src/simulation/event-consumers";
import { shouldRunPgIntegrationTests, withSimulationPgHarness } from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const backtestRequestId = "st_btr_11111111-1111-4111-8111-111111111111";
const strategyId = "st_str_22222222-2222-4222-8222-222222222222";
const strategyVersionId = "st_ver_33333333-3333-4333-8333-333333333333";

function createBacktestRequestedEnvelope(
	eventId = "55555555-5555-4555-8555-555555555555",
): DomainEventEnvelope {
	return {
		eventId,
		schemaVersion: "0.1.0",
		ownerDomain: "strategies",
		eventType: STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED,
		occurredAt: "2026-09-10T12:00:00.000Z",
		payload: {
			backtestRequestId,
			organizationId,
			strategyId,
			strategyVersionId,
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
			seed: "seed-deterministic-001",
			executionMode: "SIMULATED",
			requestedAt: "2026-09-10T12:00:00.000Z",
		},
	};
}

describe("simulation backtest requested event consumer (ANX-159 P08-S2)", () => {
	test("processSimulationBacktestRequestedEvent persists run and inbox idempotency", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withSimulationPgHarness(async ({ pool }) => {
			const deps = createSimulationEventConsumerDeps(pool);
			const envelope = createBacktestRequestedEnvelope();

			const first = await processSimulationBacktestRequestedEvent(
				pool,
				deps,
				envelope,
			);
			const second = await processSimulationBacktestRequestedEvent(
				pool,
				deps,
				envelope,
			);

			expect(first).toBe("processed");
			expect(second).toBe("skipped");

			const runs = await pool.query(
				`SELECT id, backtest_request_id, status
				 FROM simulation_runs
				 WHERE organization_id = $1`,
				[organizationId],
			);
			expect(runs.rowCount).toBe(1);
			expect(runs.rows[0]).toMatchObject({
				backtest_request_id: backtestRequestId,
				status: "STARTED",
			});

			const journal = await pool.query(
				`SELECT event_type, owner_domain
				 FROM domain_journal
				 WHERE owner_domain = $1 AND event_type = $2`,
				[SIMULATION_OWNER_DOMAIN, SIMULATION_EVENT_TYPES.RUN_STARTED],
			);
			expect(journal.rowCount).toBe(1);

			const inbox = await pool.query(
				"SELECT consumer_name FROM inbox WHERE event_id = $1",
				[envelope.eventId],
			);
			expect(inbox.rowCount).toBe(1);
			expect(inbox.rows[0]?.consumer_name).toBe(
				SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
			);
		});
	});

	test("skips unrelated event types", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withSimulationPgHarness(async ({ pool }) => {
			const deps = createSimulationEventConsumerDeps(pool);
			const result = await processSimulationBacktestRequestedEvent(
				pool,
				deps,
				{
					...createBacktestRequestedEnvelope(),
					eventType: STRATEGIES_EVENT_TYPES.BACKTEST_COMPLETED,
					payload: {
						backtestRequestId,
						organizationId,
						strategyId,
						strategyVersionId,
						resultRef: null,
						metricsHash: null,
						status: "COMPLETED",
					},
				},
			);
			expect(result).toBe("skipped");
		});
	});
});
