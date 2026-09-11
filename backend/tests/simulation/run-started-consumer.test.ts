import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { SIMULATION_EVENT_TYPES } from "@anxionos/contracts/simulation";
import {
	createFilesystemSimulationResultStoreAdapter,
	createRunStartedConsumer,
	createSimulationRun,
	createSqliteSimulationSandboxAdapter,
} from "@anxionos/simulation";
import {
	createInMemoryCommandJournalRepository,
	createRecordingSimulationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const eventId = "33333333-3333-4333-8333-333333333333";

let sandboxRoot = mkdtempSync(join(tmpdir(), "sim-run-started-test-"));

afterEach(() => {
	rmSync(sandboxRoot, { recursive: true, force: true });
	sandboxRoot = mkdtempSync(join(tmpdir(), "sim-run-started-test-"));
});

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingSimulationUnitOfWork({
		commandJournal,
	});
	const sandbox = createSqliteSimulationSandboxAdapter({ sandboxRoot });
	const resultStore = createFilesystemSimulationResultStoreAdapter({
		sandboxRoot,
	});
	const executionDeps = {
		unitOfWork,
		commandJournal,
		sandbox,
		resultStore,
	};
	return {
		consumer: createRunStartedConsumer(executionDeps),
		executionDeps,
		published,
	};
}

describe("createRunStartedConsumer (ANX-159 P08-S3)", () => {
	test("executes sandbox after run.started and emits completed (G3-SIM-01 partial)", async () => {
		const { consumer, executionDeps, published } = createDeps();
		const started = await createSimulationRun(executionDeps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			manifest: {
				datasetId: "ds_momentum_v1",
				datasetRevision: "rev-2026-09-10",
				seed: "seed-deterministic-001",
			},
		});
		const startedEvent = published.find(
			(event) => event.eventType === SIMULATION_EVENT_TYPES.RUN_STARTED,
		);
		expect(startedEvent).toBeDefined();
		published.length = 0;

		const result = await consumer.handle(startedEvent?.payload, eventId);
		expect(result.revision).toBe(2);
		expect(
			published.some(
				(event) => event.eventType === SIMULATION_EVENT_TYPES.RUN_COMPLETED,
			),
		).toBe(true);
		expect(result.simulationRunId).toBe(started.simulationRunId);
	});
});
