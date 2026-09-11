import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	type MembershipActivatedPayload,
	type MembershipRevokedPayload,
	membershipActivatedPayloadSchema,
	membershipRevokedPayloadSchema,
	ORGANIZATION_EVENT_TYPES,
	type OwnershipTransferredPayload,
	ownershipTransferredPayloadSchema,
} from "@anxionos/contracts/organizations";
import { isGrantRevoked } from "../../domain/entities/grant";
import {
	createAuthorityEpochBumpedEvent,
	createGrantIssuedEvent,
	createGrantRevokedEvent,
} from "../../domain/events/governance-events";
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../../domain/ports/governance-unit-of-work";
import type {
	InboxConsumer,
	InboxProcessorPort,
} from "../../domain/ports/inbox-processor-port";
import type { OrganizationsMembershipReadPort } from "../../domain/ports/organizations-membership-read-port";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	OWNER_BASELINE_CAPABILITIES,
} from "./constants";

export class OrganizationsMembershipConsumerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrganizationsMembershipConsumerError";
	}
}

function parseMembershipActivated(
	payload: unknown,
): MembershipActivatedPayload {
	const parsed = membershipActivatedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new OrganizationsMembershipConsumerError(
			"Invalid membership.activated payload",
		);
	}
	return parsed.data;
}

function parseMembershipRevoked(payload: unknown): MembershipRevokedPayload {
	const parsed = membershipRevokedPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new OrganizationsMembershipConsumerError(
			"Invalid membership.revoked payload",
		);
	}
	return parsed.data;
}

function parseOwnershipTransferred(
	payload: unknown,
): OwnershipTransferredPayload {
	const parsed = ownershipTransferredPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		throw new OrganizationsMembershipConsumerError(
			"Invalid ownership.transferred payload",
		);
	}
	return parsed.data;
}

async function assertMembershipMatchesActivatedPayload(
	membershipRead: OrganizationsMembershipReadPort,
	payload: MembershipActivatedPayload,
	transactionContext?: GovernanceTransactionContext,
): Promise<void> {
	const membership = await membershipRead.findMembership(
		payload.agencyId,
		payload.membershipId,
		transactionContext
			? { transactionClient: transactionContext.client }
			: undefined,
	);
	if (
		!membership ||
		membership.status !== "active" ||
		membership.principalId !== payload.principalId ||
		membership.role !== payload.role
	) {
		throw new OrganizationsMembershipConsumerError(
			"Membership revalidation failed for membership.activated",
		);
	}
}

async function assertMembershipMatchesRevokedPayload(
	membershipRead: OrganizationsMembershipReadPort,
	payload: MembershipRevokedPayload,
	transactionContext?: GovernanceTransactionContext,
): Promise<void> {
	const membership = await membershipRead.findMembership(
		payload.agencyId,
		payload.membershipId,
		transactionContext
			? { transactionClient: transactionContext.client }
			: undefined,
	);
	if (
		!membership ||
		membership.status !== "revoked" ||
		membership.principalId !== payload.principalId
	) {
		throw new OrganizationsMembershipConsumerError(
			"Membership revalidation failed for membership.revoked",
		);
	}
}

async function assertOwnershipTransferMatchesReadModel(
	membershipRead: OrganizationsMembershipReadPort,
	payload: OwnershipTransferredPayload,
	transactionContext?: GovernanceTransactionContext,
): Promise<void> {
	const readOptions = transactionContext
		? { transactionClient: transactionContext.client }
		: undefined;
	const previousOwner = await membershipRead.findMembership(
		payload.agencyId,
		payload.previousOwnerMembershipId,
		readOptions,
	);
	const newOwner = await membershipRead.findMembership(
		payload.agencyId,
		payload.newOwnerMembershipId,
		readOptions,
	);
	if (
		!previousOwner ||
		!newOwner ||
		previousOwner.status !== "active" ||
		newOwner.status !== "active" ||
		previousOwner.principalId !== payload.previousOwnerPrincipalId ||
		newOwner.principalId !== payload.newOwnerPrincipalId ||
		newOwner.role !== "owner"
	) {
		throw new OrganizationsMembershipConsumerError(
			"Membership revalidation failed for ownership.transferred",
		);
	}
}

