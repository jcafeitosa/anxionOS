import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import {
	createGovernanceInboxProcessor,
	createGovernanceUnitOfWork,
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	type OrganizationsMembershipConsumerDeps,
	OrganizationsMembershipConsumerError,
	processOrganizationsMembershipEvent,
} from "@anxionos/governance";
import { createOrganizationsDb } from "@anxionos/organizations";
import type { Pool } from "pg";
import { ZodError } from "zod";
import { createOrganizationsMembershipReadAdapter } from "./organizations-membership-read-adapter";

export type OrganizationsMembershipFailureClass = "permanent" | "transient";

const SUPPORTED_EVENT_TYPES = new Set<string>([
	ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
	ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
	ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
]);

export function classifyOrganizationsMembershipError(
	error: unknown,
): OrganizationsMembershipFailureClass {
	if (error instanceof OrganizationsMembershipConsumerError) {
		return "permanent";
	}
	if (error instanceof ZodError) {
		return "permanent";
	}
	if (error instanceof SyntaxError || error instanceof TypeError) {
		return "permanent";
	}
	return "transient";
}

export function createOrganizationsMembershipConsumerDeps(
	pool: Pool,
): OrganizationsMembershipConsumerDeps {
	const orgsDb = createOrganizationsDb(pool);
	return {
		unitOfWork: createGovernanceUnitOfWork(pool),
		inboxProcessor: createGovernanceInboxProcessor(pool),
		membershipRead: createOrganizationsMembershipReadAdapter(orgsDb),
	};
}

export async function processOrganizationsMembershipConsumerEvent(
	pool: Pool,
	deps: OrganizationsMembershipConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (!SUPPORTED_EVENT_TYPES.has(envelope.eventType)) {
		return "skipped";
	}
	return processOrganizationsMembershipEvent(deps, envelope);
}

export async function consumeOrganizationsMembershipEvent(
	pool: Pool,
	deps: OrganizationsMembershipConsumerDeps,
	envelope: DomainEventEnvelope,
): Promise<"processed" | "skipped"> {
	return processOrganizationsMembershipConsumerEvent(pool, deps, envelope);
}

export { GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME };
