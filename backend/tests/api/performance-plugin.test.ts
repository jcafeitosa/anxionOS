import { describe, expect, test } from "bun:test";
import { PERFORMANCE_ERROR_CODES } from "@anxionos/contracts/performance";
import { PerformanceCommandError } from "@anxionos/performance";
import { mapPerformanceError } from "../../apps/api/src/performance/error-handler";
import {
	outcomeSnapshotIdParamSchema,
	positionExposureSnapshotIdParamSchema,
} from "../../apps/api/src/performance/handlers/snapshot-queries";
import { createPerformancePlugin } from "../../apps/api/src/performance/plugin";

describe("performance API boundary (ANX-154 HTTP read)", () => {
	test("mapPerformanceError maps PERF_SNAPSHOT_NOT_FOUND to 404", () => {
		const error = new PerformanceCommandError(
			PERFORMANCE_ERROR_CODES.SNAPSHOT_NOT_FOUND,
			"outcome snapshot not found",
		);
		const mapped = mapPerformanceError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: PERFORMANCE_ERROR_CODES.SNAPSHOT_NOT_FOUND,
		});
	});

	test("mapPerformanceError maps PERF_CROSS_TENANT to 403", () => {
		const error = new PerformanceCommandError(
			PERFORMANCE_ERROR_CODES.CROSS_TENANT,
			"organization mismatch",
		);
		const mapped = mapPerformanceError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: PERFORMANCE_ERROR_CODES.CROSS_TENANT,
		});
	});

	test("path param schemas reject tampered ids", () => {
		expect(
			outcomeSnapshotIdParamSchema.safeParse({ outcomeSnapshotId: "bad" })
				.success,
		).toBe(false);
		expect(
			positionExposureSnapshotIdParamSchema.safeParse({
				positionExposureSnapshotId: "bad",
			}).success,
		).toBe(false);
		expect(
			outcomeSnapshotIdParamSchema.safeParse({
				outcomeSnapshotId: "perf_out_11111111-1111-4111-8111-111111111111",
			}).success,
		).toBe(true);
		expect(
			positionExposureSnapshotIdParamSchema.safeParse({
				positionExposureSnapshotId:
					"perf_pes_22222222-2222-4222-8222-222222222222",
			}).success,
		).toBe(true);
	});
});

describe("performance plugin routes (ANX-154 HTTP read)", () => {
	test("registers snapshot and metrics read routes", () => {
		const plugin = createPerformancePlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			outcomeSnapshots: {} as never,
			positionExposureSnapshots: {} as never,
			metricSeries: {} as never,
		});
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/outcome-snapshots",
		);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/outcome-snapshots/:outcomeSnapshotId",
		);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/outcome-snapshots/:outcomeSnapshotId/metrics",
		);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/position-exposure-snapshots",
		);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/position-exposure-snapshots/:positionExposureSnapshotId",
		);
		expect(routes).toContain(
			"/v1/performance/agencies/:agencyId/position-exposure-snapshots/:positionExposureSnapshotId/metrics",
		);
	});
});
