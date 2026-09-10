import { randomUUID } from "node:crypto";
import type { RecordRunHeartbeatCommand } from "@anxionos/contracts/orchestration";
import { recordRunHeartbeatCommandSchema } from "@anxionos/contracts/orchestration";
import { HEARTBEAT_QUEUE_CAP_PER_ORG } from "../../domain/constants";
import {
	HEARTBEAT_COALESCE_WINDOW_MS,
	buildHeartbeatCoalesceKey,
} from "../../domain/entities/run-heartbeat";
import { isLeaseActive } from "../../domain/entities/task-lease";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import { throwOrchestrationError } from "../errors";

export interface RecordRunHeartbeatResult {
	heartbeatId: string;
	coalesceKey: string;
	nextWakeAt: string;
	coalesced: boolean;
}
export interface RecordRunHeartbeatDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
}

export async function recordRunHeartbeat(
	deps: RecordRunHeartbeatDeps,
	input: RecordRunHeartbeatCommand,
): Promise<RecordRunHeartbeatResult> {
	const command = recordRunHeartbeatCommandSchema.parse(input);
	const coalesceKey = buildHeartbeatCoalesceKey(
		command.taskId,
		command.agentId,
	);
	const now = deps.leaseClock.now();
	const nextWakeAt = new Date(now.getTime() + HEARTBEAT_COALESCE_WINDOW_MS);
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const run = await context.runRepository.findById(
				command.organizationId,
				command.runId,
			);
			if (
				!run ||
				run.taskId !== command.taskId ||
				run.agentId !== command.agentId
			) {
				throwOrchestrationError(
					"ORC_RUN_NOT_FOUND",
					`Run ${command.runId} not found for heartbeat`,
				);
			}
			if (
				run.status !== "ACTIVE" &&
				run.status !== "WAKING" &&
				run.status !== "PAUSED"
			) {
				throwOrchestrationError(
					"ORC_CHECKOUT_DENIED",
					`Run ${command.runId} is not active for heartbeat`,
				);
			}
			const lease = await context.taskLeaseRepository.findActiveByTaskId(
				command.taskId,
			);
			if (
				!lease ||
				lease.runId !== command.runId ||
				lease.agentId !== command.agentId
			) {
				throwOrchestrationError(
					"ORC_LEASE_EXPIRED",
					`No active lease for task ${command.taskId}`,
				);
			}
			if (!isLeaseActive(lease, now)) {
				throwOrchestrationError(
					"ORC_LEASE_EXPIRED",
					`Lease expired for task ${command.taskId}`,
				);
			}
			const existing =
				await context.runHeartbeatRepository.findPendingByCoalesceKey(
					coalesceKey,
				);
			if (existing) {
				const coalescedWakeAt =
					existing.nextWakeAt.getTime() > nextWakeAt.getTime()
						? existing.nextWakeAt
						: nextWakeAt;
				const updated = await context.runHeartbeatRepository.save({
					...existing,
					nextWakeAt: coalescedWakeAt,
				});
				return {
					heartbeatId: updated.id,
					coalesceKey,
					nextWakeAt: updated.nextWakeAt.toISOString(),
					coalesced: true,
				};
			}
			const pendingCount =
				await context.runHeartbeatRepository.countPendingByOrganization(
					command.organizationId,
				);
			if (pendingCount >= HEARTBEAT_QUEUE_CAP_PER_ORG) {
				throwOrchestrationError(
					"ORC_HEARTBEAT_BACKPRESSURE",
					`Heartbeat queue cap ${HEARTBEAT_QUEUE_CAP_PER_ORG} reached for organization`,
				);
			}
			const created = await context.runHeartbeatRepository.save({
				id: randomUUID(),
				runId: command.runId,
				taskId: command.taskId,
				agentId: command.agentId,
				coalesceKey,
				nextWakeAt,
				status: "pending",
				attempt: 0,
				createdAt: now,
				processedAt: null,
			});
			return {
				heartbeatId: created.id,
				coalesceKey,
				nextWakeAt: created.nextWakeAt.toISOString(),
				coalesced: false,
			};
		},
	);
}
