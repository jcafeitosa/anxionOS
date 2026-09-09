import { type ReleaseTaskLeaseCommand } from "@anxionos/contracts/orchestration";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type { OrchestrationUnitOfWork } from "../../domain/ports/orchestration-unit-of-work";
import { releaseTaskLeaseCommandSchema } from "@anxionos/contracts/orchestration";
import { canTransitionCheckoutStatus } from "../../domain/entities/task";
import { isLeaseActive, leaseTokensMatch } from "../../domain/entities/task-lease";
import { createTaskLeaseReleasedEvent } from "../../domain/events/orchestration-events";
import { throwOrchestrationError } from "../errors";

export interface ReleaseTaskLeaseResult {
    taskId: string;
    runId: string;
    releasedAt: string;
}
export interface ReleaseTaskLeaseDeps {
    unitOfWork: OrchestrationUnitOfWork;
    leaseClock: LeaseClock;
}

}): Promise<ReleaseTaskLeaseResult>;

export async function releaseTaskLease(deps, input) {
    const command = releaseTaskLeaseCommandSchema.parse(input);
    return deps.unitOfWork.runInTransaction(async (context) => {
        const taskWithLease = await context.taskRepository.findByIdForUpdate(input.organizationId, command.taskId);
        if (!taskWithLease) {
            throwOrchestrationError("ORC_TASK_NOT_FOUND", `Task ${command.taskId} not found`);
        }
        const lease = taskWithLease.lease;
        if (!lease || lease.releasedAt !== null) {
            throwOrchestrationError("ORC_LEASE_EXPIRED", `No active lease for task ${command.taskId}`);
        }
        if (!leaseTokensMatch(lease.leaseToken, command.leaseToken)) {
            throwOrchestrationError("ORC_LEASE_CONFLICT", `Lease token mismatch for task ${command.taskId}`);
        }
        if (lease.agentId !== command.agentId) {
            throwOrchestrationError("ORC_LEASE_CONFLICT", `Lease owned by another agent for task ${command.taskId}`);
        }
        const now = deps.leaseClock.now();
        if (!isLeaseActive(lease, now)) {
            throwOrchestrationError("ORC_LEASE_EXPIRED", `Lease expired for task ${command.taskId}`);
        }
        const releasedLease = await context.taskLeaseRepository.save({
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
        const run = await context.runRepository.findById(input.organizationId, releasedLease.runId);
        if (run && run.status === "ACTIVE") {
            await context.runRepository.save({
                ...run,
                status: "ORPHANED",
                revision: run.revision + 1,
                completedAt: now,
                updatedAt: now,
            });
        }
        const reason = command.reason ?? "manual";
        const event = createTaskLeaseReleasedEvent({
            taskId: command.taskId,
            runId: releasedLease.runId,
            agentId: command.agentId,
            issueIdentifier: taskWithLease.issueIdentifier,
            reason,
        });
        await context.publishEvents([event]);
        return {
            taskId: command.taskId,
            runId: releasedLease.runId,
            releasedAt: now.toISOString(),
        };
    });
}
