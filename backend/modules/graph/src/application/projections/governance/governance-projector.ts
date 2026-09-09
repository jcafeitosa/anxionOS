import type { ProjectionHandlerContext } from "../inbox/projection-handler";
import { GOVERNANCE_EVENT_TYPES, GOVERNANCE_OWNER_DOMAIN, grantIssuedPayloadSchema, grantRevokedPayloadSchema, } from "@anxionos/contracts/governance";
import { GRAPH_GOVERNANCE_CONSUMER_NAME } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";

/** Upper bound for projected capability strings (GK-R04 storage guard). */
const MAX_PROJECTED_CAPABILITY_LENGTH = 256;
function grantNodeKey(scopeId, grantId) {
    // Grants are agency-scoped in P03; extend when platform-scoped grants ship.
    return {
        scopeType: "AGENCY" as const,
        scopeId,
        type: "Grant",
        id: grantId,
    };
}
function parseGrantIssued(payload) {
    const parsed = grantIssuedPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        throw new ProjectionError("Invalid grant.issued payload", "SCHEMA_INVALID", "permanent");
    }
    if (parsed.data.capability.length > MAX_PROJECTED_CAPABILITY_LENGTH) {
        throw new ProjectionError("Invalid grant.issued payload", "SCHEMA_INVALID", "permanent");
    }
    return parsed.data;
}
function parseGrantRevoked(payload) {
    const parsed = grantRevokedPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        throw new ProjectionError("Invalid grant.revoked payload", "SCHEMA_INVALID", "permanent");
    }
    return parsed.data;
}
function isStaleRevision(incomingRevision, existing) {
    return existing !== null && incomingRevision <= existing.revision;
}
function toIssuedGrantRecord(payload, projectionGeneration) {
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
        },
    };
}
function toRevokedGrantRecord(payload, projectionGeneration, existing) {
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
        },
    };
}
/** Projects governance grant events into graph Grant nodes (mock-friendly port). */
export async function projectGovernanceEvent(context) {
    const { envelope, graphStore, projectionGeneration } = context;
    switch (envelope.eventType) {
        case GOVERNANCE_EVENT_TYPES.GRANT_ISSUED: {
            const payload = parseGrantIssued(envelope.payload);
            const nodeKey = grantNodeKey(payload.scopeId, payload.grantId);
            const existing = await graphStore.getNode(nodeKey);
            if (isStaleRevision(payload.revision, existing)) {
                return;
            }
            await graphStore.upsertNode(toIssuedGrantRecord(payload, projectionGeneration), envelope.eventId);
            return;
        }
        case GOVERNANCE_EVENT_TYPES.GRANT_REVOKED: {
            const payload = parseGrantRevoked(envelope.payload);
            const nodeKey = grantNodeKey(payload.scopeId, payload.grantId);
            const existing = await graphStore.getNode(nodeKey);
            if (isStaleRevision(payload.revision, existing)) {
                return;
            }
            await graphStore.upsertNode(toRevokedGrantRecord(payload, projectionGeneration, existing), envelope.eventId);
            return;
        }
        default:
            throw new ProjectionError("Unsupported governance event", "SCHEMA_UNKNOWN", "permanent");
    }
}
export const governanceProjectionConsumer = {
    consumerName: GRAPH_GOVERNANCE_CONSUMER_NAME,
    ownerDomain: GOVERNANCE_OWNER_DOMAIN,
    project: projectGovernanceEvent,
};
