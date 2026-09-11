import { randomUUID } from "node:crypto";
import {
	type EvaluationCommandResult,
	mapOutcomeRecordedToEvaluationInput,
	type PerformanceOutcomeRecordedBridge,
} from "@anxionos/contracts/evaluation";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { EvaluationUnitOfWork } from "../../domain/ports/evaluation-unit-of-work";
import { recordEvaluationScore } from "../commands/record-evaluation-score";

export interface OutcomeRecordedConsumerDeps {
	unitOfWork: EvaluationUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createOutcomeRecordedConsumer(
	deps: OutcomeRecordedConsumerDeps,
): {
	handle(
		outcome: PerformanceOutcomeRecordedBridge,
	): Promise<EvaluationCommandResult>;
} {
	return {
		async handle(outcome: PerformanceOutcomeRecordedBridge) {
			const command = mapOutcomeRecordedToEvaluationInput(
				outcome,
				randomUUID(),
			);
			return recordEvaluationScore(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				{
					commandId: command.commandId,
					organizationId: command.organizationId,
					outcomeSnapshotId: command.outcomeSnapshotId,
					valueDate: command.valueDate,
					linesSummary: command.linesSummary,
				},
			);
		},
	};
}
