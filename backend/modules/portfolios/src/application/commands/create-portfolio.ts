import { randomUUID } from "node:crypto";
import type {
	CreatePortfolioCommand,
	PortfoliosCommandResult,
} from "@anxionos/contracts/portfolios";
import {
	assertPortfoliosExecutionModeSupported,
	createPortfolioCommandSchema,
	portfoliosCommandResultSchema,
} from "@anxionos/contracts/portfolios";
import { createPortfolioCreatedEvent } from "../../domain/events/portfolios-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";

export interface CreatePortfolioDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function createPortfolio(
	deps: CreatePortfolioDeps,
	input: CreatePortfolioCommand,
): Promise<PortfoliosCommandResult> {
	const command = createPortfolioCommandSchema.parse(input);
	assertPortfoliosExecutionModeSupported(command.executionMode);
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
		const portfolioId = `pf_prt_${randomUUID()}`;
		const saved = await ctx.portfolios.save({
			id: portfolioId,
			organizationId: command.organizationId,
			ownerUserId: command.ownerUserId,
			capitalAccountId: command.capitalAccountId,
			name: command.name,
			baseCurrency: command.baseCurrency,
			executionMode: command.executionMode,
			status: "ACTIVE",
			revision: 1,
		});
		await ctx.publishEvents([
			createPortfolioCreatedEvent({
				portfolioId: saved.id,
				organizationId: saved.organizationId,
				ownerUserId: saved.ownerUserId,
				capitalAccountId: saved.capitalAccountId,
				name: saved.name,
				baseCurrency: saved.baseCurrency,
				executionMode: saved.executionMode,
			}),
		]);
		const result = portfoliosCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			portfolioId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createPortfolio",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
