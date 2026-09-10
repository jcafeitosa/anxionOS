import { randomUUID } from "node:crypto";
import type {
	RegisterStrategyCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	registerStrategyCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterStrategyDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerStrategy(
	deps: RegisterStrategyDeps,
	input: RegisterStrategyCommand,
): Promise<StrategiesCommandResult> {
	const command = registerStrategyCommandSchema.parse(input);
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
		const existing = await ctx.strategies.findActiveByNaturalKey(
			command.organizationId,
			command.displayName,
		);
		if (existing) {
			const result = strategiesCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: existing.revision,
				strategyId: existing.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerStrategy",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const strategyId = `st_str_${randomUUID()}`;
		const saved = await ctx.strategies.save({
			id: strategyId,
			organizationId: command.organizationId,
			displayName: command.displayName,
			description: command.description ?? null,
			executionMode: command.executionMode,
			status: "ACTIVE",
			revision: 1,
		});
		const result = strategiesCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			strategyId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerStrategy",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
