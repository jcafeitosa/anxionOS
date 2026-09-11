/**
 * ANX-154 S5 — performance graph projector unit tests.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	PERFORMANCE_EVENT_TYPES,
	PERFORMANCE_OWNER_DOMAIN,
} from "@anxionos/contracts/performance";
import {
	createInMemoryGraphStore,
	formatNodeKey,
	projectPerformanceGraphEvent,
} from "@anxionos/graph";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const outcomeSnapshotId = "perf_out_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const positionExposureSnapshotId =
	"perf_pes_cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const metricSeriesId = "perf_mtr_dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function outcomeRecordedEnvelope(
	overrides: Record<string, unknown> = {},
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		eventType: PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED,
		occurredAt: "2026-09-11T12:00:00.000Z",
		payload: {
			outcomeSnapshotId,
			organizationId,
			journalEntryId: "acc_je_11111111-1111-4111-8111-111111111111",
			valueDate: "2026-09-11",
			linesSummary: [
				{
					accountCode: "cash",
					debit: "0",
					credit: "100",
					asset: "USD",
					amount: "100",
				},
				{
					accountCode: "position",
					debit: "100",
					credit: "0",
					asset: "BTC",
					amount: "100",
				},
			],
			recordedAt: "2026-09-11T12:00:00.000Z",
			...overrides,
		},
	};
}

function metricSnapshotEnvelope(
	overrides: Record<string, unknown> = {},
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		eventType: PERFORMANCE_EVENT_TYPES.METRIC_SNAPSHOT,
		occurredAt: "2026-09-11T12:00:00.000Z",
		payload: {
			metricSeriesId,
			organizationId,
			outcomeSnapshotId,
			metricName: "cash_net_delta",
			metricValue: "248.75",
			observedAt: "2026-09-11T12:00:00.000Z",
			...overrides,
		},
	};
}

describe("performance-graph-projector (ANX-154 S5)", () => {
	test("projects outcome.recorded into Outcome node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectPerformanceGraphEvent({
			envelope: outcomeRecordedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "Outcome",
			id: outcomeSnapshotId,
		});
		expect(record?.ownerDomain).toBe(PERFORMANCE_OWNER_DOMAIN);
		expect(record?.payload.journalEntryId).toBe(
			"acc_je_11111111-1111-4111-8111-111111111111",
		);
	});

	test("projects metric.snapshot with HAS_METRIC edge to Outcome parent", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectPerformanceGraphEvent({
			envelope: outcomeRecordedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		await projectPerformanceGraphEvent({
			envelope: metricSnapshotEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		const metric = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "MetricSeries",
			id: metricSeriesId,
		});
		expect(metric?.payload.metricValue).toBe("248.75");
		const parentKey = formatNodeKey({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "Outcome",
			id: outcomeSnapshotId,
		});
		const childKey = formatNodeKey({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "MetricSeries",
			id: metricSeriesId,
		});
		expect(
			graphStore.edges.some(
				(edge) =>
					edge.edgeType === "HAS_METRIC" &&
					formatNodeKey(edge.from) === parentKey &&
					formatNodeKey(edge.to) === childKey,
			),
		).toBe(true);
	});

	test("skips stale position exposure revision", async () => {
		const graphStore = createInMemoryGraphStore();
		const basePayload = {
			positionExposureSnapshotId,
			organizationId,
			portfolioId: "pf_prt_11111111-1111-4111-8111-111111111111",
			positionId: "pf_pos_22222222-2222-4222-8222-222222222222",
			revision: 2,
			instrumentId: "BTC-USD",
			positionSide: "LONG",
			book: "primary",
			quantity: "2.0",
			fillId: "ex_fill_33333333-3333-4333-8333-333333333333",
			side: "BUY",
			provisionalCash: false,
			observedAt: "2026-09-11T12:00:00.000Z",
		};
		await projectPerformanceGraphEvent({
			envelope: {
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: PERFORMANCE_OWNER_DOMAIN,
				eventType: PERFORMANCE_EVENT_TYPES.POSITION_EXPOSURE_RECORDED,
				occurredAt: "2026-09-11T12:00:00.000Z",
				payload: basePayload,
			},
			graphStore,
			projectionGeneration: 1,
		});
		await projectPerformanceGraphEvent({
			envelope: {
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: PERFORMANCE_OWNER_DOMAIN,
				eventType: PERFORMANCE_EVENT_TYPES.POSITION_EXPOSURE_RECORDED,
				occurredAt: "2026-09-11T11:00:00.000Z",
				payload: { ...basePayload, revision: 1, quantity: "1.0" },
			},
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "PositionExposureSnapshot",
			id: positionExposureSnapshotId,
		});
		expect(record?.revision).toBe(2);
		expect(record?.payload.quantity).toBe("2.0");
	});

	test("re-projecting same metric snapshot is idempotent", async () => {
		const graphStore = createInMemoryGraphStore();
		const envelope = metricSnapshotEnvelope();
		await projectPerformanceGraphEvent({
			envelope,
			graphStore,
			projectionGeneration: 1,
		});
		await projectPerformanceGraphEvent({
			envelope: { ...envelope, eventId: randomUUID() },
			graphStore,
			projectionGeneration: 2,
		});
		expect(graphStore.records.size).toBe(1);
		expect(graphStore.edges.length).toBe(1);
	});
});
