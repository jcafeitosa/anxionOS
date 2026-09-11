import { randomUUID } from "node:crypto";
import type {
	RegisterStrategyCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	registerStrategyCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createStrategyRegisteredEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";

export interface RegisterStrategyDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerStrategy(
	deps: RegisterStrategyDeps,
	input: RegisterStrategyCommand,
): Promise<StrategiesCommandResult> {
	const command = registerStrategyCommandSchema.parse(input);
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
		await ctx.publishEvents([
			createStrategyRegisteredEvent({
				strategyId: saved.id,
				organizationId: saved.organizationId,
				revision: saved.revision,
			}),
		]);
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
