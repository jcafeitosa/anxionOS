import type {
	AccountingCommandResult,
	PostTradeFillCommand,
} from "@anxionos/contracts/accounting";
import {
	assertAccountingExecutionModeSupported,
	postTradeFillCommandSchema,
} from "@anxionos/contracts/accounting";
import type { AccountingUnitOfWork } from "../../domain/ports/accounting-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import { postLedgerEntry } from "./post-ledger-entry";

export interface PostTradeFillDeps {
	unitOfWork: AccountingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function buildTradeFillLines(command: PostTradeFillCommand) {
	const amount = command.notionalAmount;
	const zero = "0";
	const tradeLines =
		command.side === "BUY"
			? [
					{
						accountCode: "trading.cash",
						debit: amount,
						credit: zero,
						asset: command.asset,
						amount,
					},
					{
						accountCode: "trading.clearing",
						debit: zero,
						credit: amount,
						asset: command.asset,
						amount,
					},
				]
			: [
					{
						accountCode: "trading.clearing",
						debit: amount,
						credit: zero,
						asset: command.asset,
						amount,
					},
					{
						accountCode: "trading.cash",
						debit: zero,
						credit: amount,
						asset: command.asset,
						amount,
					},
				];
	if (!command.feeAmount) {
		return tradeLines;
	}
	const feeAsset = command.feeAsset ?? command.asset;
	return [
		...tradeLines,
		{
			accountCode: "trading.fees",
			debit: command.feeAmount,
			credit: zero,
			asset: feeAsset,
			amount: command.feeAmount,
		},
		{
			accountCode: "trading.cash",
			debit: zero,
			credit: command.feeAmount,
			asset: feeAsset,
			amount: command.feeAmount,
		},
	];
}
export async function postTradeFill(
	deps: PostTradeFillDeps,
	input: PostTradeFillCommand,
): Promise<AccountingCommandResult> {
	const command = postTradeFillCommandSchema.parse(input);
	assertAccountingExecutionModeSupported(command.executionMode);
	const ledgerDeps = {
		unitOfWork: deps.unitOfWork,
		commandJournal: deps.commandJournal,
	};
	return postLedgerEntry(ledgerDeps, {
		commandId: command.commandId,
		organizationId: command.organizationId,
		idempotencyKey: command.idempotencyKey,
		entryKind: "TRADE_FILL",
		executionMode: command.executionMode,
		lines: buildTradeFillLines(command),
		valueDate: command.valueDate,
		capitalAccountId: command.capitalAccountId,
		portfolioId: command.portfolioId,
		sourceRef: {
			ownerDomain: "execution",
			aggregateId: command.fillId,
			eventId: command.commandId,
		},
	});
}
