import { randomUUID } from "node:crypto";
import type {
	ConfirmValuationCommand,
	PortfoliosCommandResult,
} from "@anxionos/contracts/portfolios";
import {
	assertPortfoliosExecutionModeSupported,
	confirmValuationCommandSchema,
	portfoliosCommandResultSchema,
} from "@anxionos/contracts/portfolios";
import { createValuationConfirmedEvent } from "../../domain/events/portfolios-events";
import type { CapitalQueryPort } from "../../domain/ports/capital-query-port";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataQueryPort } from "../../domain/ports/market-data-query-port";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPortfoliosError } from "../errors";

const DEFAULT_VALUATION_VERSION = 1;

export interface ConfirmValuationDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
	marketData: MarketDataQueryPort;
	capitalQuery: CapitalQueryPort;
}

function valuationResultFromRecord(
	record: { id: string; revision: number; portfolioId: string },
	idempotentReplay = false,
): PortfoliosCommandResult {
	return portfoliosCommandResultSchema.parse({
		aggregateId: record.id,
		revision: record.revision,
		portfolioId: record.portfolioId,
		valuationSnapshotId: record.id,
		idempotentReplay,
	});
}

function multiplyDecimal(a: string, b: string): string {
	return String(Number(a) * Number(b));
}

function addDecimal(a: string, b: string): string {
	return String(Number(a) + Number(b));
}

export async function confirmValuation(
	deps: ConfirmValuationDeps,
	input: ConfirmValuationCommand,
): Promise<PortfoliosCommandResult> {
	const command = confirmValuationCommandSchema.parse(input);
	assertPortfoliosExecutionModeSupported(command.executionMode);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	const portfolio = await deps.unitOfWork.runInTransaction(async (ctx) => {
		return ctx.portfolios.findById(command.portfolioId);
	});
	if (!portfolio) {
		throwPortfoliosError("PF_PORTFOLIO_NOT_FOUND", "portfolio not found");
	}
	if (portfolio.organizationId !== command.organizationId) {
		throwPortfoliosError("PF_CROSS_TENANT", "portfolio organization mismatch");
	}
	if (portfolio.status === "CLOSED") {
		throwPortfoliosError("PF_PORTFOLIO_CLOSED", "portfolio is closed");
	}

	const capitalAccount = await deps.capitalQuery.findAccountById(
		command.organizationId,
		portfolio.capitalAccountId,
	);
	if (!capitalAccount) {
		throwPortfoliosError(
			"PF_ALLOCATION_MISMATCH",
			"capital account not found for portfolio",
		);
	}
	if (capitalAccount.ownerUserId !== portfolio.ownerUserId) {
		throwPortfoliosError(
			"PF_ALLOCATION_MISMATCH",
			"capital account owner mismatch",
		);
	}

	const positions = await deps.unitOfWork.runInTransaction(async (ctx) =>
		ctx.positions.findByPortfolioId(command.portfolioId),
	);

	const priceRefs: Array<{
		instrumentId: string;
		observationId: string;
		asOf: string;
		qualityFlag: string;
		price: string;
	}> = [];
	const fxRefs: Array<{
		pair: string;
		observationId: string;
		asOf: string;
		rate: string;
	}> = [];
	const qualityFlags: string[] = [];

	let markedPositions = "0";
	for (const position of positions) {
		if (Number(position.quantity) === 0) continue;
		if (position.positionSide === "CASH") continue;
		const priceRef = await deps.marketData.getPriceAsOf({
			organizationId: command.organizationId,
			instrumentId: position.instrumentId,
			asOf: command.asOf,
			maxStalenessMs: command.maxStalenessMs,
		});
		priceRefs.push({
			instrumentId: position.instrumentId,
			observationId: priceRef.observationId,
			asOf: priceRef.eventTime,
			qualityFlag: priceRef.qualityFlag,
			price: priceRef.price,
		});

		const fxRef = await deps.marketData.getFxAsOf({
			baseCurrency: command.quoteCurrency,
			quoteCurrency: portfolio.baseCurrency,
			asOf: command.asOf,
			maxStalenessMs: command.maxStalenessMs,
		});
		const pair = `${fxRef.baseCurrency}/${fxRef.quoteCurrency}`;
		if (!fxRefs.some((ref) => ref.pair === pair)) {
			fxRefs.push({
				pair,
				observationId: fxRef.observationId,
				asOf: fxRef.asOf,
				rate: fxRef.rate,
			});
		}

		const positionValue = multiplyDecimal(position.quantity, priceRef.price);
		const converted = multiplyDecimal(positionValue, fxRef.rate);
		markedPositions = addDecimal(markedPositions, converted);
	}

	const navBase = markedPositions;

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}

		const existing = await ctx.valuationSnapshots.findByPortfolioAsOf(
			command.portfolioId,
			command.asOf,
			DEFAULT_VALUATION_VERSION,
		);
		if (existing) {
			const result = valuationResultFromRecord(existing, true);
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "confirmValuation",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}

		const snapshotId = `pf_val_${randomUUID()}`;
		const saved = await ctx.valuationSnapshots.save({
			id: snapshotId,
			organizationId: command.organizationId,
			portfolioId: command.portfolioId,
			asOf: command.asOf,
			valuationVersion: DEFAULT_VALUATION_VERSION,
			status: "CONFIRMED",
			priceRefsJson: priceRefs,
			fxRefsJson: fxRefs,
			navBase,
			navComponentsJson: {
				cash: "0",
				markedPositions,
				liabilities: "0",
			},
			qualityFlagsJson: qualityFlags,
			revision: 1,
		});

		await ctx.publishEvents([
			createValuationConfirmedEvent({
				snapshotId: saved.id,
				portfolioId: saved.portfolioId,
				organizationId: saved.organizationId,
				asOf: saved.asOf,
				valuationVersion: saved.valuationVersion,
				navBase: saved.navBase,
				baseCurrency: portfolio.baseCurrency,
				qualityFlags,
			}),
		]);

		const result = valuationResultFromRecord(saved);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "confirmValuation",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
