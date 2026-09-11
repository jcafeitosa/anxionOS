/**
 * ANX-277 — Agent Graph projector (Decision + AgentRole nodes from agents domain events).
 * Importers: product-graph-projection-worker, `@anxionos/graph` index, `backend/tests/graph/*`.
 * Schemas: `decisionRecordedPayloadSchema`, `agentRoleAssignedPayloadSchema`.
 * User instruction: implement ANX-277 Neo4j projection worker sandbox after ADR0005 greenlight.
 */
import {
	AGENT_GRAPH_EVENT_TYPES,
	AGENT_GRAPH_OWNER_DOMAIN,
	agentRoleAssignedPayloadSchema,
	decisionRecordedPayloadSchema,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import { GRAPH_AGENTS_CONSUMER_NAME } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";
import type { ProjectionHandlerContext } from "../inbox/projection-handler";
import { projectAgentsCoreGraphEvent } from "./agents-core-graph-projector";

function decisionNodeKey(scopeId: string, decisionId: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId,
		type: "Decision",
		id: decisionId,
	};
}

function agentRoleNodeKey(companyId: string, agentRoleId: string) {
	return {
		scopeType: "ORGANIZATION" as const,
		scopeId: companyId,
		type: "AgentRole",
		id: agentRoleId,
	};
}

function agentNodeKey(scopeId: string, agentId: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId,
		type: "Agent",
		id: agentId,
	};
}

function workItemNodeKey(companyId: string, workItemId: string) {
	return {
		scopeType: "ORGANIZATION" as const,
		scopeId: companyId,
		type: "WorkItem",
		id: workItemId,
	};
}

function parseDecisionRecorded(payload: unknown) {
	const parsed = decisionRecordedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid decision.recorded payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseAgentRoleAssigned(payload: unknown) {
	const parsed = agentRoleAssignedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid agent.role_assigned payload",
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

function toDecisionRecord(
	payload: ReturnType<typeof parseDecisionRecorded>,
	projectionGeneration: number,
) {
	return {
		nodeKey: decisionNodeKey(payload.scopeId, payload.decisionId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: payload.status,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			scopeId: payload.scopeId,
			summary: payload.summary,
			approvedEntityId: payload.approvedEntityId,
			approvedEntityKind: payload.approvedEntityKind,
		},
	};
}

function toAgentRoleRecord(
	payload: ReturnType<typeof parseAgentRoleAssigned>,
	projectionGeneration: number,
) {
	return {
		nodeKey: agentRoleNodeKey(payload.companyId, payload.agentRoleId),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		status: payload.status,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			companyId: payload.companyId,
			agentId: payload.agentId,
			personaSlug: payload.personaSlug,
			workItemId: payload.workItemId,
			assignedToAgentId: payload.agentId,
		},
	};
}

function toAgentRecord(
	payload: ReturnType<typeof parseDecisionRecorded>,
	projectionGeneration: number,
) {
	return {
		nodeKey: agentNodeKey(payload.scopeId, payload.approverAgentId!),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: "active",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			agentId: payload.approverAgentId,
			scopeId: payload.scopeId,
		},
	};
}

function toApprovedEdge(
	payload: ReturnType<typeof parseDecisionRecorded>,
	projectionGeneration: number,
) {
	return {
		edgeType: "APPROVED",
		fromNodeKey: agentNodeKey(payload.scopeId, payload.approverAgentId!),
		toNodeKey: decisionNodeKey(payload.scopeId, payload.decisionId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			decisionId: payload.decisionId,
			approverAgentId: payload.approverAgentId,
		},
	};
}

function toAssignedToEdge(
	payload: ReturnType<typeof parseAgentRoleAssigned>,
	projectionGeneration: number,
) {
	return {
		edgeType: "ASSIGNED_TO",
		fromNodeKey: agentRoleNodeKey(payload.companyId, payload.agentRoleId),
		toNodeKey: workItemNodeKey(payload.companyId, payload.workItemId!),
		schemaVersion: 1,
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			agentRoleId: payload.agentRoleId,
			workItemId: payload.workItemId,
			agentId: payload.agentId,
		},
	};
}

/** Projects agents domain events into graph nodes (mock-friendly port). */
export async function projectAgentGraphEvent(
	context: ProjectionHandlerContext,
) {
	const coreHandled = await projectAgentsCoreGraphEvent(context);
	if (coreHandled === false) {
		// fall through to product-company agent graph events
	} else {
		return;
	}

	const { envelope, graphStore, projectionGeneration } = context;
	switch (envelope.eventType) {
		case AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED: {
			const payload = parseDecisionRecorded(envelope.payload);
			const nodeKey = decisionNodeKey(payload.scopeId, payload.decisionId);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toDecisionRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			if (payload.approverAgentId) {
				await graphStore.upsertNode(
					toAgentRecord(payload, projectionGeneration),
					envelope.eventId,
				);
				await graphStore.upsertEdge(
					toApprovedEdge(payload, projectionGeneration),
					envelope.eventId,
				);
			}
			return;
		}
		case AGENT_GRAPH_EVENT_TYPES.AGENT_ROLE_ASSIGNED: {
			const payload = parseAgentRoleAssigned(envelope.payload);
			const nodeKey = agentRoleNodeKey(payload.companyId, payload.agentRoleId);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toAgentRoleRecord(payload, projectionGeneration),
				envelope.eventId,
			);
			if (payload.workItemId) {
				await graphStore.upsertEdge(
					toAssignedToEdge(payload, projectionGeneration),
					envelope.eventId,
				);
			}
			return;
		}
		default:
			throw new ProjectionError(
				"Unsupported agent graph event",
				"SCHEMA_UNKNOWN",
				"permanent",
			);
	}
}

export const agentProjectionConsumer = {
	consumerName: GRAPH_AGENTS_CONSUMER_NAME,
	ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
	project: projectAgentGraphEvent,
};