async function issueBaselineOwnerGrants(
	unitOfWork: GovernanceUnitOfWork,
	membershipRead: OrganizationsMembershipReadPort,
	payload: MembershipActivatedPayload,
): Promise<void> {
	if (payload.role !== "owner") {
		return;
	}
	const tenantContext: TenantContext = {
		tenantId: payload.agencyId,
		agencyId: payload.agencyId,
		principalId: payload.principalId,
	};
	await unitOfWork.runInTransaction(tenantContext, async (context) => {
		await assertMembershipMatchesActivatedPayload(
			membershipRead,
			payload,
			context,
		);
		const existing =
			await context.grantRepository.findActiveByDerivedFromMembershipId(
				payload.membershipId,
			);
		if (existing.length > 0) {
			return;
		}
		const now = new Date();
		const events = [];
		for (const capability of OWNER_BASELINE_CAPABILITIES) {
			const bumpedEpoch = await context.authorityEpochStore.increment(
				payload.agencyId,
				payload.agencyId,
				payload.agencyId,
			);
			const saved = await context.grantRepository.save({
				id: randomUUID(),
				tenantId: payload.agencyId,
				agencyId: payload.agencyId,
				scopeId: payload.agencyId,
				scopeKind: "agency",
				granteePrincipalId: payload.principalId,
				granteeAgentId: null,
				// Grant derivado do sistema (membership.activated): sem emissor
				// principal, so' revogavel por owner/admin da agencia (ANX-469).
				issuedByPrincipalId: null,
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
				createGrantIssuedEvent(
					{
						grantId: saved.id,
						scopeId: saved.scopeId,
						granteePrincipalId: saved.granteePrincipalId,
						capability: saved.capability,
						status: saved.status,
						authorityEpoch: bumpedEpoch.epoch,
						revision: saved.revision,
						validFrom: saved.validFrom.toISOString(),
						validUntil: saved.validUntil?.toISOString() ?? null,
					},
					now,
				),
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
	membershipId: string,
	reason: "MembershipRevoked" | "OwnershipTransferred",
	membershipRead?: OrganizationsMembershipReadPort,
	revokedPayload?: MembershipRevokedPayload,
	ownershipPayload?: OwnershipTransferredPayload,
): Promise<void> {
	const tenantContext: TenantContext = {
		tenantId:
			revokedPayload?.agencyId ?? ownershipPayload?.agencyId ?? membershipId,
		agencyId:
			revokedPayload?.agencyId ?? ownershipPayload?.agencyId ?? membershipId,
		principalId:
			revokedPayload?.principalId ?? ownershipPayload?.newOwnerPrincipalId,
	};
	await unitOfWork.runInTransaction(tenantContext, async (context) => {
		if (membershipRead && revokedPayload) {
			await assertMembershipMatchesRevokedPayload(
				membershipRead,
				revokedPayload,
				context,
			);
		}
		if (membershipRead && ownershipPayload) {
			await assertOwnershipTransferMatchesReadModel(
				membershipRead,
				ownershipPayload,
				context,
			);
		}
		const derivedGrants =
			await context.grantRepository.findActiveByDerivedFromMembershipId(
				membershipId,
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
			const bumpedEpoch = await context.authorityEpochStore.increment(
				grant.scopeId,
				grant.tenantId,
				grant.agencyId,
			);
			const updated = await context.grantRepository.save({
				...grant,
				status: "revoked",
				revision: grant.revision + 1,
				updatedAt: now,
			});
			events.push(
				createGrantRevokedEvent(
					{
						grantId: updated.id,
						scopeId: updated.scopeId,
						authorityEpoch: bumpedEpoch.epoch,
						revision: updated.revision,
						revokedAt: now.toISOString(),
					},
					now,
				),
				createAuthorityEpochBumpedEvent({
					scopeId: updated.scopeId,
					epoch: bumpedEpoch.epoch,
					reason,
				}),
			);
		}
		if (events.length > 0) {
			await context.publishEvents(events);
		}
	});
}

async function handleOwnershipTransferred(
	unitOfWork: GovernanceUnitOfWork,
	membershipRead: OrganizationsMembershipReadPort,
	payload: OwnershipTransferredPayload,
): Promise<void> {
	await closeDerivedGrants(
		unitOfWork,
		payload.previousOwnerMembershipId,
		"OwnershipTransferred",
		membershipRead,
		undefined,
		payload,
	);
	await issueBaselineOwnerGrants(unitOfWork, membershipRead, {
		membershipId: payload.newOwnerMembershipId,
		agencyId: payload.agencyId,
		principalId: payload.newOwnerPrincipalId,
		role: "owner",
		revision: payload.revision,
	});
}

export async function handleOrganizationsMembershipEvent(
	deps: OrganizationsMembershipConsumerDeps,
	envelope: DomainEventEnvelope,
): Promise<void> {
	switch (envelope.eventType) {
		case ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED: {
			const payload = parseMembershipActivated(envelope.payload);
			await issueBaselineOwnerGrants(
				deps.unitOfWork,
				deps.membershipRead,
				payload,
			);
			return;
		}
		case ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED: {
			const payload = parseMembershipRevoked(envelope.payload);
			await closeDerivedGrants(
				deps.unitOfWork,
				payload.membershipId,
				"MembershipRevoked",
				deps.membershipRead,
				payload,
			);
			return;
		}
		case ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED: {
			const payload = parseOwnershipTransferred(envelope.payload);
			await handleOwnershipTransferred(
				deps.unitOfWork,
				deps.membershipRead,
				payload,
			);
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
	membershipRead: OrganizationsMembershipReadPort;
}

export function createOrganizationsMembershipInboxConsumer(
	deps: OrganizationsMembershipConsumerDeps,
): InboxConsumer {
	return {
		name: GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			await handleOrganizationsMembershipEvent(deps, envelope);
		},
	};
}

export async function processOrganizationsMembershipEvent(
	deps: OrganizationsMembershipConsumerDeps,
	envelope: DomainEventEnvelope,
): Promise<"processed" | "skipped"> {
	return deps.inboxProcessor.process(
		createOrganizationsMembershipInboxConsumer(deps),
		envelope,
	);
}

export const organizationsMembershipConsumer = {
	consumerName: GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	handle: handleOrganizationsMembershipEvent,
	process: processOrganizationsMembershipEvent,
};
