import type {
	ResumeFromWaitingHumanInputCommand,
	ResumeFromWaitingHumanInputResult,
} from "@anxionos/contracts/orchestration";
import {
	resumeFromWaitingHumanInputCommandSchema,
	resumeFromWaitingHumanInputResultSchema,
} from "@anxionos/contracts/orchestration";
import { canTransitionRunStatus } from "../../domain/entities/run";
import { createRunResumedFromHumanEvent } from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildResumeWaitingHumanCommandId,
	hashCommandPayload,
	loadIdempotentWaitingHumanResult,
	toWaitingHumanResultSnapshot,
} from "../command-support";
import { toRunDto } from "../dto-mappers";
import { throwOrchestrationError } from "../errors";

export interface ResumeFromWaitingHumanInputDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	leaseClock: LeaseClock;
}

export async function resumeFromWaitingHumanInput(
	deps: ResumeFromWaitingHumanInputDeps,
	input: ResumeFromWaitingHumanInputCommand,
): Promise<ResumeFromWaitingHumanInputResult> {
	const command = resumeFromWaitingHumanInputCommandSchema.parse(input);
	const commandId = buildResumeWaitingHumanCommandId(
		command.idempotencyKey,
		command.operationId,
	);
	const requestHash = hashCommandPayload(command);
	const replay = await loadIdempotentWaitingHumanResult(
		deps.commandJournal,
		commandId,
		requestHash,
	);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const run = await context.runRepository.findById(
				command.organizationId,
				command.runId,
			);
			if (!run) {
				throwOrchestrationError(
					"ORC_RUN_NOT_FOUND",
					`Run ${command.runId} not found`,
				);
			}
			if (run.status !== "WAITING_HUMAN_INPUT") {
				throwOrchestrationError(
					"ORC_WAITING_HUMAN_STALE",
					`Run ${command.runId} is not waiting for human input (${run.status})`,
				);
			}
			if (
				!run.waitingHuman ||
				run.waitingHuman.operationId !== command.operationId
			) {
				throwOrchestrationError(
					"ORC_WAITING_HUMAN_STALE",
					`Run ${command.runId} operation mismatch (expected ${run.waitingHuman?.operationId})`,
				);
			}
			if (run.waitingHuman.idempotencyKey !== command.idempotencyKey) {
				throwOrchestrationError(
					"ORC_WAITING_HUMAN_STALE",
					`Run ${command.runId} idempotency key mismatch`,
				);
			}
			if (!canTransitionRunStatus(run.status, "ACTIVE")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot resume run ${command.runId} from ${run.status}`,
				);
			}
			const now = deps.leaseClock.now();
			const savedRun = await context.runRepository.save({
				...run,
				status: "ACTIVE",
				waitingHuman: null,
				revision: run.revision + 1,
				updatedAt: now,
			});
			const result = resumeFromWaitingHumanInputResultSchema.parse({
				run: toRunDto(savedRun),
				idempotentReplay: false,
			});
			await context.commandJournal.record({
				commandId,
				commandName: "ResumeFromWaitingHumanInput",
				aggregateId: savedRun.id,
				aggregateType: "Run",
				revision: savedRun.revision,
				responseSnapshot: toWaitingHumanResultSnapshot(result, requestHash),
			});
			await context.publishEvents([
				createRunResumedFromHumanEvent({
					runId: savedRun.id,
					taskId: savedRun.taskId,
					agentId: savedRun.agentId,
					organizationId: savedRun.organizationId,
					issueIdentifier: savedRun.issueIdentifier,
					operationId: command.operationId,
					idempotencyKey: command.idempotencyKey,
					runRevision: savedRun.revision,
					idempotentReplay: false,
				}),
			]);
			return result;
		},
	);
}
