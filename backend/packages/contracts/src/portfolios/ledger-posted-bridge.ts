import type { z } from "zod";
import { ledgerPostedPayloadSchema } from "../accounting/events";
import { portfolioIdSchema } from "./types";

/** Bridge schema for portfolios consumer input shaped as accounting.ledger.posted.v1. */
export const accountingLedgerPostedBridgeSchema = ledgerPostedPayloadSchema
	.pick({
		entryId: true,
		organizationId: true,
		idempotencyKey: true,
		entryKind: true,
		linesSummary: true,
		valueDate: true,
		capitalAccountId: true,
	})
	.extend({
		portfolioId: portfolioIdSchema.optional(),
	});

export type AccountingLedgerPostedBridge = z.infer<
	typeof accountingLedgerPostedBridgeSchema
>;

export interface ReconcileCashFromLedgerInput {
	commandId: string;
	organizationId: string;
	journalEntryId: string;
	idempotencyKey: string;
	entryKind: string;
	valueDate: string;
	linesSummary: AccountingLedgerPostedBridge["linesSummary"];
	capitalAccountId?: string;
	portfolioId?: string;
	fillId?: string;
}

export function mapLedgerPostedToReconcileCashInput(
	ledger: AccountingLedgerPostedBridge,
	commandId: string,
	fillId?: string,
): ReconcileCashFromLedgerInput {
	const parsed = accountingLedgerPostedBridgeSchema.parse(ledger);
	return {
		commandId,
		organizationId: parsed.organizationId,
		journalEntryId: parsed.entryId,
		idempotencyKey: parsed.idempotencyKey,
		entryKind: parsed.entryKind,
		valueDate: parsed.valueDate,
		linesSummary: parsed.linesSummary,
		capitalAccountId: parsed.capitalAccountId,
		portfolioId: parsed.portfolioId,
		fillId,
	};
}
