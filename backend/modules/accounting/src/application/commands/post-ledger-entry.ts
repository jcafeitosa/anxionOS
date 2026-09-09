import { type AccountingCommandResult, type LedgerLine, type PostLedgerEntryCommand } from "@anxionos/contracts/accounting";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type {
  AccountingTransactionContext,
  AccountingUnitOfWork,
  JournalEntryRecord,
} from "../../domain/ports/accounting-unit-of-work";
import { randomUUID } from "node:crypto";
import { accountingCommandResultSchema, assertAccountingExecutionModeSupported, postLedgerEntryCommandSchema } from "@anxionos/contracts/accounting";
import { createLedgerPostedEvent } from "../../domain/events/accounting-events";
import { assertBalancedLines } from "../balance-validation";
import { loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwAccountingError } from "../errors";

export interface PostLedgerEntryDeps {
    unitOfWork: AccountingUnitOfWork;
    commandJournal: CommandJournalRepository;
}

async function assertAccountsBelongToOrg(ctx: AccountingTransactionContext, organizationId: string, lines: LedgerLine[]) {
    for (const line of lines) {
        const account = await ctx.chartAccounts.findByCode(organizationId, line.accountCode);
        if (!account) {
            throwAccountingError("ACC_ACCOUNT_NOT_FOUND", `chart account not found: ${line.accountCode}`);
        }
        if (account.organizationId !== organizationId) {
            throwAccountingError("ACC_CROSS_TENANT", "account organization mismatch");
        }
    }
}
function entryResultFromRecord(record: JournalEntryRecord, idempotentReplay = false) {
    return accountingCommandResultSchema.parse({
        aggregateId: record.id,
        revision: record.revision,
        entryId: record.id,
        idempotentReplay,
    });
}
export async function postLedgerEntry(deps: PostLedgerEntryDeps, input: PostLedgerEntryCommand): Promise<AccountingCommandResult> {
    const command = postLedgerEntryCommandSchema.parse(input);
    assertAccountingExecutionModeSupported(command.executionMode);
    assertBalancedLines(command.lines);
    const existingCommand = await deps.commandJournal.findByCommandId(command.commandId);
    if (existingCommand && existingCommand.organizationId !== command.organizationId) {
        throwAccountingError("ACC_CROSS_TENANT", "command journal organization mismatch");
    }
    const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
    if (replay)
        return replay;
    return deps.unitOfWork.runInTransaction(async (ctx) => {
        const raced = await ctx.commandJournal.findByCommandId(command.commandId);
        if (raced) {
            const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
            return accountingCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const existing = await ctx.journalEntries.findByIdempotencyKey(command.organizationId, command.idempotencyKey);
        if (existing) {
            const result = entryResultFromRecord(existing, true);
            await ctx.commandJournal.save({
                commandId: command.commandId,
                organizationId: command.organizationId,
                commandName: "postLedgerEntry",
                responseSnapshot: toCommandResultSnapshot(result),
            });
            return result;
        }
        const settlementAsset = command.lines[0]?.asset ?? "USD";
        await ctx.chartAccounts.ensureDefaultChart(command.organizationId, settlementAsset);
        await assertAccountsBelongToOrg(ctx, command.organizationId, command.lines);
        const entryId = `acc_je_${randomUUID()}`;
        const valueDate = command.valueDate ?? new Date().toISOString().slice(0, 10);
        const savedEntry = await ctx.journalEntries.save({
            id: entryId,
            organizationId: command.organizationId,
            entryKind: command.entryKind,
            status: "POSTED",
            idempotencyKey: command.idempotencyKey,
            sourceRef: command.sourceRef ?? null,
            valueDate,
            executionMode: command.executionMode,
            capitalAccountId: command.capitalAccountId ?? null,
            portfolioId: command.portfolioId ?? null,
            revision: 1,
        });
        const linesSummary = [];
        for (const line of command.lines) {
            const postingId = `acc_post_${randomUUID()}`;
            await ctx.ledgerPostings.save({
                id: postingId,
                journalEntryId: savedEntry.id,
                organizationId: command.organizationId,
                accountCode: line.accountCode,
                debit: line.debit,
                credit: line.credit,
                asset: line.asset,
                amount: line.amount,
            });
            linesSummary.push({
                accountCode: line.accountCode,
                debit: line.debit,
                credit: line.credit,
                asset: line.asset,
                amount: line.amount,
            });
        }
        await ctx.publishEvents([
            createLedgerPostedEvent({
                entryId: savedEntry.id,
                organizationId: command.organizationId,
                idempotencyKey: command.idempotencyKey,
                entryKind: command.entryKind,
                linesSummary,
                valueDate,
                capitalAccountId: command.capitalAccountId,
                portfolioId: command.portfolioId,
            }),
        ]);
        const result = entryResultFromRecord(savedEntry);
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "postLedgerEntry",
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
