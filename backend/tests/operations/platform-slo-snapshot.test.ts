import { describe, expect, test } from "bun:test";
import {
	PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION,
	platformSloSnapshotSchema,
} from "@anxionos/contracts/operations";
import { createMetricsCollector } from "@anxionos/observability";
import {
	getPlatformSloSnapshot,
	parseMetricKey,
	REDACTED_METRIC_VALUE,
	redactMetricTagValue,
} from "@anxionos/operations";

describe("metrics redaction", () => {
	test("redacts connection strings and sensitive tag keys", () => {
		expect(
			redactMetricTagValue(
				"database_url",
				"postgresql://user:secret@host:5432/db",
			),
		).toBe(REDACTED_METRIC_VALUE);
		expect(redactMetricTagValue("prefix", "/v1/health")).toBe("/v1/health");
	});

	test("parseMetricKey redacts sensitive tags in parsed output", () => {
		const parsed = parseMetricKey(
			"api.requests:prefix=/health,token=Bearer abc123",
		);
		expect(parsed.name).toBe("api.requests");
		expect(parsed.tags.prefix).toBe("/health");
		expect(parsed.tags.token).toBe(REDACTED_METRIC_VALUE);
	});
});

describe("getPlatformSloSnapshot", () => {
	test("returns honest empty read model when no metrics recorded", () => {
		const metrics = createMetricsCollector();
		const snapshot = getPlatformSloSnapshot({
			metrics,
			now: () => "2026-09-11T12:00:00.000Z",
		});

		expect(snapshot.schemaVersion).toBe(PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION);
		expect(snapshot.scope).toBe("platform");
		expect(snapshot.generatedAt).toBe("2026-09-11T12:00:00.000Z");
		expect(snapshot.api.totalRequests).toBe(0);
		expect(snapshot.api.routes).toEqual([]);
		expect(snapshot.eventing.channels).toEqual([]);
		expect(snapshot.capacity.signalsAvailable).toBe(false);
		expect(snapshot.cost.signalsAvailable).toBe(false);
		expect(platformSloSnapshotSchema.safeParse(snapshot).success).toBe(true);
	});

	test("aggregates API and eventing metrics with percentiles", () => {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });
		metrics.incrementCounter("api.requests", { prefix: "/health" });
		metrics.incrementCounter("api.errors", { prefix: "/health" });
		metrics.recordHistogram("api.latency", 10, { prefix: "/health" });
		metrics.recordHistogram("api.latency", 90, { prefix: "/health" });
		metrics.recordHistogram("operations.eventing.lag", 1_500, {
			channel: "outbox",
			owner_domain: "decisions",
		});
		metrics.incrementCounter("operations.eventing.lag.alerts", {
			channel: "outbox",
			owner_domain: "decisions",
			severity: "warn",
		});

		const snapshot = getPlatformSloSnapshot({ metrics });

		expect(snapshot.api.totalRequests).toBe(2);
		expect(snapshot.api.totalErrors).toBe(1);
		expect(snapshot.api.errorRatePercent).toBe(50);
		expect(snapshot.api.routes).toHaveLength(1);
		expect(snapshot.api.routes[0]).toMatchObject({
			prefix: "/health",
			requestCount: 2,
			errorCount: 1,
			errorRatePercent: 50,
		});
		expect(snapshot.eventing.channels).toHaveLength(1);
		expect(snapshot.eventing.channels[0]).toMatchObject({
			channel: "outbox",
			ownerDomain: "decisions",
			sampleCount: 1,
			alertCount: 1,
			p50Ms: 1500,
		});
	});

	test("does not leak connection strings from metric tag values", () => {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", {
			prefix: "/v1/ops",
			database_url: "postgresql://user:secret@host:5432/db",
		});

		const snapshot = getPlatformSloSnapshot({ metrics });
		const serialized = JSON.stringify(snapshot);
		expect(serialized).not.toContain("postgresql://");
		expect(serialized).not.toContain("secret");
	});
});
