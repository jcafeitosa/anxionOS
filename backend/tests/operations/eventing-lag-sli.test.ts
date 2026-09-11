import { describe, expect, test } from "bun:test";
import { createMetricsCollector } from "@anxionos/observability";
import {
	DEFAULT_EVENTING_LAG_THRESHOLDS,
	computeLagMs,
	evaluateEventingLagSli,
	recordEventingLagSli,
	type EventingLagQueryPort,
	type EventingLagSample,
	type LagAlertHook,
} from "@anxionos/operations";

function createStubLagQuery(
	samples: {
		outbox?: EventingLagSample[];
		inbox?: EventingLagSample[];
	},
): EventingLagQueryPort {
	return {
		getOutboxLagSamples: async () => samples.outbox ?? [],
		getInboxLagSamples: async () => samples.inbox ?? [],
	};
}

describe("eventing lag SLI (ANX-170 S2)", () => {
	test("computeLagMs returns age of oldest pending event", () => {
		expect(
			computeLagMs("2026-09-11T10:00:00.000Z", "2026-09-11T10:00:45.000Z"),
		).toBe(45_000);
		expect(computeLagMs("invalid", "2026-09-11T10:00:00.000Z")).toBe(0);
	});

	test("evaluateEventingLagSli respects warn and critical thresholds", () => {
		const t = DEFAULT_EVENTING_LAG_THRESHOLDS;
		expect(evaluateEventingLagSli(10_000, t)).toBe("ok");
		expect(evaluateEventingLagSli(30_000, t)).toBe("warn");
		expect(evaluateEventingLagSli(59_999, t)).toBe("warn");
		expect(evaluateEventingLagSli(60_000, t)).toBe("critical");
	});

	test("recordEventingLagSli records histogram and skips alerts when healthy", async () => {
		const metrics = createMetricsCollector();
		const now = "2026-09-11T10:01:00.000Z";
		const result = await recordEventingLagSli({
			metrics,
			now: () => now,
			lagQuery: createStubLagQuery({
				outbox: [
					{
						channel: "outbox",
						ownerDomain: "decisions",
						oldestPendingAt: "2026-09-11T10:00:50.000Z",
						pendingCount: 3,
					},
				],
			}),
		});

		expect(result.samples).toHaveLength(1);
		expect(result.samples[0]?.lagMs).toBe(10_000);
		expect(result.samples[0]?.status).toBe("ok");
		expect(result.alerts).toHaveLength(0);

		const snap = metrics.getSnapshot();
		expect(snap.histograms["operations.eventing.lag:channel=outbox,owner_domain=decisions"]).toEqual([
			10_000,
		]);
		expect(snap.counters["operations.eventing.lag.alerts:channel=outbox,owner_domain=decisions,severity=warn"]).toBeUndefined();
	});

	test("recordEventingLagSli fires alert hook and counter on critical lag", async () => {
		const metrics = createMetricsCollector();
		const captured: Array<{
			severity: string;
			lagMs: number;
			channel: string;
		}> = [];
		const alerts: LagAlertHook[] = [
			{
				onLagAlert(alert) {
					captured.push(alert);
				},
			},
		];

		const result = await recordEventingLagSli({
			metrics,
			alertHooks: alerts,
			now: () => "2026-09-11T10:02:00.000Z",
			lagQuery: createStubLagQuery({
				outbox: [
					{
						channel: "outbox",
						ownerDomain: "governance",
						oldestPendingAt: "2026-09-11T10:00:00.000Z",
						pendingCount: 12,
					},
				],
				inbox: [
					{
						channel: "inbox",
						consumerName: "graph-projection",
						oldestPendingAt: "2026-09-11T10:01:20.000Z",
						pendingCount: 2,
					},
				],
			}),
		});

		expect(result.samples).toHaveLength(2);
		expect(result.alerts).toHaveLength(2);
		expect(result.alerts[0]).toMatchObject({
			channel: "outbox",
			severity: "critical",
			lagMs: 120_000,
			pendingCount: 12,
			ownerDomain: "governance",
		});
		expect(result.alerts[1]).toMatchObject({
			channel: "inbox",
			severity: "warn",
			lagMs: 40_000,
			consumerName: "graph-projection",
		});
		expect(captured).toHaveLength(2);

		const snap = metrics.getSnapshot();
		expect(
			snap.counters[
				"operations.eventing.lag.alerts:channel=outbox,owner_domain=governance,severity=critical"
			],
		).toBe(1);
		expect(
			snap.counters[
				"operations.eventing.lag.alerts:channel=inbox,consumer=graph-projection,severity=warn"
			],
		).toBe(1);
	});
});
