import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { SIMULATION_ERROR_CODES } from "@anxionos/contracts/simulation";
import {
	computeFixtureDatasetHash,
	createSqliteSimulationSandboxAdapter,
} from "@anxionos/simulation";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const simulationRunId = "sim_run_11111111-1111-4111-8111-111111111111";

let sandboxRoot = mkdtempSync(join(tmpdir(), "sim-sqlite-test-"));

afterEach(() => {
	rmSync(sandboxRoot, { recursive: true, force: true });
	sandboxRoot = mkdtempSync(join(tmpdir(), "sim-sqlite-test-"));
});

describe("sqlite simulation sandbox adapter (ANX-159 P08-S3)", () => {
	test("produces deterministic metrics for same seed and dataset", async () => {
		const manifestPayload = {
			datasetId: "ds_momentum_v1",
			datasetRevision: "rev-2026-09-10",
		};
		const datasetHash = computeFixtureDatasetHash(manifestPayload) as string;
		const input = {
			simulationRunId,
			organizationId,
			seedHash: "seed-deterministic-001",
			expectedDatasetHash: datasetHash,
			manifestPayload,
		};

		const isolatedRootA = mkdtempSync(join(tmpdir(), "sim-sqlite-a-"));
		const isolatedRootB = mkdtempSync(join(tmpdir(), "sim-sqlite-b-"));
		const first = await createSqliteSimulationSandboxAdapter({
			sandboxRoot: isolatedRootA,
		}).execute(input);
		const second = await createSqliteSimulationSandboxAdapter({
			sandboxRoot: isolatedRootB,
		}).execute(input);

		expect(first.status).toBe("COMPLETED");
		expect(second.status).toBe("COMPLETED");
		expect(first.metricsHash).toBe(second.metricsHash);
		expect(first.resultPayload?.tickCount).toBe(16);
		rmSync(isolatedRootA, { recursive: true, force: true });
		rmSync(isolatedRootB, { recursive: true, force: true });
	});

	test("fails when expected dataset hash does not match fixture", async () => {
		const sandbox = createSqliteSimulationSandboxAdapter({ sandboxRoot });
		const result = await sandbox.execute({
			simulationRunId,
			organizationId,
			seedHash: null,
			expectedDatasetHash: "sha256:wrong-hash",
			manifestPayload: {
				datasetId: "ds_momentum_v1",
				datasetRevision: "rev-2026-09-10",
			},
		});

		expect(result).toMatchObject({
			status: "FAILED",
			failureCode: SIMULATION_ERROR_CODES.DATASET_HASH_MISMATCH,
			metricsHash: null,
			resultPayload: null,
		});
	});
});
