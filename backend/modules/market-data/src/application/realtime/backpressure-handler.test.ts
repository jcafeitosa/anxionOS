import { describe, expect, test } from "bun:test";
import {
	MARKET_DATA_REALTIME_LIMIT_DEFAULTS,
	resolveMaxEventsPerStreamPerWindow,
	resolveMaxStreamsPerTenant,
} from "../../domain/realtime-ingest-limits";
import { RealtimeIngestBackpressureHandler } from "./backpressure-handler";

describe("realtime ingest limits (ANX-329 S3a)", () => {
	test("defaults match documented tenant/stream quotas", () => {
		expect(resolveMaxStreamsPerTenant()).toBe(
			MARKET_DATA_REALTIME_LIMIT_DEFAULTS.maxStreamsPerTenant,
		);
		expect(resolveMaxEventsPerStreamPerWindow()).toBe(
			MARKET_DATA_REALTIME_LIMIT_DEFAULTS.maxEventsPerStreamPerWindow,
		);
	});

	test("env overrides tune tenant and stream quotas", () => {
		process.env.MARKET_DATA_MAX_STREAMS_PER_TENANT = "4";
		process.env.MARKET_DATA_MAX_EVENTS_PER_STREAM_PER_WINDOW = "10";
		expect(resolveMaxStreamsPerTenant()).toBe(4);
		expect(resolveMaxEventsPerStreamPerWindow()).toBe(10);
		delete process.env.MARKET_DATA_MAX_STREAMS_PER_TENANT;
		delete process.env.MARKET_DATA_MAX_EVENTS_PER_STREAM_PER_WINDOW;
	});
});

describe("RealtimeIngestBackpressureHandler", () => {
	test("rejects when tenant exceeds stream quota", () => {
		const handler = new RealtimeIngestBackpressureHandler({
			maxStreamsPerTenant: 2,
			maxEventsPerStreamPerWindow: 5,
			windowMs: 1_000,
		});
		expect(handler.registerStream("org-a", "btc-usd").action).toBe("allow");
		expect(handler.registerStream("org-a", "eth-usd").action).toBe("allow");
		const third = handler.registerStream("org-a", "sol-usd");
		expect(third).toEqual({
			action: "reject",
			reason: "TENANT_STREAM_QUOTA_EXCEEDED",
		});
	});

	test("rejects duplicate flood on the same stream inside the window", () => {
		const handler = new RealtimeIngestBackpressureHandler({
			maxStreamsPerTenant: 4,
			maxEventsPerStreamPerWindow: 2,
			windowMs: 1_000,
			now: () => 1_000,
		});
		expect(handler.admitEvent("org-a", "btc-usd")).toEqual({ action: "allow" });
		expect(handler.admitEvent("org-a", "btc-usd")).toEqual({ action: "allow" });
		expect(handler.admitEvent("org-a", "btc-usd")).toEqual({
			action: "reject",
			reason: "STREAM_EVENT_QUOTA_EXCEEDED",
		});
	});

	test("resets event quota after the backpressure window elapses", () => {
		let clock = 0;
		const handler = new RealtimeIngestBackpressureHandler({
			maxStreamsPerTenant: 4,
			maxEventsPerStreamPerWindow: 1,
			windowMs: 100,
			now: () => clock,
		});
		expect(handler.admitEvent("org-a", "btc-usd").action).toBe("allow");
		expect(handler.admitEvent("org-a", "btc-usd").action).toBe("reject");
		clock = 150;
		expect(handler.admitEvent("org-a", "btc-usd").action).toBe("allow");
	});

	test("releaseStream frees tenant stream slot", () => {
		const handler = new RealtimeIngestBackpressureHandler({
			maxStreamsPerTenant: 1,
			maxEventsPerStreamPerWindow: 5,
			windowMs: 1_000,
		});
		expect(handler.registerStream("org-a", "btc-usd").action).toBe("allow");
		expect(handler.registerStream("org-a", "eth-usd").action).toBe("reject");
		handler.releaseStream("org-a", "btc-usd");
		expect(handler.registerStream("org-a", "eth-usd").action).toBe("allow");
	});
});
