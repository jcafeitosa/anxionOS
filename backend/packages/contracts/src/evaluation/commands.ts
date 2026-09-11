import { z } from "zod";
import { ledgerLineSummarySchema } from "../accounting/events";
import { institutionalUuidSchema } from "../institutional-uuid";
import { performanceOutcomeSnapshotIdSchema } from "../performance/types";
import { strategyIdSchema, strategyVersionIdSchema } from "../strategies/types";
import {
	evaluationCertificationIdSchema,
	evaluationRecordIdSchema,
	evaluationScoreIdSchema,
} from "./types";
export const evaluationCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	evaluationRecordId: evaluationRecordIdSchema.optional(),
	evaluationScoreId: evaluationScoreIdSchema.optional(),
	certificationId: evaluationCertificationIdSchema.optional(),
});
export const recordEvaluationScoreCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
	valueDate: z.string().min(1),
	linesSummary: z.array(ledgerLineSummarySchema).min(2),
});

export type EvaluationCommandResult = z.infer<
	typeof evaluationCommandResultSchema
>;

export type RecordEvaluationScoreCommand = z.infer<
	typeof recordEvaluationScoreCommandSchema
>;

export const issueCertificationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	evaluationRecordId: evaluationRecordIdSchema.optional(),
	policyHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/i)
		.optional(),
});

export type IssueCertificationCommand = z.infer<
	typeof issueCertificationCommandSchema
>;
