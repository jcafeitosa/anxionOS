import { type SweepExpiredLeasesCommand } from "@anxionos/contracts/orchestration";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type { OrchestrationUnitOfWork } from "../../domain/ports/orchestration-unit-of-work";
import { sweepExpiredLeasesCommandSchema } from "@anxionos/contracts/orchestration";
import { canTransitionCheckoutStatus } from "../../domain/entities/task";
import { isTerminalRunStatus } from "../../domain/entities/run";
import { LEASE_SWEEPER_BATCH_SIZE, LEASE_SWEEPER_JITTER_MAX_MS, } from "../../domain/constants";
import { createRunOrphanedEvent, createTaskLeaseReleasedEvent, } from "../../domain/events/orchestration-events";

export interface SweepExpiredLeasesResult {
    processedCount: number;
    orphanEventCount: number;
    nextBatchDelayMs: number;
}
export interface SweepExpiredLeasesDeps {
    unitOfWork: OrchestrationUnitOfWork;
    leaseClock: LeaseClock;
    randomInt?: (min: number, max: number) => number;
}

function defaultRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export async function sweepExpiredLeases(deps, input = { batchSize: LEASE_SWEEPER_BATCH_SIZE }) {
    const command = sweepExpiredLeasesCommandSchema.parse(input);
    const now = deps.leaseClock.now();
    const randomInt = deps.randomInt ?? defaultRandomInt;
    return deps.unitOfWork.runInTransaction(async (context) => {
        const expiredLeases = await context.taskLeaseRepository.findExpiredActive(now, command.batchSize);
        const events = [];
        let orphanEventCount = 0;
        for (const lease of expiredLeases) {
            const organizationId = lease.organizationId;
            const taskWithLease = await context.taskRepository.findByIdForUpdate(organizationId, lease.taskId);
            if (!taskWithLease)
                continue;
            const run = await context.runRepository.findById(organizationId, lease.runId);
            if (!run)
                continue;
            await context.taskLeaseRepository.save({
                ...lease,
                releasedAt: now,
            });
            const checkoutStatus = canTransitionCheckoutStatus(taskWithLease.checkoutStatus, "UNCLAIMED")
                ? "UNCLAIMED"
                : taskWithLease.checkoutStatus;
            await context.taskRepository.save({
                ...taskWithLease,
                checkoutStatus,
                revision: taskWithLease.revision + 1,
                updatedAt: now,
            });
            if (!isTerminalRunStatus(run.status)) {
                await context.runRepository.save({
                    ...run,
                    status: "ORPHANED",
                    revision: run.revision + 1,
                    completedAt: now,
                    updatedAt: now,
                });
                events.push(createRunOrphanedEvent({
                    runId: run.id,
                    taskId: run.taskId,
                    agentId: run.agentId,
                    issueIdentifier: run.issueIdentifier,
                    previousStatus: run.status,
                }));
                orphanEventCount += 1;
            }
            events.push(createTaskLeaseReleasedEvent({
                taskId: lease.taskId,
                runId: lease.runId,
                agentId: lease.agentId,
                issueIdentifier: taskWithLease.issueIdentifier,
                reason: "ttl_expired",
            }));
        }
        if (events.length > 0) {
            await context.publishEvents(events);
        }
        const processedCount = expiredLeases.length;
        const nextBatchDelayMs = processedCount > 0
            ? randomInt(0, LEASE_SWEEPER_JITTER_MAX_MS)
            : 0;
        return {
            processedCount,
            orphanEventCount,
            nextBatchDelayMs,
        };
    });
}
