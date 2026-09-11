import { z } from "zod";
import { ledgerLineSummarySchema } from "../accounting/events";
import { journalEntryIdSchema } from "../accounting/types";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	fillSideSchema,
	portfolioIdSchema,
	positionIdSchema,
	positionSideSchema,
} from "../portfolios/types";
import {
	decimalAmountSchema,
	performanceMetricSeriesIdSchema,
	performanceOutcomeSnapshotIdSchema,
	performancePositionExposureSnapshotIdSchema,
} from "./types";
export const PERFORMANCE_EVENT_TYPES = {
	OUTCOME_RECORDED: "performance.outcome.recorded.v1",
	METRIC_SNAPSHOT: "performance.metric.snapshot.v1",
	POSITION_EXPOSURE_RECORDED: "performance.position_exposure.recorded.v1",
};
export const outcomeRecordedPayloadSchema = z.object({
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
	organizationId: institutionalUuidSchema,
	journalEntryId: journalEntryIdSchema,
	valueDate: z.string().min(1),
	linesSummary: z.array(ledgerLineSummarySchema).min(2),
	recordedAt: z.string().datetime(),
});
export const metricSnapshotPayloadSchema = z.object({
	metricSeriesId: performanceMetricSeriesIdSchema,
	organizationId: institutionalUuidSchema,
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema.optional(),
	positionExposureSnapshotId:
		performancePositionExposureSnapshotIdSchema.optional(),
	metricName: z.string().min(1).max(64),
	metricValue: decimalAmountSchema,
	observedAt: z.string().datetime(),
});
export const positionExposureRecordedPayloadSchema = z.object({
	positionExposureSnapshotId: performancePositionExposureSnapshotIdSchema,
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
	provisionalCash: z.boolean(),
	observedAt: z.string().datetime(),
});
export const performanceEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED),
		payload: outcomeRecordedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PERFORMANCE_EVENT_TYPES.METRIC_SNAPSHOT),
		payload: metricSnapshotPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PERFORMANCE_EVENT_TYPES.POSITION_EXPOSURE_RECORDED),
		payload: positionExposureRecordedPayloadSchema,
	}),
]);

export type PerformanceEventType =
	(typeof PERFORMANCE_EVENT_TYPES)[keyof typeof PERFORMANCE_EVENT_TYPES];
