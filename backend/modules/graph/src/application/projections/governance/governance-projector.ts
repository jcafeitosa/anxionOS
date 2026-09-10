import {
	GOVERNANCE_EVENT_TYPES,
	GOVERNANCE_OWNER_DOMAIN,
	grantIssuedPayloadSchema,
	grantRevokedPayloadSchema,
	type GrantIssuedPayload,
	type GrantRevokedPayload,
} from "@anxionos/contracts/governance";
import { GRAPH_GOVERNANCE_CONSUMER_NAME } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";
import type { ProjectionHandlerContext } from "../inbox/projection-handler";

/** Upper bound for projected capability strings (GK-R04 storage guard). */
const MAX_PROJECTED_CAPABILITY_LENGTH = 256;

function grantNodeKey(scopeId: string, grantId: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId,
		type: "Grant",
		id: grantId,
	};
}

function parseGrantIssued(payload: unknown): GrantIssuedPayload {
	const parsed = grantIssuedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid grant.issued payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	if (parsed.data.capability.length > MAX_PROJECTED_CAPABILITY_LENGTH) {
		throw new ProjectionError(
			"Invalid grant.issued payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function parseGrantRevoked(payload: unknown): GrantRevokedPayload {
	const parsed = grantRevokedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new ProjectionError(
			"Invalid grant.revoked payload",
			"SCHEMA_INVALID",
			"permanent",
		);
	}
	return parsed.data;
}

function isStaleRevision(incomingRevision: number, existing: { revision: number } | null) {
	return existing !== null && incomingRevision <= existing.revision;
}

function toIssuedGrantRecord(
	payload: GrantIssuedPayload,
	projectionGeneration: number,
	occurredAt: string,
) {
	return {
		nodeKey: grantNodeKey(payload.scopeId, payload.grantId),
		schemaVersion: 1,
		ownerDomain: GOVERNANCE_OWNER_DOMAIN,
		status: payload.status,
		revision: payload.revision,
		projectionGeneration,
		payload: {
			scopeId: payload.scopeId,
			granteePrincipalId: payload.granteePrincipalId,
			capability: payload.capability,
			authorityEpoch: payload.authorityEpoch,
			validFrom: payload.validFrom ?? occurredAt,
			validUntil: payload.validUntil ?? null,
			recordedFrom: payload.recordedFrom ?? occurredAt,
			recordedUntil: payload.recordedUntil ?? null,
		},
	};
}

function toRevokedGrantRecord(
	payload: GrantRevokedPayload,
	projectionGeneration: number,
	existing: { payload: Record<string, unknown> } | null,
	occurredAt: string,
) {
	const revokedAt = payload.revokedAt ?? occurredAt;
	return {
		nodeKey: grantNodeKey(payload.scopeId, payload.grantId),
		schemaVersion: 1,
		ownerDomain: GOVERNANCE_OWNER_DOMAIN,
		status: "revoked",
		revision: payload.revision,
		projectionGeneration,
		payload: {
			...(existing?.payload ?? {}),
			authorityEpoch: payload.authorityEpoch,
			validUntil: revokedAt,
			recordedUntil: revokedAt,
		},
	};
}

/** Projects governance grant events into graph Grant nodes (RB-D04 / ANX-302). */
export async function projectGovernanceEvent(context: ProjectionHandlerContext) {
	const { envelope, graphStore, projectionGeneration } = context;
	switch (envelope.eventType) {
		case GOVERNANCE_EVENT_TYPES.GRANT_ISSUED: {
			const payload = parseGrantIssued(envelope.payload);
			const nodeKey = grantNodeKey(payload.scopeId, payload.grantId);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toIssuedGrantRecord(payload, projectionGeneration, envelope.occurredAt),
				envelope.eventId,
			);
			return;
		}
		case GOVERNANCE_EVENT_TYPES.GRANT_REVOKED: {
			const payload = parseGrantRevoked(envelope.payload);
			const nodeKey = grantNodeKey(payload.scopeId, payload.grantId);
			const existing = await graphStore.getNode(nodeKey);
			if (isStaleRevision(payload.revision, existing)) {
				return;
			}
			await graphStore.upsertNode(
				toRevokedGrantRecord(
					payload,
					projectionGeneration,
					existing,
					envelope.occurredAt,
				),
				envelope.eventId,
			);
			return;
		}
		default:
			throw new ProjectionError(
				"Unsupported governance event",
				"SCHEMA_UNKNOWN",
				"permanent",
			);
	}
}

export const governanceProjectionConsumer = {
	consumerName: GRAPH_GOVERNANCE_CONSUMER_NAME,
	ownerDomain: GOVERNANCE_OWNER_DOMAIN,
	project: projectGovernanceEvent,
};
