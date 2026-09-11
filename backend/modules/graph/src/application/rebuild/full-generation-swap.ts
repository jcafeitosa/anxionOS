import type { GraphDatabasePool } from "../../domain/ports/graph-database-pool";
import type {
	RebuildControl,
	RebuildJob,
} from "../../domain/ports/rebuild-control";
import type { RebuildRegistryPort } from "../../domain/ports/rebuild-registry-port";
import { GRAPH_REBUILD_OWNER_DOMAIN_ORDER } from "../../domain/rebuild/constants";
import { RebuildError } from "../../domain/rebuild/errors";

function resolveOwnerDomainOrder(order) {
	return order ?? GRAPH_REBUILD_OWNER_DOMAIN_ORDER;
}
/** Creates rebuild job with targetGeneration = current + 1 (D-GR-037 full swap). */
export async function startFullGenerationSwap(input) {
	const currentGeneration = await input.rebuildControl.getCurrentGeneration();
	const targetGeneration = currentGeneration + 1;
	const registryGeneration =
		input.registryGeneration ??
		(await input.rebuildRegistry.getRegistryGeneration());
	return input.rebuildControl.createRebuildJob({
		targetGeneration,
		cutoffCheckpoint: input.cutoffCheckpoint,
		ownerDomainOrder: resolveOwnerDomainOrder(input.ownerDomainOrder),
		registryGeneration,
		auditManifestId: input.auditManifestId,
	});
}
async function finalizeSwap(
	rebuildRegistry,
	rebuildControl,
	job,
	generationStore,
) {
	await rebuildRegistry.swapCurrentGeneration(job.targetGeneration);
	await generationStore.swapToGeneration(job.targetGeneration);
	await rebuildControl.updateJobStatus(job.jobId, "completed");
}
/**
 * Pipeline drain → pause → N+1 → replay → F0 → swap → resume (R06/R09 S5).
 * Updates graph_rebuild_jobs status transitions and graph_current_generation on success.
 */
export async function executeFullGenerationSwap(input) {
	const { rebuildControl, job } = input;
	const replayedByDomain = {};
	let registryGeneration = job.registryGeneration;
	try {
		input.cacheControl?.setCacheWriteEnabled(false);
		await input.onPhase?.("draining");
		await rebuildControl.updateJobStatus(job.jobId, "draining");
		await input.consumerControl.drain();
		await input.onPhase?.("paused");
		await input.consumerControl.pause();
		await input.onPhase?.("rebuilding");
		await rebuildControl.updateJobStatus(job.jobId, "rebuilding");
		await input.generationStore.prepareGeneration(job.targetGeneration);
		for (const ownerDomain of job.ownerDomainOrder) {
			replayedByDomain[ownerDomain] = await input.replay.replayOwnerDomain({
				ownerDomain,
				targetGeneration: job.targetGeneration,
				cutoffCheckpoint: job.cutoffCheckpoint,
			});
		}
		await input.onPhase?.("flushing");
		registryGeneration = await input.rebuildRegistry.bumpRegistryGeneration();
		await input.cacheControl?.flushRegistryCache(registryGeneration);
		await input.onPhase?.("verifying");
		await rebuildControl.updateJobStatus(job.jobId, "verifying");
		await input.f0Oracle.verifyGeneration(job.targetGeneration);
		await input.onPhase?.("swapping");
		await finalizeSwap(
			input.rebuildRegistry,
			rebuildControl,
			job,
			input.generationStore,
		);
		await input.onPhase?.("running");
		await input.consumerControl.resume();
		input.cacheControl?.setCacheWriteEnabled(true);
		const currentGeneration =
			await input.rebuildRegistry.getCurrentGeneration();
		if (currentGeneration !== job.targetGeneration) {
			throw new RebuildError(
				`Generation swap mismatch: expected ${job.targetGeneration}, got ${currentGeneration}`,
				"REBUILD_SWAP_MISMATCH",
			);
		}
		return {
			job: { ...job, status: "completed" },
			replayedByDomain,
			registryGeneration,
		};
	} catch (error) {
		await rebuildControl.updateJobStatus(job.jobId, "failed");
		input.cacheControl?.setCacheWriteEnabled(true);
		try {
			await input.consumerControl.resume();
		} catch {
			// best-effort resume after failure
		}
		throw error;
	}
}

export type FullGenerationSwapPhase =
	| "draining"
	| "paused"
	| "rebuilding"
	| "flushing"
	| "verifying"
	| "swapping"
	| "running";

export interface RebuildConsumerControl {
	drain(options?: { timeoutMs?: number }): Promise<void>;
	pause(): Promise<void>;
	resume(): Promise<void>;
}

export interface RebuildGenerationStore {
	prepareGeneration(generation: number): Promise<void>;
	swapToGeneration(generation: number): Promise<void>;
}

export interface RebuildCacheControl {
	setCacheWriteEnabled(enabled: boolean): void;
	flushRegistryCache(registryGeneration: number): Promise<void>;
}

export interface RebuildF0Oracle {
	verifyGeneration(generation: number): Promise<void>;
}

export interface RebuildReplayPort {
	replayOwnerDomain(input: {
		ownerDomain: string;
		targetGeneration: number;
		cutoffCheckpoint: number;
	}): Promise<number>;
}

export interface StartFullGenerationSwapInput {
	pool: GraphDatabasePool;
	rebuildControl: RebuildControl;
	rebuildRegistry: RebuildRegistryPort;
	cutoffCheckpoint: number;
	ownerDomainOrder?: readonly string[];
	registryGeneration?: number;
	auditManifestId?: string;
}

export interface ExecuteFullGenerationSwapInput {
	pool: GraphDatabasePool;
	rebuildControl: RebuildControl;
	rebuildRegistry: RebuildRegistryPort;
	job: RebuildJob;
	consumerControl: RebuildConsumerControl;
	generationStore: RebuildGenerationStore;
	f0Oracle: RebuildF0Oracle;
	replay: RebuildReplayPort;
	cacheControl?: RebuildCacheControl;
	onPhase?: (phase: FullGenerationSwapPhase) => void | Promise<void>;
}

export interface FullGenerationSwapResult {
	job: RebuildJob;
	replayedByDomain: Readonly<Record<string, number>>;
	registryGeneration: number;
}
/** Creates rebuild job with targetGeneration = current + 1 (D-GR-037 full swap). */
