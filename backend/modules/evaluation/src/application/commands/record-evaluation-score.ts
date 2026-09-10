import { randomUUID } from "node:crypto";
import type {
	EvaluationCommandResult,
	RecordEvaluationScoreCommand,
} from "@anxionos/contracts/evaluation";
import {
	computeOutcomeNotionalScore,
	evaluationCommandResultSchema,
	recordEvaluationScoreCommandSchema,
} from "@anxionos/contracts/evaluation";
import { createScoreComputedEvent } from "../../domain/events/evaluation-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { EvaluationUnitOfWork } from "../../domain/ports/evaluation-unit-of-work";
import {
	loadIdempotentByOutcomeSnapshotId,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwEvaluationError } from "../errors";

export interface RecordEvaluationScoreDeps {
	unitOfWork: EvaluationUnitOfWork;
	commandJournal: CommandJournalRepository;
}

const OUTCOME_NOTIONAL_METRIC = "outcome_notional";
export async function recordEvaluationScore(
	deps: RecordEvaluationScoreDeps,
	input: RecordEvaluationScoreCommand,
): Promise<EvaluationCommandResult> {
	const command = recordEvaluationScoreCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replayByCommand = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replayByCommand) return replayByCommand;
	const existingByOutcome = await deps.commandJournal.findByOutcomeSnapshotId(
		command.outcomeSnapshotId,
	);
	if (
		existingByOutcome &&
		existingByOutcome.organizationId !== command.organizationId
	) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"outcome snapshot organization mismatch",
		);
	}
	const replayByOutcome = await loadIdempotentByOutcomeSnapshotId(
		deps.commandJournal,
		command.outcomeSnapshotId,
	);
	if (replayByOutcome) return replayByOutcome;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			if (racedByCommand.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByCommand.responseSnapshot,
			);
			return evaluationCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const racedByOutcome = await ctx.commandJournal.findByOutcomeSnapshotId(
			command.outcomeSnapshotId,
		);
		if (racedByOutcome) {
			if (racedByOutcome.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"outcome snapshot organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByOutcome.responseSnapshot,
			);
			return evaluationCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const existingRecord = await ctx.evaluationRecords.findByOutcomeSnapshotId(
			command.outcomeSnapshotId,
		);
		if (existingRecord) {
			if (existingRecord.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"evaluation record organization mismatch",
				);
			}
			const existingScore = await ctx.evaluationScores.findByEvaluationRecordId(
				existingRecord.id,
			);
			const result = evaluationCommandResultSchema.parse({
				aggregateId: existingRecord.id,
				revision: 1,
				evaluationRecordId: existingRecord.id,
				evaluationScoreId: existingScore?.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "recordEvaluationScore",
				outcomeSnapshotId: command.outcomeSnapshotId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const recordId = `evl_rec_${randomUUID()}`;
		const scoreId = `evl_scr_${randomUUID()}`;
		const computedAt = new Date().toISOString();
		const scoreValue = computeOutcomeNotionalScore(command.linesSummary);
		const savedRecord = await ctx.evaluationRecords.save({
			id: recordId,
			organizationId: command.organizationId,
			outcomeSnapshotId: command.outcomeSnapshotId,
			valueDate: command.valueDate,
			computedAt,
		});
		const savedScore = await ctx.evaluationScores.save({
			id: scoreId,
			organizationId: command.organizationId,
			evaluationRecordId: savedRecord.id,
			scoreMetric: OUTCOME_NOTIONAL_METRIC,
			scoreValue,
			computedAt,
		});
		await ctx.publishEvents([
			createScoreComputedEvent({
				evaluationRecordId: savedRecord.id,
				evaluationScoreId: savedScore.id,
				organizationId: savedRecord.organizationId,
				outcomeSnapshotId: savedRecord.outcomeSnapshotId,
				scoreMetric: savedScore.scoreMetric,
				scoreValue: savedScore.scoreValue,
				computedAt,
			}),
		]);
		const result = evaluationCommandResultSchema.parse({
			aggregateId: savedRecord.id,
			revision: 1,
			evaluationRecordId: savedRecord.id,
			evaluationScoreId: savedScore.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordEvaluationScore",
			outcomeSnapshotId: command.outcomeSnapshotId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
