import { describe, expect, test } from "bun:test";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import { createMetricsCollector } from "@anxionos/observability";
import { Elysia } from "elysia";
import { createPlatformSloSnapshotPlugin } from "../../apps/api/src/operations/platform-slo-snapshot-plugin";

describe("GET /v1/operations/platform/slo-snapshot", () => {
	test("returns schema-valid redacted snapshot", async () => {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });
		metrics.recordHistogram("api.latency", 12, { prefix: "/health" });

		const app = new Elysia().use(
			createPlatformSloSnapshotPlugin({
				metrics,
				now: () => "2026-09-11T12:00:00.000Z",
			}),
		);

		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(platformSloSnapshotSchema.safeParse(body).success).toBe(true);
		expect(body.scope).toBe("platform");
		expect(body.api.totalRequests).toBe(1);
		expect(body.generatedAt).toBe("2026-09-11T12:00:00.000Z");
	});
});
