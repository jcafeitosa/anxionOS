import type {
	CancelTaskRunCommand,
	CancelTaskRunResult,
} from "@anxionos/contracts/orchestration";
import {
	cancelTaskRunCommandSchema,
	cancelTaskRunResultSchema,
} from "@anxionos/contracts/orchestration";
import { canTransitionRunStatus } from "../../domain/entities/run";
import { canTransitionCheckoutStatus } from "../../domain/entities/task";
import {
	isLeaseActive,
	leaseTokensMatch,
} from "../../domain/entities/task-lease";
import {
	createRunTerminatedEvent,
	createTaskLeaseReleasedEvent,
} from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildCancelTaskRunCommandId,
	hashCommandPayload,
	loadIdempotentCancelTaskRunResult,
	toCancelTaskRunSnapshot,
} from "../command-support";
import { throwOrchestrationError } from "../errors";

export interface CancelTaskRunDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	leaseClock: LeaseClock;
}

function toResult(input: {
	runId: string;
	taskId: string;
	status: string;
	runRevision: number;
	cancelledHeartbeats: number;
	idempotentReplay?: boolean;
}): CancelTaskRunResult {
	return cancelTaskRunResultSchema.parse({
		...input,
		idempotentReplay: input.idempotentReplay ?? false,
	});
}

export async function cancelTaskRun(
	deps: CancelTaskRunDeps,
	input: CancelTaskRunCommand,
): Promise<CancelTaskRunResult> {
	const command = cancelTaskRunCommandSchema.parse(input);
	const commandId = buildCancelTaskRunCommandId(
		command.idempotencyKey,
		command.runId,
	);
	const requestHash = hashCommandPayload(command);
	const replay = await loadIdempotentCancelTaskRunResult(
		deps.commandJournal,
		commandId,
		requestHash,
	);
	if (replay) {
		return toResult(replay);
	}

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
					`Run ${command.runId} not found for cancel`,
				);
			}

			if (run.status === "TERMINATED") {
				const result = toResult({
					runId: run.id,
					taskId: run.taskId,
					status: run.status,
					runRevision: run.revision,
					cancelledHeartbeats: 0,
					idempotentReplay: true,
				});
				await context.commandJournal.record({
					commandId,
					commandName: "CancelTaskRun",
					aggregateId: run.id,
					aggregateType: "Run",
					revision: run.revision,
					responseSnapshot: toCancelTaskRunSnapshot(result, requestHash),
				});
				return result;
			}

			if (run.revision !== command.runRevision) {
				throwOrchestrationError(
					"ORC_RUN_FENCING_MISMATCH",
					`Run ${command.runId} revision mismatch (expected ${command.runRevision}, actual ${run.revision})`,
				);
			}
			if (!canTransitionRunStatus(run.status, "TERMINATED")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot cancel run ${command.runId} from ${run.status}`,
				);
			}

			const now = deps.leaseClock.now();
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

			const lease = taskWithLease.lease;
			if (lease && lease.releasedAt === null && lease.runId === command.runId) {
				if (lease.agentId !== command.agentId) {
					throwOrchestrationError(
						"ORC_LEASE_CONFLICT",
						`Lease owned by another agent for task ${command.taskId}`,
					);
				}
				if (
					command.leaseToken &&
					!leaseTokensMatch(lease.leaseToken, command.leaseToken)
				) {
					throwOrchestrationError(
						"ORC_LEASE_CONFLICT",
						`Lease token mismatch for task ${command.taskId}`,
					);
				}
				if (isLeaseActive(lease, now)) {
					await context.taskLeaseRepository.save({
						...lease,
						releasedAt: now,
					});
					await context.publishEvents([
						createTaskLeaseReleasedEvent({
							taskId: command.taskId,
							runId: command.runId,
							agentId: command.agentId,
							issueIdentifier: taskWithLease.issueIdentifier,
							reason: "cancelled",
						}),
					]);
				}
			}

			const cancelledHeartbeats =
				await context.runHeartbeatRepository.cancelPendingForRun(
					command.runId,
					now,
				);

			const savedRun = await context.runRepository.save({
				...run,
				status: "TERMINATED",
				completedAt: now,
				revision: run.revision + 1,
				updatedAt: now,
				waitingHuman: null,
			});

			const checkoutStatus = canTransitionCheckoutStatus(
				taskWithLease.checkoutStatus,
				"UNCLAIMED",
			)
				? "UNCLAIMED"
				: taskWithLease.checkoutStatus;
			await context.taskRepository.save({
				...taskWithLease,
				checkoutStatus,
				revision: taskWithLease.revision + 1,
				updatedAt: now,
			});

			const result = toResult({
				runId: savedRun.id,
				taskId: savedRun.taskId,
				status: savedRun.status,
				runRevision: savedRun.revision,
				cancelledHeartbeats,
				idempotentReplay: false,
			});

			await context.commandJournal.record({
				commandId,
				commandName: "CancelTaskRun",
				aggregateId: savedRun.id,
				aggregateType: "Run",
				revision: savedRun.revision,
				responseSnapshot: toCancelTaskRunSnapshot(result, requestHash),
			});

			await context.publishEvents([
				createRunTerminatedEvent({
					runId: savedRun.id,
					taskId: savedRun.taskId,
					agentId: savedRun.agentId,
					organizationId: savedRun.organizationId,
					issueIdentifier: savedRun.issueIdentifier,
					runRevision: savedRun.revision,
					reason: command.reason,
					idempotentReplay: false,
				}),
			]);

			return result;
		},
	);
}
