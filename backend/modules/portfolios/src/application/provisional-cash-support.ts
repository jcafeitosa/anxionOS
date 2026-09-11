import { randomUUID } from "node:crypto";
import { cashInstrumentId } from "@anxionos/contracts/portfolios";
import { createPositionUpdatedEvent } from "../domain/events/portfolios-events";
import type {
	PortfolioRecord,
	PortfoliosTransactionContext,
	PositionRecord,
} from "../domain/ports/portfolios-unit-of-work";
import { computeProvisionalCashDelta } from "./cash-reconcile-support";
import { throwPortfoliosError } from "./errors";
import { openPositionReconciliationCaseInTransaction } from "./reconciliation-support";

const DEFAULT_BOOK = "TRADING";
const CASH_SIDE = "CASH";

async function ensureCashPosition(
	ctx: PortfoliosTransactionContext,
	portfolio: PortfolioRecord,
): Promise<PositionRecord> {
	const instrumentId = cashInstrumentId(portfolio.baseCurrency);
	let position = await ctx.positions.findByPositionKey(
		portfolio.id,
		instrumentId,
		CASH_SIDE,
		DEFAULT_BOOK,
	);
	if (position) return position;

	const positionId = `pf_pos_${randomUUID()}`;
	try {
		position = await ctx.positions.save({
			id: positionId,
			portfolioId: portfolio.id,
			organizationId: portfolio.organizationId,
			instrumentId,
			positionSide: CASH_SIDE,
			book: DEFAULT_BOOK,
			quantity: "0",
			revision: 0,
		});
	} catch {
		position = await ctx.positions.findByPositionKey(
			portfolio.id,
			instrumentId,
			CASH_SIDE,
			DEFAULT_BOOK,
		);
		if (!position) {
			throwPortfoliosError(
				"PF_DUPLICATE_POSITION_KEY",
				"cash position key conflict",
			);
		}
	}
	return position;
}

export async function applyProvisionalCashForFill(
	ctx: PortfoliosTransactionContext,
	input: {
		portfolio: PortfolioRecord;
		fillId: string;
		side: "BUY" | "SELL";
		quantity: string;
		price: string;
	},
): Promise<{
	cashPosition: PositionRecord;
	reconciliationCaseId: string;
}> {
	const cashDelta = computeProvisionalCashDelta({
		side: input.side,
		quantity: input.quantity,
		price: input.price,
	});
	const cashPosition = await ensureCashPosition(ctx, input.portfolio);
	const updatedCashPosition = await ctx.positions.updateQuantity(
		cashPosition.id,
		cashDelta,
		cashPosition.revision + 1,
	);

	await ctx.provisionalCash.save({
		id: `pf_prov_${randomUUID()}`,
		organizationId: input.portfolio.organizationId,
		portfolioId: input.portfolio.id,
		fillId: input.fillId,
		cashDelta,
		asset: input.portfolio.baseCurrency,
		settled: false,
		journalEntryId: null,
	});

	const reconciliationCase = await openPositionReconciliationCaseInTransaction(
		ctx,
		{
			organizationId: input.portfolio.organizationId,
			portfolioId: input.portfolio.id,
			caseKind: "POSITION_VS_LEDGER",
			positionId: updatedCashPosition.id,
			fillId: input.fillId,
			evidence: "ledger not yet posted for fill",
		},
	);

	await ctx.publishEvents([
		createPositionUpdatedEvent({
			portfolioId: input.portfolio.id,
			positionId: updatedCashPosition.id,
			organizationId: input.portfolio.organizationId,
			instrumentId: cashInstrumentId(input.portfolio.baseCurrency),
			positionSide: CASH_SIDE,
			book: DEFAULT_BOOK,
			quantity: updatedCashPosition.quantity,
			revision: updatedCashPosition.revision,
			fillId: input.fillId,
			side: input.side,
			provisionalCash: true,
		}),
	]);

	return {
		cashPosition: updatedCashPosition,
		reconciliationCaseId: reconciliationCase.id,
	};
}
