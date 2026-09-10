import type {
	StopRunForBudgetCommand,
	StopRunForBudgetResult,
} from "@anxionos/contracts/orchestration";
import {
	stopRunForBudgetCommandSchema,
	stopRunForBudgetResultSchema,
} from "@anxionos/contracts/orchestration";
import { canTransitionRunStatus } from "../../domain/entities/run";
import { canTransitionCheckoutStatus } from "../../domain/entities/task";
import {
	isLeaseActive,
	leaseTokensMatch,
} from "../../domain/entities/task-lease";
import {
	createRunBudgetStoppedEvent,
	createTaskLeaseReleasedEvent,
} from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildStopRunForBudgetCommandId,
	hashCommandPayload,
	loadIdempotentStopRunForBudgetResult,
	toStopRunForBudgetSnapshot,
} from "../command-support";
import { throwOrchestrationError } from "../errors";

export interface StopRunForBudgetDeps {
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
}): StopRunForBudgetResult {
	return stopRunForBudgetResultSchema.parse({
		...input,
		idempotentReplay: input.idempotentReplay ?? false,
	});
}

export async function stopRunForBudget(
	deps: StopRunForBudgetDeps,
	input: StopRunForBudgetCommand,
): Promise<StopRunForBudgetResult> {
	const command = stopRunForBudgetCommandSchema.parse(input);
	const commandId = buildStopRunForBudgetCommandId(
		command.idempotencyKey,
		command.runId,
	);
	const requestHash = hashCommandPayload(command);
	const replay = await loadIdempotentStopRunForBudgetResult(
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
					`Run ${command.runId} not found for budget stop`,
				);
			}

			if (run.status === "BUDGET_STOPPED") {
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
					commandName: "StopRunForBudget",
					aggregateId: run.id,
					aggregateType: "Run",
					revision: run.revision,
					responseSnapshot: toStopRunForBudgetSnapshot(result, requestHash),
				});
				return result;
			}

			if (run.revision !== command.runRevision) {
				throwOrchestrationError(
					"ORC_RUN_FENCING_MISMATCH",
					`Run ${command.runId} revision mismatch (expected ${command.runRevision}, actual ${run.revision})`,
				);
			}
			if (!canTransitionRunStatus(run.status, "BUDGET_STOPPED")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot budget-stop run ${command.runId} from ${run.status}`,
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
							reason: "budget_exceeded",
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
				status: "BUDGET_STOPPED",
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
				commandName: "StopRunForBudget",
				aggregateId: savedRun.id,
				aggregateType: "Run",
				revision: savedRun.revision,
				responseSnapshot: toStopRunForBudgetSnapshot(result, requestHash),
			});

			await context.publishEvents([
				createRunBudgetStoppedEvent({
					runId: savedRun.id,
					taskId: savedRun.taskId,
					agentId: savedRun.agentId,
					organizationId: savedRun.organizationId,
					issueIdentifier: savedRun.issueIdentifier,
					runRevision: savedRun.revision,
					cancelledHeartbeats,
					idempotentReplay: false,
				}),
			]);

			return result;
		},
	);
}
