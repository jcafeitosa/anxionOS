import type { z } from "zod";
import {
	ledgerLineSummarySchema,
	ledgerPostedPayloadSchema,
} from "../accounting/events";
import { journalEntryIdSchema } from "../accounting/types";
/** Bridge schema for performance consumer input shaped as accounting.ledger.posted.v1. */
export const accountingLedgerPostedBridgeSchema =
	ledgerPostedPayloadSchema.pick({
		entryId: true,
		organizationId: true,
		valueDate: true,
		linesSummary: true,
	});
export function mapLedgerPostedToPerformanceInput(
	ledger: AccountingLedgerPostedBridge,
	commandId: string,
): RecordOutcomeFromLedgerInput {
	const parsed = accountingLedgerPostedBridgeSchema.parse(ledger);
	return {
		commandId,
		organizationId: parsed.organizationId,
		journalEntryId: parsed.entryId,
		valueDate: parsed.valueDate,
		linesSummary: parsed.linesSummary,
	};
}

export type AccountingLedgerPostedBridge = z.infer<
	typeof accountingLedgerPostedBridgeSchema
>;
export interface RecordOutcomeFromLedgerInput {
	commandId: string;
	organizationId: string;
	journalEntryId: string;
	valueDate: string;
	linesSummary: AccountingLedgerPostedBridge["linesSummary"];
}
