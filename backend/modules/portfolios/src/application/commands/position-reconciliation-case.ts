import type {
	OpenPositionReconciliationCaseCommand,
	PortfoliosCommandResult,
	ResolvePositionReconciliationCaseCommand,
} from "@anxionos/contracts/portfolios";
import {
	openPositionReconciliationCaseCommandSchema,
	portfoliosCommandResultSchema,
	resolvePositionReconciliationCaseCommandSchema,
} from "@anxionos/contracts/portfolios";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPortfoliosError } from "../errors";
import {
	openPositionReconciliationCaseInTransaction,
	resolvePositionReconciliationCaseInTransaction,
} from "../reconciliation-support";

export interface OpenPositionReconciliationCaseDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export interface ResolvePositionReconciliationCaseDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function openPositionReconciliationCase(
	deps: OpenPositionReconciliationCaseDeps,
	input: OpenPositionReconciliationCaseCommand,
): Promise<PortfoliosCommandResult> {
	const command = openPositionReconciliationCaseCommandSchema.parse(input);
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

		const portfolio = await ctx.portfolios.findById(command.portfolioId);
		if (!portfolio) {
			throwPortfoliosError("PF_PORTFOLIO_NOT_FOUND", "portfolio not found");
		}
		if (portfolio.organizationId !== command.organizationId) {
			throwPortfoliosError(
				"PF_CROSS_TENANT",
				"portfolio organization mismatch",
			);
		}

		const reconciliationCase =
			await openPositionReconciliationCaseInTransaction(ctx, {
				organizationId: command.organizationId,
				portfolioId: command.portfolioId,
				caseKind: command.caseKind,
				positionId: command.positionId,
				fillId: command.fillId,
				journalEntryId: command.journalEntryId,
				evidence: command.evidence,
			});

		const result = portfoliosCommandResultSchema.parse({
			aggregateId: reconciliationCase.id,
			revision: 1,
			portfolioId: command.portfolioId,
			reconciliationCaseId: reconciliationCase.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "openPositionReconciliationCase",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}

export async function resolvePositionReconciliationCase(
	deps: ResolvePositionReconciliationCaseDeps,
	input: ResolvePositionReconciliationCaseCommand,
): Promise<PortfoliosCommandResult> {
	const command = resolvePositionReconciliationCaseCommandSchema.parse(input);
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

		const reconciliationCase = await ctx.reconciliationCases.findById(
			command.reconciliationCaseId,
		);
		if (
			!reconciliationCase ||
			reconciliationCase.organizationId !== command.organizationId
		) {
			throwPortfoliosError(
				"PF_RECONCILIATION_NOT_FOUND",
				"reconciliation case not found",
			);
		}

		const resolved = await resolvePositionReconciliationCaseInTransaction(ctx, {
			case: reconciliationCase,
			disposition: command.disposition,
			rationale: command.rationale,
		});

		const result = portfoliosCommandResultSchema.parse({
			aggregateId: resolved.id,
			revision: 2,
			portfolioId: resolved.portfolioId,
			reconciliationCaseId: resolved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "resolvePositionReconciliationCase",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
