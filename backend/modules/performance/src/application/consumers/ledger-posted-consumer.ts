import { randomUUID } from "node:crypto";
import {
  mapLedgerPostedToPerformanceInput,
  type AccountingLedgerPostedBridge,
  type PerformanceCommandResult,
} from "@anxionos/contracts/performance";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PerformanceUnitOfWork } from "../../domain/ports/performance-unit-of-work";
import { recordOutcomeSnapshot } from "../commands/record-outcome-snapshot";

export interface LedgerPostedConsumerDeps {
  unitOfWork: PerformanceUnitOfWork;
  commandJournal: CommandJournalRepository;
}

export function createLedgerPostedConsumer(deps: LedgerPostedConsumerDeps): {
  handle(ledger: AccountingLedgerPostedBridge): Promise<PerformanceCommandResult>;
} {
  return {
    async handle(ledger: AccountingLedgerPostedBridge) {
      const command = mapLedgerPostedToPerformanceInput(ledger, randomUUID());
      return recordOutcomeSnapshot(
        { unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
        {
          commandId: command.commandId,
          organizationId: command.organizationId,
          journalEntryId: command.journalEntryId,
          valueDate: command.valueDate,
          linesSummary: command.linesSummary,
        },
      );
    },
  };
}
