import type {
	RequestWaitingHumanInputCommand,
	RequestWaitingHumanInputResult,
} from "@anxionos/contracts/orchestration";
import {
	requestWaitingHumanInputCommandSchema,
	requestWaitingHumanInputResultSchema,
} from "@anxionos/contracts/orchestration";
import {
	canTransitionRunStatus,
	isTerminalRunStatus,
} from "../../domain/entities/run";
import { createRunWaitingHumanRequestedEvent } from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildRequestWaitingHumanCommandId,
	hashCommandPayload,
	loadIdempotentWaitingHumanResult,
	toWaitingHumanResultSnapshot,
} from "../command-support";
import { toRunDto } from "../dto-mappers";
import { throwOrchestrationError } from "../errors";

export interface RequestWaitingHumanInputDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	leaseClock: LeaseClock;
}

export async function requestWaitingHumanInput(
	deps: RequestWaitingHumanInputDeps,
	input: RequestWaitingHumanInputCommand,
): Promise<RequestWaitingHumanInputResult> {
	const command = requestWaitingHumanInputCommandSchema.parse(input);
	const commandId = buildRequestWaitingHumanCommandId(
		command.runId,
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
			if (isTerminalRunStatus(run.status)) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Run ${command.runId} is terminal (${run.status})`,
				);
			}
			if (run.status === "WAITING_HUMAN_INPUT") {
				if (run.waitingHuman?.operationId === command.operationId) {
					const result = requestWaitingHumanInputResultSchema.parse({
						run: toRunDto(run),
						idempotentReplay: true,
					});
					await context.commandJournal.record({
						commandId,
						commandName: "RequestWaitingHumanInput",
						aggregateId: run.id,
						aggregateType: "Run",
						revision: run.revision,
						responseSnapshot: toWaitingHumanResultSnapshot(result, requestHash),
					});
					return result;
				}
				throwOrchestrationError(
					"ORC_WAITING_HUMAN_STALE",
					`Run ${command.runId} already waiting on operation ${run.waitingHuman?.operationId}`,
				);
			}
			if (!canTransitionRunStatus(run.status, "WAITING_HUMAN_INPUT")) {
				throwOrchestrationError(
					"ORC_RUN_INVALID_TRANSITION",
					`Cannot transition run ${command.runId} from ${run.status} to WAITING_HUMAN_INPUT`,
				);
			}
			const now = deps.leaseClock.now();
			const waitingHuman = {
				operationId: command.operationId,
				idempotencyKey: command.idempotencyKey,
				requestedAt: now.toISOString(),
			};
			const savedRun = await context.runRepository.save({
				...run,
				status: "WAITING_HUMAN_INPUT",
				waitingHuman,
				revision: run.revision + 1,
				updatedAt: now,
			});
			const result = requestWaitingHumanInputResultSchema.parse({
				run: toRunDto(savedRun),
				idempotentReplay: false,
			});
			await context.commandJournal.record({
				commandId,
				commandName: "RequestWaitingHumanInput",
				aggregateId: savedRun.id,
				aggregateType: "Run",
				revision: savedRun.revision,
				responseSnapshot: toWaitingHumanResultSnapshot(result, requestHash),
			});
			await context.publishEvents([
				createRunWaitingHumanRequestedEvent({
					runId: savedRun.id,
					taskId: savedRun.taskId,
					agentId: savedRun.agentId,
					organizationId: savedRun.organizationId,
					issueIdentifier: savedRun.issueIdentifier,
					operationId: command.operationId,
					idempotencyKey: command.idempotencyKey,
					runRevision: savedRun.revision,
				}),
			]);
			return result;
		},
	);
}
