import { z } from "zod";
export const PERFORMANCE_OWNER_DOMAIN = "performance";
export const performanceOutcomeSnapshotIdSchema = z
	.string()
	.regex(/^perf_out_[0-9a-f-]{36}$/i);
export const performanceMetricSeriesIdSchema = z
	.string()
	.regex(/^perf_mtr_[0-9a-f-]{36}$/i);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export type PerformanceOutcomeSnapshotId = z.infer<
	typeof performanceOutcomeSnapshotIdSchema
>;
export type PerformanceMetricSeriesId = z.infer<
	typeof performanceMetricSeriesIdSchema
>;
