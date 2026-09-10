/**
 * ANX-139 / G3-AGT-05 — Core agents module events → Agent graph nodes.
 * Spec: docs/orchestration/structure-debate/agents/R05-storage-pg.md (Neo4j projection table).
 */
import {
	AGENTS_EVENT_TYPES,
	agentRegisteredPayloadSchema,
	agentStatusChangedPayloadSchema,
	agentVersionPublishedPayloadSchema,
	agentVersionRolledBackPayloadSchema,
} from "@anxionos/contracts/agents";
import { AGENT_GRAPH_OWNER_DOMAIN } from "@anxionos/contracts/graph";
import { ProjectionError } from "../../../domain/projections/errors";
import type { ProjectionHandlerContext } from "../inbox/projection-handler";

/** Graph scope is organization tenancy; agencyId is stored on the node payload. */
function resolveAgentScopeId(organizationId: string) {
	return organizationId;
}

function agentNodeKey(scopeId: string, agentId: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId,
		type: "Agent",
		id: agentId,
	};
}

function isStaleRevision(incomingRevision: number, existing: { revision: number } | null) {
	return existing !== null && incomingRevision <= existing.revision;
}

function parseRegistered(payload: unknown) {
	const parsed = agentRegisteredPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid agents.agent.registered payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseStatusChanged(payload: unknown) {
	const parsed = agentStatusChangedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid agents.agent.status_changed payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseVersionPublished(payload: unknown) {
	const parsed = agentVersionPublishedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid agents.agent_version.published payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseVersionRolledBack(payload: unknown) {
	const parsed = agentVersionRolledBackPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid agents.agent_version.rolled_back payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function toAgentRecordFromRegistered(
	payload: ReturnType<typeof parseRegistered>,
	projectionGeneration: number,
) {
	const scopeId = resolveAgentScopeId(payload.organizationId);
	return {
		nodeKey: agentNodeKey(scopeId, payload.agentId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: payload.status.toLowerCase(),
		revision: payload.revision,
		projectionGeneration,
		payload: {
			agentId: payload.agentId,
			organizationId: payload.organizationId,
			agencyId: payload.agencyId ?? null,
			displayName: payload.displayName,
			kind: payload.kind,
			lifecycleStatus: payload.status,
		},
	};
}

function mergeAgentStatusUpdate(
	existing: { payload: Record<string, unknown> } | null,
	payload: ReturnType<typeof parseStatusChanged>,
	projectionGeneration: number,
) {
	const scopeId = resolveAgentScopeId(payload.organizationId);
	return {
		nodeKey: agentNodeKey(scopeId, payload.agentId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: payload.toStatus.toLowerCase(),
		revision: payload.revision,
		projectionGeneration,
		payload: {
			...(existing?.payload ?? {}),
			agentId: payload.agentId,
			organizationId: payload.organizationId,
			lifecycleStatus: payload.toStatus,
			fromStatus: payload.fromStatus,
		},
	};
}

function mergeAgentVersionPublished(
	existing: { payload: Record<string, unknown> } | null,
	payload: ReturnType<typeof parseVersionPublished>,
	projectionGeneration: number,
) {
	const scopeId = resolveAgentScopeId(payload.organizationId);
	return {
		nodeKey: agentNodeKey(scopeId, payload.agentId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: (existing?.payload.lifecycleStatus as string | undefined)?.toLowerCase() ?? "configured",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			...(existing?.payload ?? {}),
			agentId: payload.agentId,
			organizationId: payload.organizationId,
			activeVersionId: payload.agentVersionId,
			versionNumber: payload.versionNumber,
			capabilityManifestHash: payload.capabilityManifestHash,
			autonomyLevel: payload.autonomyLevel,
		},
	};
}

function mergeAgentVersionRolledBack(
	existing: { payload: Record<string, unknown> } | null,
	payload: ReturnType<typeof parseVersionRolledBack>,
	projectionGeneration: number,
) {
	const scopeId = resolveAgentScopeId(payload.organizationId);
	return {
		nodeKey: agentNodeKey(scopeId, payload.agentId),
		schemaVersion: 1,
		ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
		status: (existing?.payload.lifecycleStatus as string | undefined)?.toLowerCase() ?? "configured",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			...(existing?.payload ?? {}),
			agentId: payload.agentId,
			organizationId: payload.organizationId,
			activeVersionId: payload.toVersionId,
			versionNumber: payload.toVersionNumber,
			rolledBackFromVersionId: payload.fromVersionId ?? null,
		},
	};
}

/** Projects ANX-139 core agents domain events into Agent graph nodes. */
export async function projectAgentsCoreGraphEvent(context: ProjectionHandlerContext) {
	const { envelope, graphStore, projectionGeneration } = context;
	switch (envelope.eventType) {
		case AGENTS_EVENT_TYPES.AGENT_REGISTERED: {
			const payload = parseRegistered(envelope.payload);
			const nodeKey = agentNodeKey(
				resolveAgentScopeId(payload.organizationId),
				payload.agentId,
			);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toAgentRecordFromRegistered(payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED: {
			const payload = parseStatusChanged(envelope.payload);
			const nodeKey = agentNodeKey(
				resolveAgentScopeId(payload.organizationId),
				payload.agentId,
			);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				mergeAgentStatusUpdate(existing, payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED: {
			const payload = parseVersionPublished(envelope.payload);
			const nodeKey = agentNodeKey(
				resolveAgentScopeId(payload.organizationId),
				payload.agentId,
			);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				mergeAgentVersionPublished(existing, payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		case AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK: {
			const payload = parseVersionRolledBack(envelope.payload);
			const nodeKey = agentNodeKey(
				resolveAgentScopeId(payload.organizationId),
				payload.agentId,
			);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				mergeAgentVersionRolledBack(existing, payload, projectionGeneration),
				envelope.eventId,
			);
			return;
		}
		default:
			return false;
	}
}

export const AGENTS_CORE_GRAPH_EVENT_TYPES = new Set<string>([
	AGENTS_EVENT_TYPES.AGENT_REGISTERED,
	AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED,
	AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED,
	AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK,
]);

export function isAgentsCoreGraphEvent(eventType: string): boolean {
	return AGENTS_CORE_GRAPH_EVENT_TYPES.has(eventType);
}
