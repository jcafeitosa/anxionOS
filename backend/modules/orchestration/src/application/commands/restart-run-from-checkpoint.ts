import type {
	RestartRunFromCheckpointCommand,
	RestartRunFromCheckpointResult,
} from "@anxionos/contracts/orchestration";
import {
	restartRunFromCheckpointCommandSchema,
	restartRunFromCheckpointResultSchema,
} from "@anxionos/contracts/orchestration";
import { canTransitionRunStatus } from "../../domain/entities/run";
import {
	isLeaseActive,
	leaseTokensMatch,
} from "../../domain/entities/task-lease";
import { createRunRestartedFromCheckpointEvent } from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildRestartRunFromCheckpointCommandId,
	CommandJournalHashMismatchError,
	hashCommandPayload,
	loadIdempotentRestartRunFromCheckpointResult,
	toRestartRunFromCheckpointSnapshot,
} from "../command-support";
import { toRunDto } from "../dto-mappers";
import { throwOrchestrationError } from "../errors";

export interface RestartRunFromCheckpointDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	leaseClock: LeaseClock;
}

function toResult(
	result: RestartRunFromCheckpointResult,
): RestartRunFromCheckpointResult {
	return restartRunFromCheckpointResultSchema.parse(result);
}

export async function restartRunFromCheckpoint(
	deps: RestartRunFromCheckpointDeps,
	input: RestartRunFromCheckpointCommand,
): Promise<RestartRunFromCheckpointResult> {
	const command = restartRunFromCheckpointCommandSchema.parse(input);
	const commandId = buildRestartRunFromCheckpointCommandId(
		command.idempotencyKey,
		command.runId,
	);
	const requestHash = hashCommandPayload(command);
	let replay: RestartRunFromCheckpointResult | null = null;
	try {
		replay = await loadIdempotentRestartRunFromCheckpointResult(
			deps.commandJournal,
			commandId,
			requestHash,
		);
	} catch (error) {
		if (error instanceof CommandJournalHashMismatchError) {
			throwOrchestrationError(
				"ORC_COMMAND_HASH_MISMATCH",
				`Command journal hash mismatch for restart ${command.runId}`,
			);
		}
		throw error;
	}
	if (replay) {
		return toResult({ ...replay, idempotentReplay: true });
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
					`Run ${command.runId} not found for restart`,
				);
			}
			if (run.status !== "ORPHANED") {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Run ${command.runId} is not orphaned (${run.status})`,
				);
			}
			if (run.revision !== command.runRevision) {
				throwOrchestrationError(
					"ORC_RUN_FENCING_MISMATCH",
					`Run ${command.runId} revision mismatch (expected ${command.runRevision}, actual ${run.revision})`,
				);
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
			const lease = taskWithLease.lease;
			const now = deps.leaseClock.now();
			if (
				!lease ||
				lease.releasedAt !== null ||
				lease.runId !== command.runId ||
				lease.agentId !== command.agentId ||
				!isLeaseActive(lease, now) ||
				!leaseTokensMatch(lease.leaseToken, command.leaseToken)
			) {
				throwOrchestrationError(
					"ORC_LEASE_STALE",
					`Stale or invalid lease for restart on task ${command.taskId}`,
				);
			}
			if (!canTransitionRunStatus(run.status, "WAKING")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot wake run ${command.runId} from ${run.status}`,
				);
			}
			if (!canTransitionRunStatus("WAKING", "ACTIVE")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot activate run ${command.runId} from WAKING`,
				);
			}
			const checkpointRevision = run.revision;
			const savedRun = await context.runRepository.save({
				...run,
				status: "ACTIVE",
				completedAt: null,
				revision: run.revision + 1,
				updatedAt: now,
			});
			const result = toResult({
				run: toRunDto(savedRun),
				leaseToken: lease.leaseToken,
				idempotentReplay: false,
			});
			await context.commandJournal.record({
				commandId,
				commandName: "RestartRunFromCheckpoint",
				aggregateId: savedRun.id,
				aggregateType: "Run",
				revision: savedRun.revision,
				responseSnapshot: toRestartRunFromCheckpointSnapshot(
					result,
					requestHash,
				),
			});
			await context.publishEvents([
				createRunRestartedFromCheckpointEvent({
					runId: savedRun.id,
					taskId: savedRun.taskId,
					agentId: savedRun.agentId,
					organizationId: savedRun.organizationId,
					issueIdentifier: savedRun.issueIdentifier,
					runRevision: savedRun.revision,
					checkpointRevision,
					idempotencyKey: command.idempotencyKey,
					idempotentReplay: false,
				}),
			]);
			return result;
		},
	);
}
