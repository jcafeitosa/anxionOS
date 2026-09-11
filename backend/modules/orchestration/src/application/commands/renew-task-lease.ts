import type { RenewTaskLeaseCommand } from "@anxionos/contracts/orchestration";
import { renewTaskLeaseCommandSchema } from "@anxionos/contracts/orchestration";
import {
	DEFAULT_LEASE_TTL_MS,
	isLeaseActive,
	leaseTokensMatch,
	MAX_LEASE_TTL_MS,
} from "../../domain/entities/task-lease";
import { createTaskLeaseRenewedEvent } from "../../domain/events/orchestration-events";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import type { OrganizationScopePort } from "../../domain/ports/organization-scope";
import type { TraversalEvaluator } from "../../domain/ports/traversal-evaluator";
import { assertCheckoutAuthorized } from "../checkout-authorization";
import { throwOrchestrationError } from "../errors";

export interface RenewTaskLeaseResult {
	taskId: string;
	runId: string;
	leaseExpiresAt: string;
	idempotentReplay?: boolean;
}
export interface RenewTaskLeaseDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
	organizationScope: OrganizationScopePort;
	traversalEvaluator: TraversalEvaluator;
}

export async function renewTaskLease(
	deps: RenewTaskLeaseDeps,
	input: RenewTaskLeaseCommand & { organizationId: string },
): Promise<RenewTaskLeaseResult> {
	const command = renewTaskLeaseCommandSchema.parse(input);
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const taskWithLease = await context.taskRepository.findByIdForUpdate(
				input.organizationId,
				command.taskId,
			);
			if (!taskWithLease) {
				throwOrchestrationError(
					"ORC_TASK_NOT_FOUND",
					`Task ${command.taskId} not found`,
				);
			}
			const lease = taskWithLease.lease;
			if (!lease || lease.releasedAt !== null) {
				throwOrchestrationError(
					"ORC_LEASE_EXPIRED",
					`No active lease for task ${command.taskId}`,
				);
			}
			if (!leaseTokensMatch(lease.leaseToken, command.leaseToken)) {
				throwOrchestrationError(
					"ORC_LEASE_CONFLICT",
					`Lease token mismatch for task ${command.taskId}`,
				);
			}
			if (lease.agentId !== command.agentId) {
				throwOrchestrationError(
					"ORC_LEASE_CONFLICT",
					`Lease owned by another agent for task ${command.taskId}`,
				);
			}
			const now = deps.leaseClock.now();
			if (!isLeaseActive(lease, now)) {
				throwOrchestrationError(
					"ORC_LEASE_EXPIRED",
					`Lease expired for task ${command.taskId}`,
				);
			}
			await assertCheckoutAuthorized(context, deps, {
				organizationId: input.organizationId,
				issueIdentifier: taskWithLease.issueIdentifier,
				agentId: command.agentId,
			});
			const maxExpiresAt = new Date(
				lease.leasedAt.getTime() + MAX_LEASE_TTL_MS,
			);
			const proposedExpiresAt = deps.leaseClock.expiresIn(DEFAULT_LEASE_TTL_MS);
			const expiresAt =
				proposedExpiresAt > maxExpiresAt ? maxExpiresAt : proposedExpiresAt;
			if (expiresAt <= now) {
				throwOrchestrationError(
					"ORC_LEASE_EXPIRED",
					`Lease renewal cap reached for task ${command.taskId}`,
				);
			}
			const updatedLease = await context.taskLeaseRepository.save({
				...lease,
				expiresAt,
			});
			const event = createTaskLeaseRenewedEvent({
				taskId: command.taskId,
				runId: updatedLease.runId,
				agentId: command.agentId,
				leaseExpiresAt: updatedLease.expiresAt.toISOString(),
			});
			await context.publishEvents([event]);
			return {
				taskId: command.taskId,
				runId: updatedLease.runId,
				leaseExpiresAt: updatedLease.expiresAt.toISOString(),
				idempotentReplay: expiresAt.getTime() === lease.expiresAt.getTime(),
			};
		},
	);
}
