import { z } from "zod";
import { ledgerLineSummarySchema } from "../accounting/events";
import { journalEntryIdSchema } from "../accounting/types";
import {
	performanceOutcomeSnapshotIdSchema,
	performancePositionExposureSnapshotIdSchema,
} from "./types";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	fillSideSchema,
	portfolioIdSchema,
	positionIdSchema,
	positionSideSchema,
} from "../portfolios/types";
export const performanceCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema.optional(),
	positionExposureSnapshotId:
		performancePositionExposureSnapshotIdSchema.optional(),
});
export const recordOutcomeSnapshotCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
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

export const recordPositionExposureSnapshotCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	positionId: positionIdSchema,
	revision: z.number().int().nonnegative(),
	instrumentId: z.string().min(1),
	positionSide: positionSideSchema,
	book: z.string().min(1).max(32),
	quantity: z.string().min(1),
	fillId: z.string().min(1).max(128),
	side: fillSideSchema,
	provisionalCash: z.boolean().optional(),
});

export type RecordPositionExposureSnapshotCommand = z.infer<
	typeof recordPositionExposureSnapshotCommandSchema
>;
