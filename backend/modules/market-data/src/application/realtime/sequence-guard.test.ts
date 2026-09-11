import { describe, expect, test } from "bun:test";
import {
	MARKET_DATA_REALTIME_LIMIT_DEFAULTS,
	resolveSequenceGapThresholdMs,
} from "../../domain/realtime-ingest-limits";
import { RealtimeIngestSequenceGuard } from "./sequence-guard";

const TENANT = "00000000-0000-4000-8000-000000000001";
const STREAM = "md_ins_btc_usd";

function iso(ms: number): string {
	return new Date(ms).toISOString();
}

describe("realtime ingest sequence limits (ANX-329 S3d)", () => {
	test("defaults include sequence gap threshold", () => {
		expect(resolveSequenceGapThresholdMs()).toBe(
			MARKET_DATA_REALTIME_LIMIT_DEFAULTS.sequenceGapThresholdMs,
		);
	});

	test("env override tunes sequence gap threshold", () => {
		process.env.MARKET_DATA_SEQUENCE_GAP_THRESHOLD_MS = "5000";
		expect(resolveSequenceGapThresholdMs()).toBe(5000);
		delete process.env.MARKET_DATA_SEQUENCE_GAP_THRESHOLD_MS;
	});
});

describe("RealtimeIngestSequenceGuard", () => {
	test("admits first event with OK quality", () => {
		const guard = new RealtimeIngestSequenceGuard();
		guard.registerStream(TENANT, STREAM);
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_000) })).toEqual(
			{ action: "admit", qualityFlag: "OK" },
		);
	});

	test("flags out-of-order eventTime as ESTIMATED", () => {
		const guard = new RealtimeIngestSequenceGuard();
		guard.registerStream(TENANT, STREAM);
		guard.admitEvent(TENANT, STREAM, { eventTime: iso(2_000) });
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_500) })).toEqual(
			{ action: "admit", qualityFlag: "ESTIMATED" },
		);
	});

	test("flags eventTime gap as STALE", () => {
		const guard = new RealtimeIngestSequenceGuard({ gapThresholdMs: 1_000 });
		guard.registerStream(TENANT, STREAM);
		guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_000) });
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(3_000) })).toEqual(
			{ action: "admit", qualityFlag: "STALE" },
		);
	});

	test("flags stream sequence gap and out-of-order sequence", () => {
		const guard = new RealtimeIngestSequenceGuard();
		guard.registerStream(TENANT, STREAM);
		guard.admitEvent(TENANT, STREAM, {
			eventTime: iso(1_000),
			streamSequence: 1,
		});
		expect(
			guard.admitEvent(TENANT, STREAM, {
				eventTime: iso(1_100),
				streamSequence: 3,
			}),
		).toEqual({ action: "admit", qualityFlag: "STALE" });
		expect(
			guard.admitEvent(TENANT, STREAM, {
				eventTime: iso(1_200),
				streamSequence: 3,
			}),
		).toEqual({ action: "admit", qualityFlag: "ESTIMATED" });
	});

	test("rejects anomalies when rejectAnomalies is enabled", () => {
		const guard = new RealtimeIngestSequenceGuard({ rejectAnomalies: true });
		guard.registerStream(TENANT, STREAM);
		guard.admitEvent(TENANT, STREAM, { eventTime: iso(2_000) });
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_000) })).toEqual(
			{ action: "reject", reason: "OUT_OF_ORDER_EVENT_TIME" },
		);
	});

	test("onReconnect marks first post-resync event STALE when no baseline", () => {
		const guard = new RealtimeIngestSequenceGuard();
		guard.registerStream(TENANT, STREAM);
		guard.markDisconnected(TENANT, STREAM);
		guard.onReconnect(TENANT, STREAM);
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(5_000) })).toEqual(
			{ action: "admit", qualityFlag: "STALE" },
		);
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(5_100) })).toEqual(
			{ action: "admit", qualityFlag: "OK" },
		);
	});

	test("releaseStream clears sequence state", () => {
		const guard = new RealtimeIngestSequenceGuard();
		guard.registerStream(TENANT, STREAM);
		guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_000) });
		guard.releaseStream(TENANT, STREAM);
		expect(guard.snapshot(TENANT, STREAM)).toBeNull();
		guard.registerStream(TENANT, STREAM);
		expect(guard.admitEvent(TENANT, STREAM, { eventTime: iso(1_000) })).toEqual(
			{ action: "admit", qualityFlag: "OK" },
		);
	});
});
