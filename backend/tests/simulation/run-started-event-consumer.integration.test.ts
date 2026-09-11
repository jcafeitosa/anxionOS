import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
} from "@anxionos/contracts/simulation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	createSimulationEventConsumerDeps,
	processSimulationBacktestRequestedEvent,
	processSimulationRunStartedEvent,
	SIMULATION_RUN_STARTED_CONSUMER_NAME,
} from "../../apps/api/src/simulation/event-consumers";
import {
	shouldRunPgIntegrationTests,
	withSimulationPgHarness,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const backtestRequestId = "st_btr_11111111-1111-4111-8111-111111111111";
const strategyId = "st_str_22222222-2222-4222-8222-222222222222";
const strategyVersionId = "st_ver_33333333-3333-4333-8333-333333333333";

let sandboxRoot = mkdtempSync(join(tmpdir(), "sim-pg-sandbox-"));

afterEach(() => {
	rmSync(sandboxRoot, { recursive: true, force: true });
	sandboxRoot = mkdtempSync(join(tmpdir(), "sim-pg-sandbox-"));
	process.env.SIMULATION_SANDBOX_ROOT = sandboxRoot;
});

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

describe("simulation run started event consumer (ANX-159 P08-S3)", () => {
	test("backtest.requested → run.started → run.completed with resultRef (G3-SIM-01)", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withSimulationPgHarness(async ({ pool }) => {
			const deps = createSimulationEventConsumerDeps(pool);
			const backtestEnvelope = createBacktestRequestedEnvelope();
			expect(
				await processSimulationBacktestRequestedEvent(
					pool,
					deps,
					backtestEnvelope,
				),
			).toBe("processed");

			const startedJournal = await pool.query(
				`SELECT payload
				 FROM domain_journal
				 WHERE owner_domain = $1 AND event_type = $2`,
				[SIMULATION_OWNER_DOMAIN, SIMULATION_EVENT_TYPES.RUN_STARTED],
			);
			expect(startedJournal.rowCount).toBe(1);
			const startedPayload = startedJournal.rows[0]?.payload as Record<
				string,
				unknown
			>;
			const simulationRunId = String(startedPayload.simulationRunId);
			const startedEnvelope: DomainEventEnvelope = {
				eventId: "66666666-6666-4666-8666-666666666666",
				schemaVersion: "0.1.0",
				ownerDomain: SIMULATION_OWNER_DOMAIN,
				eventType: SIMULATION_EVENT_TYPES.RUN_STARTED,
				occurredAt: "2026-09-10T12:00:01.000Z",
				payload: startedPayload,
			};

			expect(
				await processSimulationRunStartedEvent(pool, deps, startedEnvelope),
			).toBe("processed");
			expect(
				await processSimulationRunStartedEvent(pool, deps, startedEnvelope),
			).toBe("skipped");

			const run = await pool.query(
				`SELECT status, result_ref
				 FROM simulation_runs
				 WHERE id = $1`,
				[simulationRunId],
			);
			expect(run.rows[0]).toMatchObject({
				status: "COMPLETED",
				result_ref: `sandbox://simulation/${simulationRunId}`,
			});

			const completedJournal = await pool.query(
				`SELECT event_type
				 FROM domain_journal
				 WHERE owner_domain = $1 AND event_type = $2`,
				[SIMULATION_OWNER_DOMAIN, SIMULATION_EVENT_TYPES.RUN_COMPLETED],
			);
			expect(completedJournal.rowCount).toBe(1);

			const inbox = await pool.query(
				"SELECT consumer_name FROM inbox WHERE event_id = $1",
				[startedEnvelope.eventId],
			);
			expect(inbox.rows[0]?.consumer_name).toBe(
				SIMULATION_RUN_STARTED_CONSUMER_NAME,
			);
		});
	});
});
