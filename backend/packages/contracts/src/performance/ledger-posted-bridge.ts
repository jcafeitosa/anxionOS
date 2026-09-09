import { z } from "zod";
import { journalEntryIdSchema } from "../accounting/types";
import { ledgerLineSummarySchema } from "../accounting/events";
import { ledgerPostedPayloadSchema } from "../accounting/events";
/** Bridge schema for performance consumer input shaped as accounting.ledger.posted.v1. */
export const accountingLedgerPostedBridgeSchema = ledgerPostedPayloadSchema.pick({
    entryId: true,
    organizationId: true,
    valueDate: true,
    linesSummary: true,
});
export function mapLedgerPostedToPerformanceInput(ledger: AccountingLedgerPostedBridge, commandId: string): RecordOutcomeFromLedgerInput {
    const parsed = accountingLedgerPostedBridgeSchema.parse(ledger);
    return {
        commandId,
        organizationId: parsed.organizationId,
        journalEntryId: parsed.entryId,
        valueDate: parsed.valueDate,
        linesSummary: parsed.linesSummary,
    };
}

export type AccountingLedgerPostedBridge = z.infer<typeof accountingLedgerPostedBridgeSchema>;
export interface RecordOutcomeFromLedgerInput {
    commandId: string;
    organizationId: string;
    journalEntryId: string;
    valueDate: string;
    linesSummary: AccountingLedgerPostedBridge["linesSummary"];
}
