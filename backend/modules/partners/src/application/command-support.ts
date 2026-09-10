import type { PartnersCommandResult } from "@anxionos/contracts/partners";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<PartnersCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByInvoiceId(
	commandJournal: CommandJournalRepository,
	invoiceId: string,
): Promise<PartnersCommandResult | null> {
	const existing = await commandJournal.findByInvoiceId(invoiceId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: PartnersCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		partnerId: result.partnerId,
		referralId: result.referralId,
		commissionAccrualId: result.commissionAccrualId,
		commissionAmount: result.commissionAmount,
		payoutId: result.payoutId,
	};
}
