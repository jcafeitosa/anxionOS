import { randomUUID } from "node:crypto";
import type {
	AccountingCommandResult,
	ReverseLedgerEntryCommand,
} from "@anxionos/contracts/accounting";
import {
	accountingCommandResultSchema,
	assertAccountingExecutionModeSupported,
	reverseLedgerEntryCommandSchema,
} from "@anxionos/contracts/accounting";
import { createLedgerPostedEvent, createReversalPostedEvent } from "../../domain/events/accounting-events";
import type {
	AccountingTransactionContext,
	AccountingUnitOfWork,
} from "../../domain/ports/accounting-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import { assertBalancedLines } from "../balance-validation";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAccountingError } from "../errors";
import { invertPostingLines } from "../invert-ledger-lines";

export interface ReverseLedgerEntryDeps {
	unitOfWork: AccountingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

function reversalIdempotencyKey(entryId: string): string {
	return `reverse:${entryId}`;
}

function entryResult(
	entryId: string,
	revision: number,
	idempotentReplay = false,
): AccountingCommandResult {
	return accountingCommandResultSchema.parse({
		aggregateId: entryId,
		revision,
		entryId,
		idempotentReplay,
	});
}

export async function reverseLedgerEntry(
	deps: ReverseLedgerEntryDeps,
	input: ReverseLedgerEntryCommand,
): Promise<AccountingCommandResult> {
	const command = reverseLedgerEntryCommandSchema.parse(input);
	assertAccountingExecutionModeSupported(command.executionMode);

	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwAccountingError(
			"ACC_CROSS_TENANT",
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
			return accountingCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const original = await ctx.journalEntries.findById(command.entryId);
		if (!original) {
			throwAccountingError("ACC_ENTRY_NOT_FOUND", "journal entry not found");
		}
		if (original.organizationId !== command.organizationId) {
			throwAccountingError("ACC_CROSS_TENANT", "journal entry organization mismatch");
		}

		const reversalKey = reversalIdempotencyKey(command.entryId);
		const existingReversal = await ctx.journalEntries.findByIdempotencyKey(
			command.organizationId,
			reversalKey,
		);
		if (existingReversal) {
			const result = entryResult(existingReversal.id, existingReversal.revision, true);
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "reverseLedgerEntry",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}

		if (original.status === "REVERSED") {
			throwAccountingError(
				"ACC_ENTRY_ALREADY_REVERSED",
				"journal entry already reversed",
			);
		}
		if (original.status !== "POSTED") {
			throwAccountingError(
				"ACC_ENTRY_NOT_POSTED",
				"only posted entries can be reversed",
			);
		}

		const postings = await ctx.ledgerPostings.findByEntryId(command.entryId);
		if (postings.length < 2) {
			throwAccountingError(
				"ACC_UNBALANCED_ENTRY",
				"original entry has insufficient postings",
			);
		}
		const lines = invertPostingLines(postings);
		assertBalancedLines(lines);

		const reversalEntryId = `acc_je_${randomUUID()}`;
		const valueDate = original.valueDate;
		const savedReversal = await ctx.journalEntries.save({
			id: reversalEntryId,
			organizationId: command.organizationId,
			entryKind: "REVERSAL",
			status: "POSTED",
			idempotencyKey: reversalKey,
			sourceRef: {
				reversesEntryId: command.entryId,
				reason: command.reason ?? null,
			},
			valueDate,
			executionMode: command.executionMode,
			capitalAccountId: original.capitalAccountId,
			portfolioId: original.portfolioId,
			revision: 1,
		});

		const linesSummary = [];
		for (const line of lines) {
			const postingId = `acc_post_${randomUUID()}`;
			await ctx.ledgerPostings.save({
				id: postingId,
				journalEntryId: savedReversal.id,
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

		await ctx.journalEntries.updateStatus(
			original.id,
			"REVERSED",
			original.revision + 1,
		);

		await ctx.publishEvents([
			createLedgerPostedEvent({
				entryId: savedReversal.id,
				organizationId: command.organizationId,
				idempotencyKey: reversalKey,
				entryKind: "REVERSAL",
				linesSummary,
				valueDate,
				capitalAccountId: original.capitalAccountId ?? undefined,
				portfolioId: original.portfolioId ?? undefined,
			}),
			createReversalPostedEvent({
				reversalEntryId: savedReversal.id,
				reversesEntryId: command.entryId,
				organizationId: command.organizationId,
				idempotencyKey: reversalKey,
				reason: command.reason,
			}),
		]);

		const result = entryResult(savedReversal.id, savedReversal.revision);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "reverseLedgerEntry",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
