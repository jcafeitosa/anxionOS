import { describe, expect, test } from "bun:test";
import { DEFAULT_SANDBOX_ISOLATION_FLAGS } from "@anxionos/contracts/simulation";
import {
	getSimulationRun,
	getSimulationRunSnapshot,
	listSimulationRuns,
} from "@anxionos/simulation";
import {
	createInMemorySimulationRunRepository,
	createInMemorySimulationSnapshotRepository,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganizationId = "00000000-0000-4000-8000-000000000099";

const sampleRun = {
	id: "sim_run_11111111-1111-4111-8111-111111111111",
	organizationId,
	manifestId: null,
	strategyId: "strategy-alpha",
	strategyVersionId: "st_ver_33333333-3333-4333-8333-333333333333",
	backtestRequestId: "st_btr_22222222-2222-4222-8222-222222222222",
	executionMode: "SIMULATED",
	status: "COMPLETED",
	scenarioLabel: "baseline-deterministic",
	isolationFlags: DEFAULT_SANDBOX_ISOLATION_FLAGS,
	seedHash: "abc123",
	resultRef: "file:///tmp/sim-result.json",
	revision: 2,
	startedAt: "2026-09-11T10:00:00.000Z",
	completedAt: "2026-09-11T10:05:00.000Z",
	failedAt: null,
	failureCode: null,
};

const sampleSnapshot = {
	id: "sim_snap_44444444-4444-4444-8444-444444444444",
	organizationId,
	simulationRunId: sampleRun.id,
	datasetRef: sampleRun.resultRef,
	datasetHash: "dataset-hash-001",
	snapshotPayload: { metrics: { pnl: "100.00" } },
};

describe("simulation run queries (ANX-159 P08-S4)", () => {
	test("getSimulationRun returns agency-scoped run", async () => {
		const runs = createInMemorySimulationRunRepository([sampleRun]);
		const run = await getSimulationRun({ runs }, organizationId, sampleRun.id);
		expect(run.simulationRunId).toBe(sampleRun.id);
		expect(run.strategyId).toBe(sampleRun.strategyId);
	});

	test("G5-SIM-01: getSimulationRun rejects cross-tenant lookup", async () => {
		const runs = createInMemorySimulationRunRepository([sampleRun]);
		await expect(
			getSimulationRun({ runs }, otherOrganizationId, sampleRun.id),
		).rejects.toMatchObject({ code: "SIM_RUN_NOT_FOUND" });
	});

	test("listSimulationRuns filters by status and strategyId", async () => {
		const other = {
			...sampleRun,
			id: "sim_run_99999999-9999-4999-8999-999999999999",
			status: "STARTED",
			strategyId: "other-strategy",
			startedAt: "2026-09-10T10:00:00.000Z",
		};
		const runs = createInMemorySimulationRunRepository([other, sampleRun]);
		const result = await listSimulationRuns({ runs }, organizationId, {
			status: "COMPLETED",
			strategyId: sampleRun.strategyId ?? undefined,
		});
		expect(result.simulationRuns).toHaveLength(1);
		expect(result.simulationRuns[0]?.simulationRunId).toBe(sampleRun.id);
	});

	test("getSimulationRunSnapshot returns snapshot for completed run", async () => {
		const runs = createInMemorySimulationRunRepository([sampleRun]);
		const snapshots = createInMemorySimulationSnapshotRepository([
			sampleSnapshot,
		]);
		const snapshot = await getSimulationRunSnapshot(
			{ runs, snapshots },
			organizationId,
			sampleRun.id,
		);
		expect(snapshot.snapshotId).toBe(sampleSnapshot.id);
		expect(snapshot.snapshotPayload).toEqual(sampleSnapshot.snapshotPayload);
	});

	test("G5-SIM-01: getSimulationRunSnapshot rejects cross-tenant run access", async () => {
		const runs = createInMemorySimulationRunRepository([sampleRun]);
		const snapshots = createInMemorySimulationSnapshotRepository([
			sampleSnapshot,
		]);
		await expect(
			getSimulationRunSnapshot(
				{ runs, snapshots },
				otherOrganizationId,
				sampleRun.id,
			),
		).rejects.toMatchObject({ code: "SIM_RUN_NOT_FOUND" });
	});

	test("getSimulationRunSnapshot returns SIM_SNAPSHOT_NOT_FOUND when run has no snapshot", async () => {
		const startedRun = {
			...sampleRun,
			status: "STARTED",
			completedAt: null,
			resultRef: null,
		};
		const runs = createInMemorySimulationRunRepository([startedRun]);
		const snapshots = createInMemorySimulationSnapshotRepository([]);
		await expect(
			getSimulationRunSnapshot(
				{ runs, snapshots },
				organizationId,
				startedRun.id,
			),
		).rejects.toMatchObject({ code: "SIM_SNAPSHOT_NOT_FOUND" });
	});
});
