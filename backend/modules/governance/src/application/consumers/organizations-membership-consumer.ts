import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	membershipActivatedPayloadSchema,
	membershipRevokedPayloadSchema,
	ORGANIZATION_EVENT_TYPES,
	type MembershipActivatedPayload,
	type MembershipRevokedPayload,
} from "@anxionos/contracts/organizations";
import { isGrantRevoked } from "../../domain/entities/grant";
import {
	createAuthorityEpochBumpedEvent,
	createGrantIssuedEvent,
	createGrantRevokedEvent,
} from "../../domain/events/governance-events";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { InboxConsumer, InboxProcessorPort } from "../../domain/ports/inbox-processor-port";
import { GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME, OWNER_BASELINE_CAPABILITIES } from "./constants";

export class OrganizationsMembershipConsumerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrganizationsMembershipConsumerError";
	}
}

function parseMembershipActivated(payload: unknown): MembershipActivatedPayload {
	const parsed = membershipActivatedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new OrganizationsMembershipConsumerError("Invalid membership.activated payload");
	}
	return parsed.data;
}

function parseMembershipRevoked(payload: unknown): MembershipRevokedPayload {
	const parsed = membershipRevokedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new OrganizationsMembershipConsumerError("Invalid membership.revoked payload");
	}
	return parsed.data;
}

async function issueBaselineOwnerGrants(
	unitOfWork: GovernanceUnitOfWork,
	payload: MembershipActivatedPayload,
): Promise<void> {
	if (payload.role !== "owner") {
		return;
	}
	await unitOfWork.runInTransaction(async (context) => {
		const existing = await context.grantRepository.findActiveByDerivedFromMembershipId(
			payload.membershipId,
		);
		if (existing.length > 0) {
			return;
		}
		const now = new Date();
		const events = [];
		for (const capability of OWNER_BASELINE_CAPABILITIES) {
			const bumpedEpoch = await context.authorityEpochStore.increment(payload.agencyId);
			const saved = await context.grantRepository.save({
				id: randomUUID(),
				scopeId: payload.agencyId,
				scopeKind: "agency",
				granteePrincipalId: payload.principalId,
				granteeAgentId: null,
				capability,
				resourceRef: null,
				status: "active",
				validFrom: now,
				validUntil: null,
				derivedFromMembershipId: payload.membershipId,
				authorityEpochAtIssue: bumpedEpoch.epoch,
				revision: 1,
				createdAt: now,
				updatedAt: now,
			});
			events.push(
				createGrantIssuedEvent({
					grantId: saved.id,
					scopeId: saved.scopeId,
					granteePrincipalId: saved.granteePrincipalId,
					capability: saved.capability,
					status: saved.status,
					authorityEpoch: bumpedEpoch.epoch,
					revision: saved.revision,
				}),
				createAuthorityEpochBumpedEvent({
					scopeId: payload.agencyId,
					epoch: bumpedEpoch.epoch,
					reason: "MembershipActivated",
				}),
			);
		}
		if (events.length > 0) {
			await context.publishEvents(events);
		}
	});
}

async function closeDerivedGrants(
	unitOfWork: GovernanceUnitOfWork,
	payload: MembershipRevokedPayload,
): Promise<void> {
	await unitOfWork.runInTransaction(async (context) => {
		const derivedGrants = await context.grantRepository.findActiveByDerivedFromMembershipId(
			payload.membershipId,
		);
		if (derivedGrants.length === 0) {
			return;
		}
		const now = new Date();
		const events = [];
		for (const grant of derivedGrants) {
			if (isGrantRevoked(grant)) {
				continue;
			}
			const bumpedEpoch = await context.authorityEpochStore.increment(grant.scopeId);
			const updated = await context.grantRepository.save({
				...grant,
				status: "revoked",
				revision: grant.revision + 1,
				updatedAt: now,
			});
			events.push(
				createGrantRevokedEvent({
					grantId: updated.id,
					scopeId: updated.scopeId,
					authorityEpoch: bumpedEpoch.epoch,
					revision: updated.revision,
				}),
				createAuthorityEpochBumpedEvent({
					scopeId: updated.scopeId,
					epoch: bumpedEpoch.epoch,
					reason: "MembershipRevoked",
				}),
			);
		}
		if (events.length > 0) {
			await context.publishEvents(events);
		}
	});
}

export async function handleOrganizationsMembershipEvent(
	unitOfWork: GovernanceUnitOfWork,
	envelope: DomainEventEnvelope,
): Promise<void> {
	switch (envelope.eventType) {
		case ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED: {
			const payload = parseMembershipActivated(envelope.payload);
			await issueBaselineOwnerGrants(unitOfWork, payload);
			return;
		}
		case ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED: {
			const payload = parseMembershipRevoked(envelope.payload);
			await closeDerivedGrants(unitOfWork, payload);
			return;
		}
		default:
			throw new OrganizationsMembershipConsumerError(
				`Unsupported organizations event: ${envelope.eventType}`,
			);
	}
}

export interface OrganizationsMembershipConsumerDeps {
	unitOfWork: GovernanceUnitOfWork;
	inboxProcessor: InboxProcessorPort;
}

export function createOrganizationsMembershipInboxConsumer(
	deps: OrganizationsMembershipConsumerDeps,
): InboxConsumer {
	return {
		name: GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			await handleOrganizationsMembershipEvent(deps.unitOfWork, envelope);
		},
	};
}

export async function processOrganizationsMembershipEvent(
	deps: OrganizationsMembershipConsumerDeps,
	envelope: DomainEventEnvelope,
): Promise<"processed" | "skipped"> {
	return deps.inboxProcessor.process(createOrganizationsMembershipInboxConsumer(deps), envelope);
}

export const organizationsMembershipConsumer = {
	consumerName: GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	handle: handleOrganizationsMembershipEvent,
	process: processOrganizationsMembershipEvent,
};
