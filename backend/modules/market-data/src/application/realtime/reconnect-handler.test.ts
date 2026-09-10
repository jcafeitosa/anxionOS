import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { RealtimeIngestReconnectHandler } from "./reconnect-handler";
import {
	MARKET_DATA_REALTIME_LIMIT_DEFAULTS,
	resolveReconnectDedupeWindow,
} from "../../domain/realtime-ingest-limits";

const TENANT = "00000000-0000-4000-8000-000000000001";
const STREAM = "btc-usd@binance";

function fingerprint(
	overrides: Partial<{ eventId: string; sourceEventId: string }> = {},
) {
	return {
		eventId: overrides.eventId ?? randomUUID(),
		sourceEventId: overrides.sourceEventId ?? randomUUID(),
	};
}

describe("realtime ingest reconnect limits (ANX-329 S3b)", () => {
	test("defaults include reconnect dedupe window", () => {
		expect(resolveReconnectDedupeWindow()).toBe(
			MARKET_DATA_REALTIME_LIMIT_DEFAULTS.reconnectDedupeWindow,
		);
	});

	test("env override tunes reconnect dedupe window", () => {
		process.env.MARKET_DATA_RECONNECT_DEDUPE_WINDOW = "128";
		expect(resolveReconnectDedupeWindow()).toBe(128);
		delete process.env.MARKET_DATA_RECONNECT_DEDUPE_WINDOW;
	});
});

describe("RealtimeIngestReconnectHandler", () => {
	test("admits first event on a fresh stream", () => {
		const handler = new RealtimeIngestReconnectHandler();
		handler.registerStream(TENANT, STREAM);
		const event = fingerprint();
		expect(handler.admitEvent(TENANT, STREAM, event)).toEqual({
			action: "admit",
		});
	});

	test("skips duplicate transport eventId on reconnect redelivery", () => {
		const handler = new RealtimeIngestReconnectHandler();
		handler.registerStream(TENANT, STREAM);
		const event = fingerprint();
		expect(handler.admitEvent(TENANT, STREAM, event).action).toBe("admit");
		handler.markDisconnected(TENANT, STREAM);
		handler.onReconnect(TENANT, STREAM);
		expect(handler.admitEvent(TENANT, STREAM, event)).toEqual({
			action: "skip",
			reason: "DUPLICATE_TRANSPORT_EVENT_ID",
		});
	});

	test("skips reconnect replay with new transport id but same sourceEventId", () => {
		const handler = new RealtimeIngestReconnectHandler();
		handler.registerStream(TENANT, STREAM);
		const sourceEventId = randomUUID();
		const first = fingerprint({ sourceEventId });
		expect(handler.admitEvent(TENANT, STREAM, first).action).toBe("admit");
		handler.markDisconnected(TENANT, STREAM);
		handler.onReconnect(TENANT, STREAM);
		const replay = fingerprint({ sourceEventId, eventId: randomUUID() });
		expect(handler.admitEvent(TENANT, STREAM, replay)).toEqual({
			action: "skip",
			reason: "DUPLICATE_SOURCE_EVENT_ID",
		});
	});

	test("onReconnect bumps connection generation and preserves dedupe window", () => {
		let clock = 1_000;
		const handler = new RealtimeIngestReconnectHandler({
			now: () => clock,
		});
		handler.registerStream(TENANT, STREAM);
		const event = fingerprint();
		handler.admitEvent(TENANT, STREAM, event);
		handler.markDisconnected(TENANT, STREAM);
		const reconnect = handler.onReconnect(TENANT, STREAM);
		expect(reconnect.connectionGeneration).toBe(2);
		const snap = handler.snapshot(TENANT, STREAM);
		expect(snap?.phase).toBe("active");
		expect(snap?.lastDisconnectedAt).toBeNull();
		expect(snap?.seenSourceEventCount).toBe(1);
		expect(handler.admitEvent(TENANT, STREAM, event).action).toBe("skip");
	});

	test("bounded dedupe window evicts oldest fingerprints", () => {
		const handler = new RealtimeIngestReconnectHandler({ dedupeWindow: 2 });
		handler.registerStream(TENANT, STREAM);
		const first = fingerprint();
		const second = fingerprint();
		const third = fingerprint();
		expect(handler.admitEvent(TENANT, STREAM, first).action).toBe("admit");
		expect(handler.admitEvent(TENANT, STREAM, second).action).toBe("admit");
		expect(handler.admitEvent(TENANT, STREAM, third).action).toBe("admit");
		expect(handler.admitEvent(TENANT, STREAM, first).action).toBe("admit");
	});

	test("releaseStream clears reconnect state for the stream", () => {
		const handler = new RealtimeIngestReconnectHandler();
		handler.registerStream(TENANT, STREAM);
		const event = fingerprint();
		handler.admitEvent(TENANT, STREAM, event);
		handler.releaseStream(TENANT, STREAM);
		expect(handler.snapshot(TENANT, STREAM)).toBeNull();
		handler.registerStream(TENANT, STREAM);
		expect(handler.admitEvent(TENANT, STREAM, event)).toEqual({
			action: "admit",
		});
	});
});
