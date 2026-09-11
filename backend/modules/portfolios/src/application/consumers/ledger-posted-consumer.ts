import { randomUUID } from "node:crypto";
import {
	type AccountingLedgerPostedBridge,
	type PortfoliosCommandResult,
	mapLedgerPostedToReconcileCashInput,
} from "@anxionos/contracts/portfolios";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import { reconcileCashFromLedger } from "../commands/reconcile-cash-from-ledger";

export interface LedgerPostedConsumerDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createLedgerPostedConsumer(deps: LedgerPostedConsumerDeps): {
	handle(
		ledger: AccountingLedgerPostedBridge,
		fillId?: string,
	): Promise<PortfoliosCommandResult>;
} {
	return {
		async handle(ledger: AccountingLedgerPostedBridge, fillId?: string) {
			const command = mapLedgerPostedToReconcileCashInput(
				ledger,
				randomUUID(),
				fillId,
			);
			return reconcileCashFromLedger(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				command,
			);
		},
	};
}
