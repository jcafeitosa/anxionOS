import type {
	CompleteBacktestCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	assertValidStrategyVersionLifecycleTransition,
	completeBacktestCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createBacktestCompletedEvent } from "../../domain/events/strategies-events";
import type { BacktestRunnerPort } from "../../domain/ports/backtest-runner-port";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

export interface CompleteBacktestDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
	backtestRunner: BacktestRunnerPort;
}

export async function completeBacktest(
	deps: CompleteBacktestDeps,
	input: CompleteBacktestCommand,
): Promise<StrategiesCommandResult> {
	const command = completeBacktestCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}
		const run = await ctx.backtestRuns.findById(
			command.backtestRunId,
			command.organizationId,
		);
		if (!run) {
			throwStrategiesError(
				"ST_BACKTEST_NOT_FOUND",
				`Backtest run ${command.backtestRunId} not found`,
			);
		}
		if (run.status === "COMPLETED" || run.status === "FAILED") {
			throwStrategiesError(
				"ST_BACKTEST_ALREADY_FINALIZED",
				`Backtest run ${command.backtestRunId} is already ${run.status}`,
			);
		}
		await ctx.backtestRuns.update({
			...run,
			status: "RUNNING",
		});
		const runnerResult = await deps.backtestRunner.run({
			backtestRunId: run.id,
			organizationId: run.organizationId,
			strategyId: run.strategyId,
			strategyVersionId: run.strategyVersionId,
			datasetId: run.datasetId,
			datasetRevision: run.datasetRevision,
			seed: run.seed,
		});
		const finalStatus =
			runnerResult.status === "COMPLETED" ? "COMPLETED" : "FAILED";
		const updatedRun = await ctx.backtestRuns.update({
			...run,
			status: finalStatus,
			resultRef: runnerResult.resultRef,
			metricsHash: runnerResult.metricsHash,
		});
		let versionRevision = 1;
		if (finalStatus === "COMPLETED") {
			const version = await ctx.versions.findById(
				run.strategyVersionId,
				command.organizationId,
			);
			if (!version) {
				throwStrategiesError(
					"ST_VERSION_NOT_FOUND",
					`Strategy version ${run.strategyVersionId} not found`,
				);
			}
			if (version.lifecycleState === "DRAFT") {
				assertValidStrategyVersionLifecycleTransition(
					version.lifecycleState,
					"BACKTESTED",
				);
				const promoted = await ctx.versions.update({
					...version,
					lifecycleState: "BACKTESTED",
					revision: version.revision + 1,
				});
				versionRevision = promoted.revision;
			} else {
				versionRevision = version.revision;
			}
		} else {
			const version = await ctx.versions.findById(
				run.strategyVersionId,
				command.organizationId,
			);
			versionRevision = version?.revision ?? 1;
		}
		await ctx.publishEvents([
			createBacktestCompletedEvent({
				backtestRequestId: updatedRun.id,
				organizationId: updatedRun.organizationId,
				strategyId: updatedRun.strategyId,
				strategyVersionId: updatedRun.strategyVersionId,
				resultRef: updatedRun.resultRef,
				metricsHash: updatedRun.metricsHash,
				status: finalStatus,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: updatedRun.id,
			revision: versionRevision,
			strategyId: updatedRun.strategyId,
			strategyVersionId: updatedRun.strategyVersionId,
			backtestRunId: updatedRun.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "completeBacktest",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
