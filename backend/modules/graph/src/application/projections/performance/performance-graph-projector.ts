/**
 * ANX-154 S5 — Performance Graph projector (`performance.*.v1` → Outcome / PositionExposure / MetricSeries).
 * PG remains authoritative; Neo4j projection is reconstructible from domain events.
 */
import {
	metricSnapshotPayloadSchema,
	outcomeRecordedPayloadSchema,
	PERFORMANCE_EVENT_TYPES,
	PERFORMANCE_OWNER_DOMAIN,
	positionExposureRecordedPayloadSchema,
} from "@anxionos/contracts/performance";
import { GRAPH_PERFORMANCE_CONSUMER_NAME } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";
import type { ProjectionHandlerContext } from "../inbox/projection-handler";

function agencyNodeKey(organizationId: string, type: string, id: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId: organizationId,
		type,
		id,
	};
}

function outcomeNodeKey(organizationId: string, outcomeSnapshotId: string) {
	return agencyNodeKey(organizationId, "Outcome", outcomeSnapshotId);
}

function positionExposureNodeKey(
	organizationId: string,
	positionExposureSnapshotId: string,
) {
	return agencyNodeKey(
		organizationId,
		"PositionExposureSnapshot",
		positionExposureSnapshotId,
	);
}

function metricSeriesNodeKey(organizationId: string, metricSeriesId: string) {
	return agencyNodeKey(organizationId, "MetricSeries", metricSeriesId);
}

function parseOutcomeRecorded(payload: unknown) {
	const parsed = outcomeRecordedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid performance.outcome.recorded payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseMetricSnapshot(payload: unknown) {
	const parsed = metricSnapshotPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid performance.metric.snapshot payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	if (
		!parsed.data.outcomeSnapshotId &&
		!parsed.data.positionExposureSnapshotId
	) {
		throw new ProjectionError(
			"Invalid performance.metric.snapshot payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parsePositionExposureRecorded(payload: unknown) {
	const parsed = positionExposureRecordedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid performance.position_exposure.recorded payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function isStaleRevision(
	incomingRevision: number,
	existing: { revision: number } | null,
) {
	return existing !== null && incomingRevision <= existing.revision;
}

function revisionFromObservedAt(observedAt: string): number {
	const parsed = Date.parse(observedAt);
	if (!Number.isFinite(parsed)) {
		throw new ProjectionError(
			"Invalid observedAt for performance projection",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed;
}

function toOutcomeRecord(
	payload: ReturnType<typeof parseOutcomeRecorded>,
	projectionGeneration: number,
) {
	return {
		nodeKey: outcomeNodeKey(payload.organizationId, payload.outcomeSnapshotId),
		schemaVersion: 1,
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		status: "recorded",
		revision: revisionFromObservedAt(payload.recordedAt),
		projectionGeneration,
		payload: {
			organizationId: payload.organizationId,
			journalEntryId: payload.journalEntryId,
			valueDate: payload.valueDate,
			recordedAt: payload.recordedAt,
			lineCount: payload.linesSummary.length,
		},
	};
}

function toPositionExposureRecord(
	payload: ReturnType<typeof parsePositionExposureRecorded>,
	projectionGeneration: number,
) {
	return {
		nodeKey: positionExposureNodeKey(
			payload.organizationId,
			payload.positionExposureSnapshotId,
		),
		schemaVersion: 1,
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		status: "recorded",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			organizationId: payload.organizationId,
			portfolioId: payload.portfolioId,
			positionId: payload.positionId,
			revision: payload.revision,
			instrumentId: payload.instrumentId,
			positionSide: payload.positionSide,
			book: payload.book,
			quantity: payload.quantity,
			fillId: payload.fillId,
			side: payload.side,
			provisionalCash: payload.provisionalCash,
			observedAt: payload.observedAt,
		},
	};
}

function toMetricSeriesRecord(
	payload: ReturnType<typeof parseMetricSnapshot>,
	projectionGeneration: number,
) {
	return {
		nodeKey: metricSeriesNodeKey(
			payload.organizationId,
			payload.metricSeriesId,
		),
		schemaVersion: 1,
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		status: "active",
		revision: revisionFromObservedAt(payload.observedAt),
		projectionGeneration,
		payload: {
			organizationId: payload.organizationId,
			metricName: payload.metricName,
			metricValue: payload.metricValue,
			observedAt: payload.observedAt,
			outcomeSnapshotId: payload.outcomeSnapshotId ?? null,
			positionExposureSnapshotId: payload.positionExposureSnapshotId ?? null,
		},
	};
}

function toHasMetricEdge(
	parentNodeKey: ReturnType<typeof agencyNodeKey>,
	payload: ReturnType<typeof parseMetricSnapshot>,
	projectionGeneration: number,
) {
	return {
		edgeType: "HAS_METRIC",
		fromNodeKey: parentNodeKey,
		toNodeKey: metricSeriesNodeKey(
			payload.organizationId,
			payload.metricSeriesId,
		),
		schemaVersion: 1,
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		revision: revisionFromObservedAt(payload.observedAt),
		projectionGeneration,
		payload: {
			metricName: payload.metricName,
			metricValue: payload.metricValue,
			observedAt: payload.observedAt,
		},
	};
}

/** Projects performance domain events into institutional graph nodes (PERF-R05). */
export async function projectPerformanceGraphEvent(
	context: ProjectionHandlerContext,
) {
	const { envelope, graphStore, projectionGeneration } = context;
	switch (envelope.eventType) {
		case PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED: {
			const payload = parseOutcomeRecorded(envelope.payload);
			const nodeKey = outcomeNodeKey(
				payload.organizationId,
				payload.outcomeSnapshotId,
			);
			const existing = await graphStore.getNode(nodeKey);
			const incomingRevision = revisionFromObservedAt(payload.recordedAt);
			if (isStaleRevision(incomingRevision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toOutcomeRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case PERFORMANCE_EVENT_TYPES.POSITION_EXPOSURE_RECORDED: {
			const payload = parsePositionExposureRecorded(envelope.payload);
			const nodeKey = positionExposureNodeKey(
				payload.organizationId,
				payload.positionExposureSnapshotId,
			);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toPositionExposureRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case PERFORMANCE_EVENT_TYPES.METRIC_SNAPSHOT: {
			const payload = parseMetricSnapshot(envelope.payload);
			const metricKey = metricSeriesNodeKey(
				payload.organizationId,
				payload.metricSeriesId,
			);
			const existing = await graphStore.getNode(metricKey);
			const incomingRevision = revisionFromObservedAt(payload.observedAt);
			if (isStaleRevision(incomingRevision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toMetricSeriesRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			const parentNodeKey = payload.outcomeSnapshotId
				? outcomeNodeKey(payload.organizationId, payload.outcomeSnapshotId)
				: positionExposureNodeKey(
						payload.organizationId,
						payload.positionExposureSnapshotId!,
					);
			await graphStore.upsertEdge(
				toHasMetricEdge(parentNodeKey, payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		default:
			throw new ProjectionError(
				"Unsupported performance graph event",
				"SCHEMA_UNKNOWN",
				"permanent",
			);
	}
}

export const performanceProjectionConsumer = {
	consumerName: GRAPH_PERFORMANCE_CONSUMER_NAME,
	ownerDomain: PERFORMANCE_OWNER_DOMAIN,
	project: projectPerformanceGraphEvent,
};
