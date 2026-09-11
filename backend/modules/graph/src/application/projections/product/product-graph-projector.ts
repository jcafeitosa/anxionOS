/**
 * ANX-277 — Product Graph projector (`product.work_item.status_changed.v1` → WorkItem).
 * Importers: product-graph-projection-worker, `@anxionos/graph` index, `backend/tests/graph/*`.
 * Schema: `workItemStatusChangedPayloadSchema` in `@anxionos/contracts/graph`.
 * User instruction: implement ANX-277 Neo4j projection worker sandbox after ADR0005 greenlight.
 */
import {
	intelligenceFeedsBackPayloadSchema,
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
	workItemStatusChangedPayloadSchema,
} from "@anxionos/contracts/graph";
import { GRAPH_PRODUCT_CONSUMER_NAME } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";
import type { ProjectionHandlerContext } from "../inbox/projection-handler";

function organizationNodeKey(companyId: string, type: string, id: string) {
	return {
		scopeType: "ORGANIZATION" as const,
		scopeId: companyId,
		type,
		id,
	};
}

function workItemNodeKey(companyId: string, workItemId: string) {
	return organizationNodeKey(companyId, "WorkItem", workItemId);
}

function featureNodeKey(companyId: string, featureId: string) {
	return organizationNodeKey(companyId, "Feature", featureId);
}

function monitorNodeKey(companyId: string, monitorId: string) {
	return organizationNodeKey(companyId, "Monitor", monitorId);
}

function problemNodeKey(companyId: string, problemId: string) {
	return organizationNodeKey(companyId, "Problem", problemId);
}

function parseIntelligenceFeedsBack(payload: unknown) {
	const parsed = intelligenceFeedsBackPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid intelligence.feeds_back payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseWorkItemStatusChanged(payload: unknown) {
	const parsed = workItemStatusChangedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid work_item.status_changed payload",
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

function toWorkItemRecord(
	payload: ReturnType<typeof parseWorkItemStatusChanged>,
	projectionGeneration: number,
) {
	return {
		nodeKey: workItemNodeKey(payload.companyId, payload.workItemId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		status: payload.status,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			companyId: payload.companyId,
			title: payload.title,
			featureId: payload.featureId,
			trackedInFeatureId: payload.featureId,
		},
	};
}

function toMonitorRecord(
	payload: ReturnType<typeof parseIntelligenceFeedsBack>,
	projectionGeneration: number,
) {
	return {
		nodeKey: monitorNodeKey(payload.companyId, payload.monitorId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		status: "breached",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			metricName: payload.metricName,
			metricValue: payload.metricValue,
			threshold: payload.threshold,
			unit: payload.unit,
			insightSummary: payload.insightSummary,
		},
	};
}

function toProblemRecord(
	payload: ReturnType<typeof parseIntelligenceFeedsBack>,
	projectionGeneration: number,
) {
	return {
		nodeKey: problemNodeKey(payload.companyId, payload.problemId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		status: "open",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			statement: payload.problemStatement,
			insightSummary: payload.insightSummary,
			triggerDiscovery: payload.triggerDiscovery,
		},
	};
}

function toFeedsBackEdge(
	payload: ReturnType<typeof parseIntelligenceFeedsBack>,
	projectionGeneration: number,
) {
	return {
		edgeType: "FEEDS_BACK",
		fromNodeKey: monitorNodeKey(payload.companyId, payload.monitorId),
		toNodeKey: problemNodeKey(payload.companyId, payload.problemId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			metricName: payload.metricName,
			metricValue: payload.metricValue,
			threshold: payload.threshold,
		},
	};
}

function toFeatureRecord(
	payload: ReturnType<typeof parseWorkItemStatusChanged>,
	projectionGeneration: number,
) {
	return {
		nodeKey: featureNodeKey(payload.companyId, payload.featureId!),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		status: "active",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			companyId: payload.companyId,
			featureId: payload.featureId,
		},
	};
}

function toTrackedInEdge(
	payload: ReturnType<typeof parseWorkItemStatusChanged>,
	projectionGeneration: number,
) {
	return {
		edgeType: "TRACKED_IN",
		fromNodeKey: featureNodeKey(payload.companyId, payload.featureId!),
		toNodeKey: workItemNodeKey(payload.companyId, payload.workItemId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			workItemId: payload.workItemId,
			featureId: payload.featureId,
		},
	};
}

/** Projects product domain events into graph WorkItem nodes (mock-friendly port). */
export async function projectProductGraphEvent(
	context: ProjectionHandlerContext,
) {
	const { envelope, graphStore, projectionGeneration } = context;
	switch (envelope.eventType) {
		case PRODUCT_GRAPH_EVENT_TYPES.INTELLIGENCE_FEEDS_BACK: {
			const payload = parseIntelligenceFeedsBack(envelope.payload);
			const monitorKey = monitorNodeKey(payload.companyId, payload.monitorId);
			const existing = await graphStore.getNode(monitorKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toMonitorRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			await graphStore.upsertNode(
				toProblemRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			await graphStore.upsertEdge(
				toFeedsBackEdge(payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED: {
			const payload = parseWorkItemStatusChanged(envelope.payload);
			const nodeKey = workItemNodeKey(payload.companyId, payload.workItemId);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toWorkItemRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			if (payload.featureId) {
				await graphStore.upsertNode(
					toFeatureRecord(payload, projectionGeneration),
					envelope.eventId,
				);
				await graphStore.upsertEdge(
					toTrackedInEdge(payload, projectionGeneration),
					envelope.eventId,
				);
			}
			return;
		}
		default:
			throw new ProjectionError(
				"Unsupported product graph event",
				"SCHEMA_UNKNOWN",
				"permanent",
			);
	}
}

export const productProjectionConsumer = {
	consumerName: GRAPH_PRODUCT_CONSUMER_NAME,
	ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
	project: projectProductGraphEvent,
};
