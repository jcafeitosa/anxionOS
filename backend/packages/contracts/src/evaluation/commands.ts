import { z } from "zod";
import { performanceOutcomeSnapshotIdSchema } from "../performance/types";
import { ledgerLineSummarySchema } from "../accounting/events";
import { evaluationRecordIdSchema, evaluationScoreIdSchema } from "./types";
export const evaluationCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    evaluationRecordId: evaluationRecordIdSchema.optional(),
    evaluationScoreId: evaluationScoreIdSchema.optional(),
});
export const recordEvaluationScoreCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
    valueDate: z.string().min(1),
    linesSummary: z.array(ledgerLineSummarySchema).min(2),
});

export type EvaluationCommandResult = z.infer<typeof evaluationCommandResultSchema>;

export type RecordEvaluationScoreCommand = z.infer<typeof recordEvaluationScoreCommandSchema>;
