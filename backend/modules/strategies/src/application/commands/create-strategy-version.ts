import { randomUUID } from "node:crypto";
import type {
	CreateStrategyVersionCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	createStrategyVersionCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

export interface CreateStrategyVersionDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function createStrategyVersion(
	deps: CreateStrategyVersionDeps,
	input: CreateStrategyVersionCommand,
): Promise<StrategiesCommandResult> {
	const command = createStrategyVersionCommandSchema.parse(input);
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
		const versionCount = await ctx.versions.countByStrategy(command.strategyId);
		const versionId = `st_ver_${randomUUID()}`;
		const saved = await ctx.versions.save({
			id: versionId,
			strategyId: command.strategyId,
			organizationId: command.organizationId,
			versionNumber: versionCount + 1,
			sourceHash: command.sourceHash,
			rulesHash: command.rulesHash,
			parametersHash: command.parametersHash,
			lifecycleState: "DRAFT",
			executionMode: command.executionMode,
			revision: 1,
			publishedAt: null,
		});
		const result = strategiesCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			strategyId: command.strategyId,
			strategyVersionId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createStrategyVersion",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
