import { randomUUID } from "node:crypto";
import type {
	RequestBacktestCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	requestBacktestCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createBacktestRequestedEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

export interface RequestBacktestDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function requestBacktest(
	deps: RequestBacktestDeps,
	input: RequestBacktestCommand,
): Promise<StrategiesCommandResult> {
	const command = requestBacktestCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}
		const strategy = await ctx.strategies.findById(
			command.strategyId,
			command.organizationId,
		);
		if (!strategy) {
			throwStrategiesError(
				"ST_STRATEGY_NOT_FOUND",
				`Strategy ${command.strategyId} not found`,
			);
		}
		const version = await ctx.versions.findById(
			command.strategyVersionId,
			command.organizationId,
		);
		if (!version || version.strategyId !== command.strategyId) {
			throwStrategiesError(
				"ST_VERSION_NOT_FOUND",
				`Strategy version ${command.strategyVersionId} not found`,
			);
		}
		if (version.lifecycleState !== "DRAFT") {
			throwStrategiesError(
				"ST_INVALID_LIFECYCLE_TRANSITION",
				`Backtest requires DRAFT lifecycle, got ${version.lifecycleState}`,
			);
		}
		const backtestRunId = `st_btr_${randomUUID()}`;
		const requestedAt = new Date().toISOString();
		await ctx.backtestRuns.save({
			id: backtestRunId,
			organizationId: command.organizationId,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			datasetId: command.datasetId,
			datasetRevision: command.datasetRevision,
			seed: command.seed,
			status: "REQUESTED",
			resultRef: null,
			metricsHash: null,
		});
		await ctx.publishEvents([
			createBacktestRequestedEvent({
				backtestRequestId: backtestRunId,
				organizationId: command.organizationId,
				strategyId: command.strategyId,
				strategyVersionId: command.strategyVersionId,
				datasetId: command.datasetId,
				datasetRevision: command.datasetRevision,
				seed: command.seed,
				executionMode: version.executionMode,
				requestedAt,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: backtestRunId,
			revision: 1,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			backtestRunId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "requestBacktest",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
