import { z } from "zod";
import { journalEntryIdSchema } from "../accounting/types";
import { ledgerLineSummarySchema } from "../accounting/events";
import { decimalAmountSchema, performanceMetricSeriesIdSchema, performanceOutcomeSnapshotIdSchema, } from "./types";
export const PERFORMANCE_EVENT_TYPES = {
    OUTCOME_RECORDED: "performance.outcome.recorded.v1",
    METRIC_SNAPSHOT: "performance.metric.snapshot.v1",
};
export const outcomeRecordedPayloadSchema = z.object({
    outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
    organizationId: z.string().uuid(),
    journalEntryId: journalEntryIdSchema,
    valueDate: z.string().min(1),
    linesSummary: z.array(ledgerLineSummarySchema).min(2),
    recordedAt: z.string().datetime(),
});
export const metricSnapshotPayloadSchema = z.object({
    metricSeriesId: performanceMetricSeriesIdSchema,
    organizationId: z.string().uuid(),
    outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
    metricName: z.string().min(1).max(64),
    metricValue: decimalAmountSchema,
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
]);

export type PerformanceEventType = (typeof PERFORMANCE_EVENT_TYPES)[keyof typeof PERFORMANCE_EVENT_TYPES];
