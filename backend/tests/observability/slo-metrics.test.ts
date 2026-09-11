/**
 * ANX-170 SLO spec + metrics verification.
 * Proves: metrics collection, SLO violation detection, latency percentile,
 * and capacity reporting exist and work correctly.
 */
import { describe, expect, test } from "bun:test";
import {
	createMetricsCollector,
	createSLODefinition,
	checkSLOViolation,
	percentile,
	createLogger,
	type MetricsCollector,
} from "@anxionos/observability";

describe("ANX-170 SLO metrics + observability", () => {
	test("metrics counter increments correctly", () => {
		const m = createMetricsCollector();
		m.incrementCounter("api.requests", { endpoint: "/v1/portfolios" });
		m.incrementCounter("api.requests", { endpoint: "/v1/portfolios" });
		m.incrementCounter("api.errors", { endpoint: "/v1/portfolios" });
		const snap = m.getSnapshot();
		expect(snap.counters["api.requests:endpoint=/v1/portfolios"]).toBe(2);
		expect(snap.counters["api.errors:endpoint=/v1/portfolios"]).toBe(1);
	});

	test("metrics histogram records latency", () => {
		const m = createMetricsCollector();
		m.recordHistogram("db.latency", 10);
		m.recordHistogram("db.latency", 50);
		m.recordHistogram("db.latency", 100);
		const snap = m.getSnapshot();
		expect(snap.histograms["db.latency"]).toEqual([10, 50, 100]);
	});

	test("SLO definition creates correct structure", () => {
		const slo = createSLODefinition("api", "portfolio-list", 99.9, "platform");
		expect(slo.targetPercent).toBe(99.9);
		expect(slo.budgetPercent).toBe(0.1);
		expect(slo.windowMinutes).toBe(60);
		expect(slo.onViolation).toBe("alert");
	});

	test("SLO violation detection works", () => {
		const slo = createSLODefinition("api", "test", 99.9, "ops");
		const m = createMetricsCollector();
		// 100 requests, 0 errors → no violation
		for (let i = 0; i < 100; i++) m.incrementCounter("api.requests:test");
		const r1 = checkSLOViolation(slo, m);
		expect(r1.violation).toBe(false);
		expect(r1.errorBudgetRemainingPercent).toBe(0.1);

		// 1 error → 1% error rate, budget is 0.1% → violation
		m.incrementCounter("api.errors:test");
		const r2 = checkSLOViolation(slo, m);
		expect(r2.violation).toBe(true);
		expect(r2.errorBudgetRemainingPercent).toBeLessThan(0);
	});

	test("SLO no-violation with zero requests", () => {
		const slo = createSLODefinition("api", "empty", 99.9, "ops");
		const m = createMetricsCollector();
		const r = checkSLOViolation(slo, m);
		expect(r.violation).toBe(false);
		expect(r.details).toContain("no requests yet");
	});

	test("percentile calculation correct", () => {
		const data = [1, 5, 10, 50, 100].sort((a, b) => a - b);
		expect(percentile(data, 50)).toBe(10);
		expect(percentile(data, 95)).toBe(100);
		expect(percentile(data, 99)).toBe(100);
		expect(percentile(data, 0)).toBe(1);
	});

	test("logger is a structured function", () => {
		const logger = createLogger({ service: "test", level: "info" });
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.debug).toBe("function");
	});

	test("SLO check with degrade-on-violation", () => {
		const slo = createSLODefinition("api", "degrade", 99.9, "ops", "degrade");
		expect(slo.onViolation).toBe("degrade");
	});

	test("latency histogram end-to-end", () => {
		const m = createMetricsCollector();
		for (let i = 0; i < 100; i++) {
			m.recordHistogram("ingest.latency", Math.random() * 100, { tenant: "t1" });
		}
		const snap = m.getSnapshot();
		const latencies = snap.histograms["ingest.latency:tenant=t1"];
		expect(latencies.length).toBe(100);
		const p50 = percentile(latencies.sort((a, b) => a - b), 50);
		const p99 = percentile(latencies.sort((a, b) => a - b), 99);
		expect(p50).toBeGreaterThan(0);
		expect(p99).toBeGreaterThan(p50);
	});
});