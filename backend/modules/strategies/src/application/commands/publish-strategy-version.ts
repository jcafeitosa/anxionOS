import type {
	PublishStrategyVersionCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	assertValidStrategyVersionLifecycleTransition,
	publishStrategyVersionCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createStrategyVersionPublishedEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwStrategiesError } from "../errors";

export interface PublishStrategyVersionDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function publishStrategyVersion(
	deps: PublishStrategyVersionDeps,
	input: PublishStrategyVersionCommand,
): Promise<StrategiesCommandResult> {
	const command = publishStrategyVersionCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return strategiesCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
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
		const fromState = version.lifecycleState;
		const toState = "BACKTESTED" as const;
		try {
			assertValidStrategyVersionLifecycleTransition(fromState, toState);
		} catch {
			throwStrategiesError(
				"ST_INVALID_LIFECYCLE_TRANSITION",
				`Cannot publish version in state ${version.lifecycleState}`,
			);
		}
		const publishedAt = new Date().toISOString();
		const updatedVersion = await ctx.versions.update({
			...version,
			lifecycleState: toState,
			revision: version.revision + 1,
			publishedAt,
		});
		await ctx.strategies.update({
			...strategy,
			revision: strategy.revision + 1,
		});
		await ctx.publishEvents([
			createStrategyVersionPublishedEvent({
				strategyId: updatedVersion.strategyId,
				strategyVersionId: updatedVersion.id,
				organizationId: command.organizationId,
				versionNumber: updatedVersion.versionNumber,
				sourceHash: updatedVersion.sourceHash,
				rulesHash: updatedVersion.rulesHash,
				parametersHash: updatedVersion.parametersHash,
				executionMode: updatedVersion.executionMode,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: updatedVersion.id,
			revision: updatedVersion.revision,
			strategyId: command.strategyId,
			strategyVersionId: updatedVersion.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "publishStrategyVersion",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
