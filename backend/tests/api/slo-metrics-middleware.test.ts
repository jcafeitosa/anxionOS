import { describe, expect, test } from "bun:test";
import { createMetricsCollector } from "@anxionos/observability";
import { Elysia } from "elysia";
import {
	createSloMetricsPlugin,
	resolveRoutePrefix,
} from "../../apps/api/src/middleware/slo-metrics";

describe("resolveRoutePrefix", () => {
	test("collapses deep paths to first two segments", () => {
		expect(resolveRoutePrefix("/v1/performance/agencies/ag-1/outcome-snapshots")).toBe(
			"/v1/performance",
		);
		expect(resolveRoutePrefix("/v1/agencies/ag-1/agents")).toBe("/v1/agencies");
	});

	test("keeps single-segment routes", () => {
		expect(resolveRoutePrefix("/health")).toBe("/health");
	});

	test("keeps two-segment auth routes", () => {
		expect(resolveRoutePrefix("/api/auth/sign-in/email")).toBe("/api/auth");
	});
});

describe("slo-metrics middleware", () => {
	test("records request and latency for successful responses", async () => {
		const metrics = createMetricsCollector();
		const app = new Elysia()
			.use(createSloMetricsPlugin({ metrics }))
			.get("/health", () => ({ ok: true }));

		const response = await app.handle(new Request("http://127.0.0.1/health"));
		expect(response.status).toBe(200);

		const snap = metrics.getSnapshot();
		expect(snap.counters["api.requests:prefix=/health"]).toBe(1);
		expect(snap.histograms["api.latency:prefix=/health"]?.length).toBe(1);
		expect(snap.counters["api.errors:prefix=/health"]).toBeUndefined();
	});

	test("records error counter for 4xx responses", async () => {
		const metrics = createMetricsCollector();
		const app = new Elysia()
			.use(createSloMetricsPlugin({ metrics }))
			.get("/v1/organizations/missing", ({ set }) => {
				set.status = 404;
				return { error: "not_found" };
			});

		const response = await app.handle(
			new Request("http://127.0.0.1/v1/organizations/missing"),
		);
		expect(response.status).toBe(404);

		const snap = metrics.getSnapshot();
		expect(snap.counters["api.requests:prefix=/v1/organizations"]).toBe(1);
		expect(snap.counters["api.errors:prefix=/v1/organizations"]).toBe(1);
		expect(snap.histograms["api.latency:prefix=/v1/organizations"]?.length).toBe(
			1,
		);
	});

	test("records error counter when handler throws", async () => {
		const metrics = createMetricsCollector();
		const app = new Elysia()
			.use(createSloMetricsPlugin({ metrics }))
			.get("/v1/governance/boom", () => {
				throw new Error("boom");
			})
			.onError(({ set }) => {
				set.status = 500;
				return { error: "internal" };
			});

		const response = await app.handle(
			new Request("http://127.0.0.1/v1/governance/boom"),
		);
		expect(response.status).toBe(500);

		const snap = metrics.getSnapshot();
		expect(snap.counters["api.requests:prefix=/v1/governance"]).toBe(1);
		expect(snap.counters["api.errors:prefix=/v1/governance"]).toBe(1);
	});
});
