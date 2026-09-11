import { z } from "zod";
export const PERFORMANCE_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "PERF_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "PERF_CROSS_TENANT",
	SNAPSHOT_NOT_FOUND: "PERF_SNAPSHOT_NOT_FOUND",
	STALE_POSITION: "PERF_STALE_POSITION",
};
export const performanceErrorCodeSchema = z.enum(
	Object.values(PERFORMANCE_ERROR_CODES) as [string, ...string[]],
);
export const PERFORMANCE_ERROR_STATUS_MAP = {
	PERF_DUPLICATE_IDEMPOTENCY: 409,
	PERF_CROSS_TENANT: 403,
	PERF_SNAPSHOT_NOT_FOUND: 404,
	PERF_STALE_POSITION: 409,
};
export type PerformanceErrorCode =
	(typeof PERFORMANCE_ERROR_CODES)[keyof typeof PERFORMANCE_ERROR_CODES];
export function resolvePerformanceErrorStatus(
	code: PerformanceErrorCode,
): number {
	return PERFORMANCE_ERROR_STATUS_MAP[
		code as keyof typeof PERFORMANCE_ERROR_STATUS_MAP
	];
}
