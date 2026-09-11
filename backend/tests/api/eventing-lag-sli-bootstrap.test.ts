import { afterEach, describe, expect, test } from "bun:test";
import { createMetricsCollector } from "@anxionos/observability";
import {
	createPgEventingLagQueryAdapter,
	type EventingLagQueryPort,
	type EventingLagSample,
} from "@anxionos/operations";
import {
	createEventingLagSliTicker,
	runEventingLagSliTick,
	startEventingLagSliTicker,
} from "../../apps/api/src/operations/bootstrap-eventing-lag-sli";
import { withEventingPgHarness } from "../eventing/test-support";

function createStubLagQuery(samples: {
	outbox?: EventingLagSample[];
	inbox?: EventingLagSample[];
}): EventingLagQueryPort {
	return {
		getOutboxLagSamples: async () => samples.outbox ?? [],
		getInboxLagSamples: async () => samples.inbox ?? [],
	};
}

describe("eventing lag SLI bootstrap (ANX-170 S3)", () => {
	const originalDisabled = process.env.EVENTING_LAG_SLI_DISABLED;

	afterEach(() => {
		if (originalDisabled === undefined) {
			delete process.env.EVENTING_LAG_SLI_DISABLED;
		} else {
			process.env.EVENTING_LAG_SLI_DISABLED = originalDisabled;
		}
	});

	test("startEventingLagSliTicker is no-op when disabled by env", () => {
		process.env.EVENTING_LAG_SLI_DISABLED = "true";
		const metrics = createMetricsCollector();
		const handle = startEventingLagSliTicker(
			{ query: async () => ({ rows: [] }) } as never,
			metrics,
		);
		handle.stop();
		expect(metrics.getSnapshot().histograms).toEqual({});
	});

	test("runEventingLagSliTick records metrics via injected lag query port", async () => {
		const metrics = createMetricsCollector();
		await runEventingLagSliTick({
			metrics,
			now: () => "2026-09-11T10:01:00.000Z",
			lagQuery: createStubLagQuery({
				outbox: [
					{
						channel: "outbox",
						ownerDomain: "operations",
						oldestPendingAt: "2026-09-11T10:00:50.000Z",
						pendingCount: 1,
					},
				],
			}),
			alertHooks: [],
		});

		const snap = metrics.getSnapshot();
		expect(
			snap.histograms[
				"operations.eventing.lag:channel=outbox,owner_domain=operations"
			],
		).toEqual([10_000]);
	});

	test("createEventingLagSliTicker runs initial tick and can be stopped", async () => {
		const metrics = createMetricsCollector();
		let tickCount = 0;
		const lagQuery = createStubLagQuery({
			outbox: [
				{
					channel: "outbox",
					ownerDomain: "api",
					oldestPendingAt: "2026-09-11T10:00:00.000Z",
					pendingCount: 2,
				},
			],
		});
		const wrappedQuery: EventingLagQueryPort = {
			getOutboxLagSamples: async () => {
				tickCount += 1;
				return lagQuery.getOutboxLagSamples();
			},
			getInboxLagSamples: async () => lagQuery.getInboxLagSamples(),
		};

		const handle = createEventingLagSliTicker({
			metrics,
			lagQuery: wrappedQuery,
			now: () => "2026-09-11T10:01:00.000Z",
			intervalMs: 60_000,
			alertHooks: [],
		});

		await new Promise((resolve) => setTimeout(resolve, 20));
		handle.stop();
		expect(tickCount).toBeGreaterThanOrEqual(1);
	});

	test(
		"PG adapter records outbox lag from pending rows",
		async () => {
			await withEventingPgHarness(async ({ pool }) => {
				const occurredAt = new Date(Date.now() - 15_000).toISOString();
				await pool.query(
					`INSERT INTO outbox (event_id, owner_domain, event_type, schema_version, occurred_at, payload, status)
					 VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb, 'pending')`,
					[
						"evt-lag-s3-1",
						"operations",
						"test.lag",
						"1",
						occurredAt,
						JSON.stringify({ probe: true }),
					],
				);

				const metrics = createMetricsCollector();
				await runEventingLagSliTick({
					metrics,
					lagQuery: createPgEventingLagQueryAdapter(pool),
				});

				const snap = metrics.getSnapshot();
				const key = Object.keys(snap.histograms).find((entry) =>
					entry.startsWith(
						"operations.eventing.lag:channel=outbox,owner_domain=operations",
					),
				);
				expect(key).toBeDefined();
				const lagMs = snap.histograms[key!]?.[0];
				expect(lagMs).toBeGreaterThanOrEqual(14_000);
				expect(lagMs).toBeLessThan(120_000);
			});
		},
		{ skip: process.env.RUN_PG_INTEGRATION_TESTS !== "true" },
	);
});
