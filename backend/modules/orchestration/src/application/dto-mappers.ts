import type { GateBindingV1, RunDto, TaskDto } from "@anxionos/contracts/orchestration";
import type { GateBinding } from "../domain/entities/gate-binding";
import type { Run } from "../domain/entities/run";
import type { Task } from "../domain/entities/task";
import type { TaskLease } from "../domain/entities/task-lease";

export function toTaskDto(task: Task, lease: TaskLease | null): TaskDto {
    return {
        id: task.id,
        organizationId: task.organizationId,
        goalId: task.goalId,
        goalAncestry: task.goalAncestry,
        issueIdentifier: task.issueIdentifier,
        title: task.title,
        checkoutStatus: task.checkoutStatus,
        leaseExpiresAt: lease ? lease.expiresAt.toISOString() : undefined,
        revision: task.revision,
    };
}
export function toRunDto(run: Run): RunDto {
    return {
        id: run.id,
        taskId: run.taskId,
        agentId: run.agentId,
        issueIdentifier: run.issueIdentifier,
        status: run.status,
        goalAncestry: run.goalAncestry,
        startedAt: run.startedAt?.toISOString(),
        completedAt: run.completedAt?.toISOString(),
    };
}
export function toGateBindingV1(binding: GateBinding): GateBindingV1 {
    return {
        schemaVersion: "1.0.0",
        gateId: binding.gateId,
        issueIdentifier: binding.issueIdentifier,
        disposition: binding.disposition,
        reviewerId: binding.reviewerId,
        recordedAt: binding.recordedAt.toISOString(),
        ...(binding.runId ? { runId: binding.runId } : {}),
        ...(binding.artifactRevision != null
            ? { artifactRevision: binding.artifactRevision }
            : {}),
        hierarchyModeAtRecord: binding.hierarchyModeAtRecord,
        ...(binding.artifactDigest ? { artifactDigest: binding.artifactDigest } : {}),
        ...(binding.notApplicableReason
            ? { notApplicableReason: binding.notApplicableReason }
            : {}),
    };
}
