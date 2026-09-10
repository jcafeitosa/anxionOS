import { randomUUID } from "node:crypto";
import type {
	PerformanceCommandResult,
	RecordOutcomeSnapshotCommand,
} from "@anxionos/contracts/performance";
import {
	performanceCommandResultSchema,
	recordOutcomeSnapshotCommandSchema,
} from "@anxionos/contracts/performance";
import { createOutcomeRecordedEvent } from "../../domain/events/performance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PerformanceUnitOfWork } from "../../domain/ports/performance-unit-of-work";
import {
	loadIdempotentByJournalEntryId,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPerformanceError } from "../errors";

export interface RecordOutcomeSnapshotDeps {
	unitOfWork: PerformanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordOutcomeSnapshot(
	deps: RecordOutcomeSnapshotDeps,
	input: RecordOutcomeSnapshotCommand,
): Promise<PerformanceCommandResult> {
	const command = recordOutcomeSnapshotCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwPerformanceError(
			"PERF_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replayByCommand = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replayByCommand) return replayByCommand;
	const existingByEntry = await deps.commandJournal.findByJournalEntryId(
		command.journalEntryId,
	);
	if (
		existingByEntry &&
		existingByEntry.organizationId !== command.organizationId
	) {
		throwPerformanceError(
			"PERF_CROSS_TENANT",
			"journal entry organization mismatch",
		);
	}
	const replayByEntry = await loadIdempotentByJournalEntryId(
		deps.commandJournal,
		command.journalEntryId,
	);
	if (replayByEntry) return replayByEntry;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			if (racedByCommand.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByCommand.responseSnapshot,
			);
			return performanceCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const racedByEntry = await ctx.commandJournal.findByJournalEntryId(
			command.journalEntryId,
		);
		if (racedByEntry) {
			if (racedByEntry.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"journal entry organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(racedByEntry.responseSnapshot);
			return performanceCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const existingSnapshot = await ctx.outcomeSnapshots.findByJournalEntryId(
			command.journalEntryId,
		);
		if (existingSnapshot) {
			if (existingSnapshot.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"outcome snapshot organization mismatch",
				);
			}
			const result = performanceCommandResultSchema.parse({
				aggregateId: existingSnapshot.id,
				revision: 1,
				outcomeSnapshotId: existingSnapshot.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "recordOutcomeSnapshot",
				journalEntryId: command.journalEntryId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const snapshotId = `perf_out_${randomUUID()}`;
		const recordedAt = new Date().toISOString();
		const saved = await ctx.outcomeSnapshots.save({
			id: snapshotId,
			organizationId: command.organizationId,
			journalEntryId: command.journalEntryId,
			valueDate: command.valueDate,
			linesSummary: command.linesSummary,
			recordedAt,
		});
		await ctx.publishEvents([
			createOutcomeRecordedEvent({
				outcomeSnapshotId: saved.id,
				organizationId: saved.organizationId,
				journalEntryId: saved.journalEntryId,
				valueDate: saved.valueDate,
				linesSummary: saved.linesSummary,
				recordedAt,
			}),
		]);
		const result = performanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			outcomeSnapshotId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordOutcomeSnapshot",
			journalEntryId: command.journalEntryId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
