import type { Pool } from "pg";
import type { RebuildControl, RebuildJob } from "../domain/ports/rebuild-control";
import { type ExecuteFullGenerationSwapInput, type FullGenerationSwapResult, type RebuildCacheControl, type RebuildConsumerControl, type RebuildF0Oracle, type RebuildGenerationStore, type RebuildReplayPort, type StartFullGenerationSwapInput } from "../application/rebuild/full-generation-swap";
import { RebuildError } from "../domain/rebuild/errors";
import { executeFullGenerationSwap, startFullGenerationSwap, } from "../application/rebuild/full-generation-swap";
import { findActiveRebuildJob, findRebuildJobById, } from "../infrastructure/persistence/rebuild-job-repository";

/**
 * Single-leader pattern (R06): only one non-terminal rebuild job may run.
 * Concurrent admin triggers receive REBUILD_ALREADY_ACTIVE from createRebuildJob.
 */
export async function tryAcquireRebuildLeaderLock(pool) {
    const active = await findActiveRebuildJob(pool);
    if (!active) {
        return { acquired: true };
    }
    return { acquired: false, activeJobId: active.jobId };
}
/**
 * graph-rebuild-worker entrypoint — single leader, no concurrent rebuild jobs.
 * Creates (or resumes) a job then executes the full generation swap pipeline.
 */
export async function runRebuildWorker(input) {
    const leaderLock = await tryAcquireRebuildLeaderLock(input.pool);
    if (!leaderLock.acquired && !input.existingJob) {
        throw new RebuildError(`Rebuild leader lock held by job ${leaderLock.activeJobId}`, "REBUILD_ALREADY_ACTIVE");
    }
    const job = input.existingJob ??
        (await startFullGenerationSwap({
            pool: input.pool,
            rebuildControl: input.rebuildControl,
            rebuildRegistry: input.rebuildRegistry,
            cutoffCheckpoint: input.cutoffCheckpoint,
            ownerDomainOrder: input.ownerDomainOrder,
            registryGeneration: input.registryGeneration,
            auditManifestId: input.auditManifestId,
        }));
    if (input.existingJob) {
        const fresh = await findRebuildJobById(input.pool, job.jobId);
        if (!fresh) {
            throw new RebuildError(`Rebuild job ${job.jobId} not found`, "REBUILD_NOT_FOUND");
        }
    }
    const result = await executeFullGenerationSwap({
        pool: input.pool,
        rebuildControl: input.rebuildControl,
        rebuildRegistry: input.rebuildRegistry,
        job,
        consumerControl: input.consumerControl,
        generationStore: input.generationStore,
        f0Oracle: input.f0Oracle,
        replay: input.replay,
        cacheControl: input.cacheControl,
        onPhase: input.onPhase,
    });
    return { ...result, leaderLock };
}

export interface RebuildLeaderLock {
    acquired: boolean;
    activeJobId?: string;
}
/**
 * Single-leader pattern (R06): only one non-terminal rebuild job may run.
 * Concurrent admin triggers receive REBUILD_ALREADY_ACTIVE from createRebuildJob.
 */

export interface RunRebuildWorkerInput extends Omit<ExecuteFullGenerationSwapInput, "job">, Omit<StartFullGenerationSwapInput, "pool" | "rebuildControl"> {
    rebuildControl: RebuildControl;
    pool: Pool;
    existingJob?: RebuildJob;
}

export interface RunRebuildWorkerResult extends FullGenerationSwapResult {
    leaderLock: RebuildLeaderLock;
}
/**
 * graph-rebuild-worker entrypoint — single leader, no concurrent rebuild jobs.
 * Creates (or resumes) a job then executes the full generation swap pipeline.
 */
