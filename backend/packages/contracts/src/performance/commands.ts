import { z } from "zod";
import { ledgerLineSummarySchema } from "../accounting/events";
import { journalEntryIdSchema } from "../accounting/types";
import { performanceOutcomeSnapshotIdSchema } from "./types";
export const performanceCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema.optional(),
});
export const recordOutcomeSnapshotCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	journalEntryId: journalEntryIdSchema,
	valueDate: z.string().min(1),
	linesSummary: z.array(ledgerLineSummarySchema).min(2),
});

export type PerformanceCommandResult = z.infer<
	typeof performanceCommandResultSchema
>;

export type RecordOutcomeSnapshotCommand = z.infer<
	typeof recordOutcomeSnapshotCommandSchema
>;
