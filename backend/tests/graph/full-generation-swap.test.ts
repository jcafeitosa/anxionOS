/**
 * ANX-304 — full generation swap pipeline unit tests (S4 rebuild homologation).
 */
import { describe, expect, test } from "bun:test";
import type { RebuildJob } from "@anxionos/graph";
import {
	executeFullGenerationSwap,
	GRAPH_REBUILD_OWNER_DOMAIN_ORDER,
	RebuildError,
	runRebuildWorker,
	startFullGenerationSwap,
} from "@anxionos/graph";

function createRebuildJob(overrides: Partial<RebuildJob> = {}): RebuildJob {
	return {
		jobId: "job-test-1",
		status: "pending",
		targetGeneration: 2,
		cutoffCheckpoint: 100,
		ownerDomainOrder: ["governance", "product"],
		registryGeneration: 1,
		...overrides,
	};
}

describe("executeFullGenerationSwap (ANX-304)", () => {
	test("runs drain → pause → replay → verify → swap → resume phases", async () => {
		const phases: string[] = [];
		const replayCalls: Array<{
			ownerDomain: string;
			targetGeneration: number;
		}> = [];
		const statusLog: string[] = [];
		let cacheWritesEnabled = true;
		const job = createRebuildJob();

		const result = await executeFullGenerationSwap({
			pool: {} as never,
			rebuildControl: {
				async updateJobStatus(_jobId, status) {
					statusLog.push(status);
				},
			},
			rebuildRegistry: {
				async bumpRegistryGeneration() {
					return 2;
				},
				async swapCurrentGeneration(generation) {
					expect(generation).toBe(2);
				},
				async getCurrentGeneration() {
					return 2;
				},
				async getRegistryGeneration() {
					return 1;
				},
			},
			job,
			consumerControl: {
				async drain() {
					phases.push("drain");
				},
				async pause() {
					phases.push("pause");
				},
				async resume() {
					phases.push("resume");
				},
			},
			generationStore: {
				async prepareGeneration(generation) {
					expect(generation).toBe(2);
					phases.push("prepare");
				},
				async swapToGeneration(generation) {
					expect(generation).toBe(2);
					phases.push("swap");
				},
			},
			f0Oracle: {
				async verifyGeneration(generation) {
					expect(generation).toBe(2);
					phases.push("verify");
				},
			},
			replay: {
				async replayOwnerDomain(input) {
					replayCalls.push({
						ownerDomain: input.ownerDomain,
						targetGeneration: input.targetGeneration,
					});
					return 3;
				},
			},
			cacheControl: {
				setCacheWriteEnabled(enabled) {
					cacheWritesEnabled = enabled;
				},
				async flushRegistryCache(registryGeneration) {
					expect(registryGeneration).toBe(2);
					phases.push("flush");
				},
			},
			async onPhase(phase) {
				phases.push(phase);
			},
		});

		expect(result.job.status).toBe("completed");
		expect(result.replayedByDomain).toEqual({ governance: 3, product: 3 });
		expect(result.registryGeneration).toBe(2);
		expect(replayCalls).toEqual([
			{ ownerDomain: "governance", targetGeneration: 2 },
			{ ownerDomain: "product", targetGeneration: 2 },
		]);
		expect(statusLog).toContain("draining");
		expect(statusLog).toContain("rebuilding");
		expect(statusLog).toContain("verifying");
		expect(phases).toEqual([
			"draining",
			"drain",
			"paused",
			"pause",
			"rebuilding",
			"prepare",
			"flushing",
			"flush",
			"verifying",
			"verify",
			"swapping",
			"swap",
			"running",
			"resume",
		]);
		expect(cacheWritesEnabled).toBe(true);
	});

	test("marks job failed and resumes consumers on replay error", async () => {
		const statusLog: string[] = [];
		let resumed = false;
		const job = createRebuildJob();

		await expect(
			executeFullGenerationSwap({
				pool: {} as never,
				rebuildControl: {
					async updateJobStatus(_jobId, status) {
						statusLog.push(status);
					},
				},
				rebuildRegistry: {
					async bumpRegistryGeneration() {
						return 2;
					},
					async swapCurrentGeneration() {},
					async getCurrentGeneration() {
						return 1;
					},
					async getRegistryGeneration() {
						return 1;
					},
				},
				job,
				consumerControl: {
					async drain() {},
					async pause() {},
					async resume() {
						resumed = true;
					},
				},
				generationStore: {
					async prepareGeneration() {},
					async swapToGeneration() {},
				},
				f0Oracle: {
					async verifyGeneration() {},
				},
				replay: {
					async replayOwnerDomain() {
						throw new Error("replay failed");
					},
				},
			}),
		).rejects.toThrow("replay failed");

		expect(statusLog).toContain("failed");
		expect(resumed).toBe(true);
	});
});

describe("startFullGenerationSwap + runRebuildWorker (ANX-304)", () => {
	test("startFullGenerationSwap increments target generation", async () => {
		const job = await startFullGenerationSwap({
			pool: {} as never,
			rebuildControl: {
				async getCurrentGeneration() {
					return 4;
				},
				async createRebuildJob(input) {
					expect(input.targetGeneration).toBe(5);
					expect(input.ownerDomainOrder).toEqual(
						GRAPH_REBUILD_OWNER_DOMAIN_ORDER,
					);
					return {
						jobId: "job-5",
						status: "pending",
						targetGeneration: input.targetGeneration,
						cutoffCheckpoint: input.cutoffCheckpoint,
						ownerDomainOrder: input.ownerDomainOrder,
						registryGeneration: input.registryGeneration,
					};
				},
				async getProjectionGeneration() {
					return 4;
				},
				async updateJobStatus() {},
			},
			rebuildRegistry: {
				async getRegistryGeneration() {
					return 9;
				},
				async bumpRegistryGeneration() {
					return 10;
				},
				async getCurrentGeneration() {
					return 5;
				},
				async swapCurrentGeneration() {},
			},
			cutoffCheckpoint: 42,
		});
		expect(job.targetGeneration).toBe(5);
		expect(job.registryGeneration).toBe(9);
	});

	test("runRebuildWorker rejects when leader lock held", async () => {
		await expect(
			runRebuildWorker({
				pool: {
					query: async () => ({ rows: [{ jobId: "active-job" }] }),
				} as never,
				rebuildControl: {} as never,
				rebuildRegistry: {} as never,
				cutoffCheckpoint: 1,
				consumerControl: {
					async drain() {},
					async pause() {},
					async resume() {},
				},
				generationStore: {
					async prepareGeneration() {},
					async swapToGeneration() {},
				},
				f0Oracle: { async verifyGeneration() {} },
				replay: {
					async replayOwnerDomain() {
						return 0;
					},
				},
			}),
		).rejects.toBeInstanceOf(RebuildError);
	});
});
