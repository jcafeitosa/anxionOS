import { type AccountingCommandResult, type PostTradeFillCommand } from "@anxionos/contracts/accounting";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AccountingUnitOfWork } from "../../domain/ports/accounting-unit-of-work";
import { assertAccountingExecutionModeSupported, postTradeFillCommandSchema } from "@anxionos/contracts/accounting";
import { postLedgerEntry } from "./post-ledger-entry";

export interface PostTradeFillDeps {
    unitOfWork: AccountingUnitOfWork;
    commandJournal: CommandJournalRepository;
}

function buildTradeFillLines(command: PostTradeFillCommand) {
    const amount = command.notionalAmount;
    const zero = "0";
    if (command.side === "BUY") {
        return [
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
        ];
    }
    return [
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
}
export async function postTradeFill(deps: PostTradeFillDeps, input: PostTradeFillCommand): Promise<AccountingCommandResult> {
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
