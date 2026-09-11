import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	decimalAmountSchema,
	performanceMetricSeriesIdSchema,
	performanceOutcomeSnapshotIdSchema,
	performancePositionExposureSnapshotIdSchema,
} from "./types";

const ledgerLineSummarySchema = z.object({
	accountCode: z.string().min(1),
	debit: z.string().min(1),
	credit: z.string().min(1),
	asset: z.string().min(1),
	amount: z.string().min(1),
});

export const outcomeSnapshotSchema = z.object({
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
	organizationId: institutionalUuidSchema,
	journalEntryId: z.string().min(1),
	valueDate: z.string().min(1),
	linesSummary: z.array(ledgerLineSummarySchema),
	recordedAt: z.string().datetime(),
});

export const listOutcomeSnapshotsResponseSchema = z.object({
	outcomeSnapshots: z.array(outcomeSnapshotSchema),
});

export const positionExposureSnapshotSchema = z.object({
	positionExposureSnapshotId: performancePositionExposureSnapshotIdSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: z.string().min(1),
	positionId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	instrumentId: z.string().min(1),
	positionSide: z.string().min(1),
	book: z.string().min(1),
	quantity: decimalAmountSchema,
	fillId: z.string().min(1),
	side: z.string().min(1),
	provisionalCash: z.boolean(),
	observedAt: z.string().datetime(),
});

export const listPositionExposureSnapshotsResponseSchema = z.object({
	positionExposureSnapshots: z.array(positionExposureSnapshotSchema),
});

export const metricSeriesItemSchema = z.object({
	metricSeriesId: performanceMetricSeriesIdSchema,
	organizationId: institutionalUuidSchema,
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema.optional(),
	positionExposureSnapshotId:
		performancePositionExposureSnapshotIdSchema.optional(),
	metricName: z.string().min(1),
	metricValue: decimalAmountSchema,
	observedAt: z.string().datetime(),
});

export const listMetricSeriesResponseSchema = z.object({
	metrics: z.array(metricSeriesItemSchema),
});

export const listOutcomeSnapshotsQuerySchema = z.object({
	journalEntryId: z.string().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listPositionExposureSnapshotsQuerySchema = z.object({
	portfolioId: z.string().min(1).optional(),
	positionId: z.string().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type OutcomeSnapshot = z.infer<typeof outcomeSnapshotSchema>;
export type ListOutcomeSnapshotsResponse = z.infer<
	typeof listOutcomeSnapshotsResponseSchema
>;
export type PositionExposureSnapshot = z.infer<
	typeof positionExposureSnapshotSchema
>;
export type ListPositionExposureSnapshotsResponse = z.infer<
	typeof listPositionExposureSnapshotsResponseSchema
>;
export type MetricSeriesItem = z.infer<typeof metricSeriesItemSchema>;
export type ListMetricSeriesResponse = z.infer<
	typeof listMetricSeriesResponseSchema
>;
