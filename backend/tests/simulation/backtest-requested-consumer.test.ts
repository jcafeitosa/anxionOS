import { describe, expect, test } from "bun:test";
import {
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
	SimulationContractError,
} from "@anxionos/contracts/simulation";
import { createBacktestRequestedConsumer } from "@anxionos/simulation";
import { classifySimulationEventConsumerError } from "../../apps/api/src/simulation/event-consumers";
import {
	createInMemoryCommandJournalRepository,
	createRecordingSimulationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const backtestRequestId = "st_btr_11111111-1111-4111-8111-111111111111";
const strategyId = "st_str_22222222-2222-4222-8222-222222222222";
const strategyVersionId = "st_ver_33333333-3333-4333-8333-333333333333";
const eventId = "33333333-3333-4333-8333-333333333333";

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingSimulationUnitOfWork({
		commandJournal,
	});
	return {
		consumer: createBacktestRequestedConsumer({ unitOfWork, commandJournal }),
		published,
	};
}

describe("createBacktestRequestedConsumer (ANX-159 P08-S2)", () => {
	test("creates simulation run and emits simulation.run.started.v1 (G3-SIM-01 partial)", async () => {
		const { consumer, published } = createDeps();
		const result = await consumer.handle(
			{
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
			eventId,
		);
		expect(result.simulationRunId).toMatch(/^sim_run_/);
		expect(result.revision).toBe(1);
		expect(published).toHaveLength(1);
		expect(published[0]).toMatchObject({
			eventType: SIMULATION_EVENT_TYPES.RUN_STARTED,
			ownerDomain: SIMULATION_OWNER_DOMAIN,
			payload: {
				organizationId,
				backtestRequestId,
				status: "STARTED",
				executionMode: "SIMULATED",
			},
		});
	});

	test("uses eventId as commandId for idempotent replay", async () => {
		const { consumer } = createDeps();
		const first = await consumer.handle(
			{
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
			eventId,
		);
		const second = await consumer.handle(
			{
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
			eventId,
		);
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects PAPER executionMode with SIM_EXECUTION_MODE_NOT_SUPPORTED (permanent ack)", async () => {
		const { consumer } = createDeps();
		await expect(
			consumer.handle(
				{
					backtestRequestId,
					organizationId,
					strategyId,
					strategyVersionId,
					datasetId: "ds_momentum_v1",
					datasetRevision: "rev-2026-09-10",
					seed: "seed-deterministic-001",
					executionMode: "PAPER",
					requestedAt: "2026-09-10T12:00:00.000Z",
				},
				eventId,
			),
		).rejects.toThrow(SimulationContractError);
		expect(
			classifySimulationEventConsumerError(
				new SimulationContractError("SIM_EXECUTION_MODE_NOT_SUPPORTED"),
			),
		).toBe("permanent");
	});
});
