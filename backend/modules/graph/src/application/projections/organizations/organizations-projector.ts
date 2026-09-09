import type { ProjectionHandlerContext } from "../../../infrastructure/projections/inbox/process-with-inbox";
import { ORGANIZATION_EVENT_TYPES, ORGANIZATIONS_OWNER_DOMAIN, } from "@anxionos/contracts/organizations";
import { GRAPH_ORGANIZATIONS_CONSUMER_NAME, } from "../../../domain/projections/constants";
import { ProjectionError } from "../../../domain/projections/errors";

function agencyNodeKey(agencyId) {
    return {
        scopeType: "AGENCY" as const,
        scopeId: agencyId,
        type: "Agency",
        id: agencyId,
    };
}
function membershipNodeKey(agencyId, membershipId) {
    return {
        scopeType: "AGENCY" as const,
        scopeId: agencyId,
        type: "Membership",
        id: membershipId,
    };
}
function parseAgencyCreated(payload) {
    if (typeof payload !== "object" ||
        payload === null ||
        !("agencyId" in payload)) {
        throw new ProjectionError("Invalid agency.created payload", "SCHEMA_INVALID", "permanent");
    }
    return payload;
}
function parseMembershipActivated(payload) {
    if (typeof payload !== "object" ||
        payload === null ||
        !("membershipId" in payload)) {
        throw new ProjectionError("Invalid membership.activated payload", "SCHEMA_INVALID", "permanent");
    }
    return payload;
}
function toAgencyRecord(payload, projectionGeneration) {
    return {
        nodeKey: agencyNodeKey(payload.agencyId),
        schemaVersion: 1,
        ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
        status: payload.status,
        revision: payload.revision,
        projectionGeneration,
        payload: {
            displayName: payload.displayName,
            marketScope: payload.marketScope,
            onboardingStep: payload.onboardingStep,
            ownerPrincipalId: payload.ownerPrincipalId,
        },
    };
}
function toMembershipRecord(payload, projectionGeneration) {
    return {
        nodeKey: membershipNodeKey(payload.agencyId, payload.membershipId),
        schemaVersion: 1,
        ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
        status: "active",
        revision: payload.revision,
        projectionGeneration,
        payload: {
            agencyId: payload.agencyId,
            principalId: payload.principalId,
            role: payload.role,
        },
    };
}
/** Projects organizations domain events into graph nodes (mock-friendly port). */
export async function projectOrganizationsEvent(context) {
    const { envelope, graphStore, projectionGeneration } = context;
    switch (envelope.eventType) {
        case ORGANIZATION_EVENT_TYPES.AGENCY_CREATED: {
            const payload = parseAgencyCreated(envelope.payload);
            await graphStore.upsertNode(toAgencyRecord(payload, projectionGeneration), envelope.eventId);
            return;
        }
        case ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED: {
            const payload = parseMembershipActivated(envelope.payload);
            await graphStore.upsertNode(toMembershipRecord(payload, projectionGeneration), envelope.eventId);
            return;
        }
        default:
            throw new ProjectionError(`Unsupported organizations event: ${envelope.eventType}`, "SCHEMA_UNKNOWN", "permanent");
    }
}
export const organizationsProjectionConsumer = {
    consumerName: GRAPH_ORGANIZATIONS_CONSUMER_NAME,
    ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
    project: projectOrganizationsEvent,
};
