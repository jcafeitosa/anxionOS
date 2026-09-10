import { randomUUID } from "node:crypto";
import type {
	CheckoutTaskCommand,
	CheckoutTaskResult,
} from "@anxionos/contracts/orchestration";
import {
	checkoutTaskCommandSchema,
	checkoutTaskResultSchema,
} from "@anxionos/contracts/orchestration";
import { canTransitionCheckoutStatus } from "../../domain/entities/task";
import {
	DEFAULT_LEASE_TTL_MS,
	MAX_LEASE_TTL_MS,
	isLeaseActive,
} from "../../domain/entities/task-lease";
import { createTaskCheckedOutEvent } from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import type { CheckoutAuthorizationDeps } from "../checkout-authorization";
import {} from "../checkout-authorization";
import { assertCheckoutAuthorized } from "../checkout-authorization";
import {
	buildCheckoutCommandId,
	loadIdempotentCheckoutResult,
	toCheckoutResultSnapshot,
} from "../command-support";
import { toRunDto, toTaskDto } from "../dto-mappers";
import {
	parseCheckoutResultSnapshot,
	throwOrchestrationError,
} from "../errors";

export interface CheckoutTaskDeps extends CheckoutAuthorizationDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	leaseClock: LeaseClock;
}

export async function checkoutTask(
	deps: CheckoutTaskDeps,
	input: CheckoutTaskCommand,
): Promise<CheckoutTaskResult> {
	const command = checkoutTaskCommandSchema.parse(input);
	const commandId = buildCheckoutCommandId(command.agentId, command.taskId);
	const replay = await loadIdempotentCheckoutResult(
		deps.commandJournal,
		commandId,
	);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const raced = await context.commandJournal.findByCommandId(commandId);
			if (raced) {
				return parseCheckoutResultSnapshot(raced.responseSnapshot);
			}
			const taskWithLease = await context.taskRepository.findByIdForUpdate(
				command.organizationId,
				command.taskId,
			);
			if (!taskWithLease) {
				throwOrchestrationError(
					"ORC_TASK_NOT_FOUND",
					`Task ${command.taskId} not found`,
				);
			}
			const now = deps.leaseClock.now();
			const activeLease = taskWithLease.lease;
			if (activeLease && isLeaseActive(activeLease, now)) {
				if (activeLease.agentId !== command.agentId) {
					throwOrchestrationError(
						"ORC_LEASE_CONFLICT",
						`Task ${command.taskId} is leased by another agent`,
					);
				}
				const run = await context.runRepository.findActiveByTaskAndAgent(
					command.organizationId,
					command.taskId,
					command.agentId,
				);
				if (!run) {
					throwOrchestrationError(
						"ORC_RUN_NOT_FOUND",
						`Active run not found for task ${command.taskId}`,
					);
				}
				const result = checkoutTaskResultSchema.parse({
					task: toTaskDto(taskWithLease, activeLease),
					run: toRunDto(run),
					leaseToken: activeLease.leaseToken,
					idempotentReplay: true,
				});
				await context.commandJournal.record({
					commandId,
					commandName: "CheckoutTask",
					aggregateId: command.taskId,
					aggregateType: "Task",
					revision: taskWithLease.revision,
					responseSnapshot: toCheckoutResultSnapshot(result),
				});
				return result;
			}
			await assertCheckoutAuthorized(context, deps, {
				organizationId: command.organizationId,
				issueIdentifier: taskWithLease.issueIdentifier,
				agentId: command.agentId,
			});
			if (
				taskWithLease.checkoutStatus !== "UNCLAIMED" &&
				!canTransitionCheckoutStatus(taskWithLease.checkoutStatus, "LEASED")
			) {
				throwOrchestrationError(
					"ORC_CHECKOUT_DENIED",
					`Task ${command.taskId} checkout status is ${taskWithLease.checkoutStatus}`,
				);
			}
			const ttlMs = Math.min(
				command.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS,
				MAX_LEASE_TTL_MS,
			);
			const leasedAt = now;
			const expiresAt = deps.leaseClock.expiresIn(ttlMs);
			const leaseId = randomUUID();
			const leaseToken = randomUUID();
			const runId = randomUUID();
			const coalesceKey = buildCheckoutCommandId(
				command.agentId,
				command.taskId,
			);
			const savedRun = await context.runRepository.save({
				id: runId,
				taskId: command.taskId,
				agentId: command.agentId,
				organizationId: command.organizationId,
				goalAncestry: taskWithLease.goalAncestry,
				issueIdentifier: taskWithLease.issueIdentifier,
				parentRunId: null,
				status: "ACTIVE",
				coalesceKey,
				revision: 1,
				startedAt: leasedAt,
				completedAt: null,
				createdAt: leasedAt,
				updatedAt: leasedAt,
				waitingHuman: null,
			});
			const lease = await context.taskLeaseRepository.save({
				id: leaseId,
				taskId: command.taskId,
				runId: savedRun.id,
				agentId: command.agentId,
				leaseToken,
				leasedAt,
				expiresAt,
				heartbeatDueAt: null,
				releasedAt: null,
				createdAt: leasedAt,
			});
			const updatedTask = await context.taskRepository.save({
				...taskWithLease,
				checkoutStatus: "LEASED",
				revision: taskWithLease.revision + 1,
				updatedAt: leasedAt,
			});
			const result = checkoutTaskResultSchema.parse({
				task: toTaskDto(updatedTask, lease),
				run: toRunDto(savedRun),
				leaseToken: lease.leaseToken,
				idempotentReplay: false,
			});
			const event = createTaskCheckedOutEvent({
				taskId: updatedTask.id,
				runId: savedRun.id,
				agentId: command.agentId,
				organizationId: command.organizationId,
				issueIdentifier: updatedTask.issueIdentifier,
				goalId: updatedTask.goalId,
				goalAncestry: updatedTask.goalAncestry,
				leaseExpiresAt: lease.expiresAt.toISOString(),
				checkoutStatus: updatedTask.checkoutStatus,
				idempotentReplay: false,
			});
			await context.commandJournal.record({
				commandId,
				commandName: "CheckoutTask",
				aggregateId: updatedTask.id,
				aggregateType: "Task",
				revision: updatedTask.revision,
				responseSnapshot: toCheckoutResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}
