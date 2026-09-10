import { randomUUID } from "node:crypto";
import type {
	ApplyFillToPositionCommand,
	PortfoliosCommandResult,
} from "@anxionos/contracts/portfolios";
import {
	applyFillToPositionCommandSchema,
	assertPortfoliosExecutionModeSupported,
	portfoliosCommandResultSchema,
} from "@anxionos/contracts/portfolios";
import { createPositionUpdatedEvent } from "../../domain/events/portfolios-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPortfoliosError } from "../errors";

export interface ApplyFillToPositionDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

const DEFAULT_POSITION_SIDE = "LONG";
const DEFAULT_BOOK = "TRADING";
function signedDelta(side: "BUY" | "SELL", quantity: string): string {
	return side === "BUY" ? quantity : `-${quantity}`;
}
function positionResultFromRecord(
	record: { id: string; revision: number; portfolioId: string },
	holdingId: string,
	idempotentReplay = false,
) {
	return portfoliosCommandResultSchema.parse({
		aggregateId: record.id,
		revision: record.revision,
		portfolioId: record.portfolioId,
		positionId: record.id,
		holdingId,
		idempotentReplay,
	});
}
export async function applyFillToPosition(
	deps: ApplyFillToPositionDeps,
	input: ApplyFillToPositionCommand,
): Promise<PortfoliosCommandResult> {
	const command = applyFillToPositionCommandSchema.parse(input);
	assertPortfoliosExecutionModeSupported(command.executionMode);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwPortfoliosError(
			"PF_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return portfoliosCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
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
		if (portfolio.status === "CLOSED") {
			throwPortfoliosError("PF_PORTFOLIO_CLOSED", "portfolio is closed");
		}
		const existingHolding = await ctx.holdings.findByFillId(
			command.organizationId,
			command.fillId,
		);
		if (existingHolding) {
			const position = await ctx.positions.findByPositionKey(
				command.portfolioId,
				command.instrumentId,
				DEFAULT_POSITION_SIDE,
				DEFAULT_BOOK,
			);
			if (!position) {
				throwPortfoliosError(
					"PF_PORTFOLIO_NOT_FOUND",
					"position missing for idempotent fill",
				);
			}
			const result = positionResultFromRecord(
				position,
				existingHolding.id,
				true,
			);
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "applyFillToPosition",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		let position = await ctx.positions.findByPositionKey(
			command.portfolioId,
			command.instrumentId,
			DEFAULT_POSITION_SIDE,
			DEFAULT_BOOK,
		);
		if (!position) {
			const positionId = `pf_pos_${randomUUID()}`;
			try {
				position = await ctx.positions.save({
					id: positionId,
					portfolioId: command.portfolioId,
					organizationId: command.organizationId,
					instrumentId: command.instrumentId,
					positionSide: DEFAULT_POSITION_SIDE,
					book: DEFAULT_BOOK,
					quantity: "0",
					revision: 0,
				});
			} catch {
				position = await ctx.positions.findByPositionKey(
					command.portfolioId,
					command.instrumentId,
					DEFAULT_POSITION_SIDE,
					DEFAULT_BOOK,
				);
				if (!position) {
					throwPortfoliosError(
						"PF_DUPLICATE_POSITION_KEY",
						"position key conflict",
					);
				}
			}
		}
		const delta = signedDelta(command.side, command.quantity);
		const updatedPosition = await ctx.positions.updateQuantity(
			position.id,
			delta,
			position.revision + 1,
		);
		const holdingId = `pf_hld_${randomUUID()}`;
		const holding = await ctx.holdings.save({
			id: holdingId,
			positionId: updatedPosition.id,
			organizationId: command.organizationId,
			fillId: command.fillId,
			quantity: command.quantity,
			price: command.price,
			revision: 1,
		});
		await ctx.publishEvents([
			createPositionUpdatedEvent({
				portfolioId: command.portfolioId,
				positionId: updatedPosition.id,
				organizationId: command.organizationId,
				instrumentId: command.instrumentId,
				positionSide: DEFAULT_POSITION_SIDE,
				book: DEFAULT_BOOK,
				quantity: updatedPosition.quantity,
				revision: updatedPosition.revision,
				fillId: command.fillId,
				side: command.side,
			}),
		]);
		const result = positionResultFromRecord(updatedPosition, holding.id);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "applyFillToPosition",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
