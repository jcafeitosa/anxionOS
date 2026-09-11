import { randomUUID } from "node:crypto";
import type {
	PortfoliosCommandResult,
	ReconcileCashFromLedgerCommand,
} from "@anxionos/contracts/portfolios";
import {
	cashInstrumentId,
	portfoliosCommandResultSchema,
	reconcileCashFromLedgerCommandSchema,
} from "@anxionos/contracts/portfolios";
import { createCashReconciledEvent } from "../../domain/events/portfolios-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type {
	PortfoliosTransactionContext,
	PortfoliosUnitOfWork,
	PositionRecord,
} from "../../domain/ports/portfolios-unit-of-work";
import { extractCashDeltaFromLedgerLines } from "../cash-reconcile-support";
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

export interface ReconcileCashFromLedgerDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

const DEFAULT_BOOK = "TRADING";
const CASH_SIDE = "CASH";

async function ensureCashPosition(
	ctx: PortfoliosTransactionContext,
	input: {
		portfolioId: string;
		organizationId: string;
		baseCurrency: string;
	},
): Promise<PositionRecord> {
	const instrumentId = cashInstrumentId(input.baseCurrency);
	let position = await ctx.positions.findByPositionKey(
		input.portfolioId,
		instrumentId,
		CASH_SIDE,
		DEFAULT_BOOK,
	);
	if (position) return position;

	const positionId = `pf_pos_${randomUUID()}`;
	try {
		position = await ctx.positions.save({
			id: positionId,
			portfolioId: input.portfolioId,
			organizationId: input.organizationId,
			instrumentId,
			positionSide: CASH_SIDE,
			book: DEFAULT_BOOK,
			quantity: "0",
			revision: 0,
		});
	} catch {
		position = await ctx.positions.findByPositionKey(
			input.portfolioId,
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

function reconcileResult(input: {
	position: PositionRecord;
	portfolioId: string;
	journalEntryId: string;
	reconciliationCaseId?: string;
	idempotentReplay?: boolean;
}): PortfoliosCommandResult {
	return portfoliosCommandResultSchema.parse({
		aggregateId: input.position.id,
		revision: input.position.revision,
		portfolioId: input.portfolioId,
		positionId: input.position.id,
		cashPositionId: input.position.id,
		reconciliationCaseId: input.reconciliationCaseId,
		idempotentReplay: input.idempotentReplay,
	});
}

export async function reconcileCashFromLedger(
	deps: ReconcileCashFromLedgerDeps,
	input: ReconcileCashFromLedgerCommand,
): Promise<PortfoliosCommandResult> {
	const command = reconcileCashFromLedgerCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	if (!command.portfolioId) {
		throwPortfoliosError(
			"PF_LEDGER_PORTFOLIO_REQUIRED",
			"portfolioId required for cash reconcile",
		);
	}

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}

		const existingLedger = await ctx.ledgerApplications.findByJournalEntryId(
			command.organizationId,
			command.journalEntryId,
		);
		if (existingLedger) {
			const cashPosition = await ctx.positions.findByPositionKey(
				existingLedger.portfolioId,
				cashInstrumentId(
					(await ctx.portfolios.findById(existingLedger.portfolioId))
						?.baseCurrency ?? "USD",
				),
				CASH_SIDE,
				DEFAULT_BOOK,
			);
			const result = reconcileResult({
				position: cashPosition ?? {
					id: existingLedger.id,
					portfolioId: existingLedger.portfolioId,
					organizationId: existingLedger.organizationId,
					instrumentId: cashInstrumentId(existingLedger.asset),
					positionSide: CASH_SIDE,
					book: DEFAULT_BOOK,
					quantity: "0",
					revision: 0,
				},
				portfolioId: existingLedger.portfolioId,
				journalEntryId: command.journalEntryId,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "reconcileCashFromLedger",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}

		if (!command.portfolioId) {
			throwPortfoliosError(
				"PF_PORTFOLIO_NOT_FOUND",
				"portfolioId required when ledger entry is not yet applied",
			);
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

		const cashDelta = extractCashDeltaFromLedgerLines(
			command.linesSummary,
			portfolio.baseCurrency,
		);
		const cashPosition = await ensureCashPosition(ctx, {
			portfolioId: portfolio.id,
			organizationId: portfolio.organizationId,
			baseCurrency: portfolio.baseCurrency,
		});

		let updatedPosition = cashPosition;
		let provisionalSettled = false;
		let skipCashUpdate = false;
		let reconciliationCaseId: string | undefined;

		if (command.fillId) {
			const provisional = await ctx.provisionalCash.findByFillId(
				command.organizationId,
				command.fillId,
			);
			if (provisional && !provisional.settled) {
				if (provisional.cashDelta !== cashDelta) {
					const opened = await openPositionReconciliationCaseInTransaction(
						ctx,
						{
							organizationId: command.organizationId,
							portfolioId: portfolio.id,
							caseKind: "POSITION_VS_LEDGER",
							positionId: cashPosition.id,
							fillId: command.fillId,
							journalEntryId: command.journalEntryId,
							evidence: `ledger cash delta ${cashDelta} != provisional ${provisional.cashDelta}`,
						},
					);
					reconciliationCaseId = opened.id;
					// Provisional cash already applied on fill; do not layer ledger delta until resolved.
					skipCashUpdate = true;
				} else {
					await ctx.provisionalCash.markSettled(
						provisional.id,
						command.journalEntryId,
					);
					provisionalSettled = true;
					const openCase = await ctx.reconciliationCases.findOpenByFillId(
						command.organizationId,
						command.fillId,
						"POSITION_VS_LEDGER",
					);
					if (openCase) {
						const resolved =
							await resolvePositionReconciliationCaseInTransaction(ctx, {
								case: openCase,
								disposition: "LEDGER_CATCH_UP",
								rationale: `ledger entry ${command.journalEntryId} matched provisional cash`,
							});
						reconciliationCaseId = resolved.id;
					}
				}
			}
		}

		if (!provisionalSettled && !skipCashUpdate) {
			updatedPosition = await ctx.positions.updateQuantity(
				cashPosition.id,
				cashDelta,
				cashPosition.revision + 1,
			);
		}

		await ctx.ledgerApplications.save({
			id: `pf_ledger_${randomUUID()}`,
			organizationId: command.organizationId,
			portfolioId: portfolio.id,
			journalEntryId: command.journalEntryId,
			cashDelta,
			asset: portfolio.baseCurrency,
			fillId: command.fillId ?? null,
		});

		await ctx.publishEvents([
			createCashReconciledEvent({
				portfolioId: portfolio.id,
				organizationId: command.organizationId,
				positionId: updatedPosition.id,
				journalEntryId: command.journalEntryId,
				cashDelta,
				asset: portfolio.baseCurrency,
				fillId: command.fillId,
				provisionalSettled,
			}),
		]);

		const result = reconcileResult({
			position: updatedPosition,
			portfolioId: portfolio.id,
			journalEntryId: command.journalEntryId,
			reconciliationCaseId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "reconcileCashFromLedger",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
