import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
	SIMULATION_ERROR_CODES,
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
} from "@anxionos/contracts/simulation";
import {
	SimulationCommandError,
	createFilesystemSimulationResultStoreAdapter,
	createSimulationRun,
	createSqliteSimulationSandboxAdapter,
	executeSimulationRun,
} from "@anxionos/simulation";
import {
	createInMemoryCommandJournalRepository,
	createInMemorySimulationRunRepository,
	createRecordingSimulationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let sandboxRoot = mkdtempSync(join(tmpdir(), "sim-exec-test-"));

afterEach(() => {
	rmSync(sandboxRoot, { recursive: true, force: true });
	sandboxRoot = mkdtempSync(join(tmpdir(), "sim-exec-test-"));
});

function createExecutionDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingSimulationUnitOfWork({
		commandJournal,
	});
	const sandbox = createSqliteSimulationSandboxAdapter({ sandboxRoot });
	const resultStore = createFilesystemSimulationResultStoreAdapter({
		sandboxRoot,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			sandbox,
			resultStore,
		},
		published,
	};
}

async function startRun(
	deps: ReturnType<typeof createExecutionDeps>["deps"],
	manifest?: Record<string, unknown>,
) {
	return createSimulationRun(deps, {
		commandId: crypto.randomUUID(),
		organizationId,
		manifest,
	});
}

describe("executeSimulationRun (ANX-159 P08-S3)", () => {
	test("completes STARTED run with resultRef, snapshot and completed event", async () => {
		const { deps, published } = createExecutionDeps();
		const started = await startRun(deps, {
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
			seed: 42,
		});
		published.length = 0;

		const result = await executeSimulationRun(deps, {
			commandId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			organizationId,
			simulationRunId: started.simulationRunId as string,
		});

		expect(result.revision).toBe(2);
		expect(published).toHaveLength(2);
		expect(published[0]?.eventType).toBe(SIMULATION_EVENT_TYPES.SNAPSHOT_CREATED);
		expect(published[1]).toMatchObject({
			eventType: SIMULATION_EVENT_TYPES.RUN_COMPLETED,
			ownerDomain: SIMULATION_OWNER_DOMAIN,
			payload: {
				schemaVersion: "1.0.0",
				simulationRunId: started.simulationRunId,
				organizationId,
				resultRef: `sandbox://simulation/${started.simulationRunId}`,
			},
		});
		expect(published[1]?.payload).toHaveProperty("datasetHash");
	});

	test("fails run on dataset hash mismatch without official resultRef", async () => {
		const { deps, published } = createExecutionDeps();
		const started = await startRun(deps, {
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
			datasetHash: "sha256:wrong-hash",
		});
		published.length = 0;

		const result = await executeSimulationRun(deps, {
			commandId: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
			organizationId,
			simulationRunId: started.simulationRunId as string,
		});

		expect(result.revision).toBe(2);
		expect(published).toHaveLength(1);
		expect(published[0]).toMatchObject({
			eventType: SIMULATION_EVENT_TYPES.RUN_FAILED,
			payload: {
				failureCode: SIMULATION_ERROR_CODES.DATASET_HASH_MISMATCH,
			},
		});
	});

	test("idempotent replay returns same aggregate revision", async () => {
		const { deps } = createExecutionDeps();
		const started = await startRun(deps, {
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
		});
		const commandId = "cccccccc-dddd-4eee-8fff-000000000000";
		const first = await executeSimulationRun(deps, {
			commandId,
			organizationId,
			simulationRunId: started.simulationRunId as string,
		});
		const second = await executeSimulationRun(deps, {
			commandId,
			organizationId,
			simulationRunId: started.simulationRunId as string,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("does not emit certification or execution events (G3-SIM-03)", async () => {
		const { deps, published } = createExecutionDeps();
		const started = await startRun(deps, {
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
		});
		published.length = 0;
		await executeSimulationRun(deps, {
			commandId: "dddddddd-eeee-4fff-8111-111111111111",
			organizationId,
			simulationRunId: started.simulationRunId as string,
		});
		for (const event of published) {
			expect(event.eventType).not.toMatch(/^evaluation\.certification\./);
			expect(event.eventType).not.toMatch(/^execution\.order\./);
		}
	});

	test("rejects concurrent mutation with SIM_CONCURRENT_MUTATION", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const runs = createInMemorySimulationRunRepository();
		const innerUpdate = runs.update.bind(runs);
		runs.update = async (record) => {
			const existing = await runs.findById(record.id);
			if (existing && existing.revision === record.revision - 1) {
				await innerUpdate({
					...existing,
					revision: existing.revision + 1,
				});
			}
			return innerUpdate(record);
		};
		const { unitOfWork, published } = createRecordingSimulationUnitOfWork({
			commandJournal,
			runs,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			sandbox: createSqliteSimulationSandboxAdapter({ sandboxRoot }),
			resultStore: createFilesystemSimulationResultStoreAdapter({
				sandboxRoot,
			}),
		};
		const started = await createSimulationRun(
			{ unitOfWork, commandJournal },
			{
				commandId: crypto.randomUUID(),
				organizationId,
				manifest: {
					datasetId: "ds_momentum_v1",
					datasetRevision: "rev-2026-09-10",
				},
			},
		);
		published.length = 0;
		await expect(
			executeSimulationRun(deps, {
				commandId: "ffffffff-1111-4111-8111-333333333333",
				organizationId,
				simulationRunId: started.simulationRunId as string,
			}),
		).rejects.toMatchObject({
			code: SIMULATION_ERROR_CODES.CONCURRENT_MUTATION,
		} satisfies Partial<SimulationCommandError>);
	});

	test("rejects unknown simulation run", async () => {
		const { deps } = createExecutionDeps();
		await expect(
			executeSimulationRun(deps, {
				commandId: "eeeeeeee-ffff-4111-8111-222222222222",
				organizationId,
				simulationRunId: "sim_run_00000000-0000-4000-8000-000000000000",
			}),
		).rejects.toMatchObject({
			code: "SIM_RUN_NOT_FOUND",
		} satisfies Partial<SimulationCommandError>);
	});
});
