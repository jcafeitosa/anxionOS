import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { TenantContext } from "@anxionos/database";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import {
	ORGANIZATIONS_OWNER_DOMAIN,
	ORGANIZATION_EVENT_TYPES,
} from "@anxionos/contracts/organizations";
import type { OrganizationsMembershipReadPort } from "@anxionos/governance";
import type { GovernanceUnitOfWork } from "@anxionos/governance";
import {
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	OWNER_BASELINE_CAPABILITIES,
	OrganizationsMembershipConsumerError,
	handleOrganizationsMembershipEvent,
} from "@anxionos/governance";
import type { PoolClient } from "pg";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const wrongAgencyId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const membershipId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const successorMembershipId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const successorPrincipalId = "22222222-2222-4222-8222-222222222222";

function createMembershipActivatedEnvelope(
	payload: Record<string, unknown>,
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
		ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
		aggregateId: membershipId,
		aggregateType: "Membership",
		schemaVersion: 1,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

function createOwnershipTransferredEnvelope(
	payload: Record<string, unknown>,
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
		ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
		aggregateId: agencyId,
		aggregateType: "Agency",
		schemaVersion: 1,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

function createMembershipRevokedEnvelope(
	payload: Record<string, unknown>,
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
		ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
		aggregateId: membershipId,
		aggregateType: "Membership",
		schemaVersion: 1,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

function createStubMembershipRead(
	entries: Record<
		string,
		{
			agencyId: string;
			membershipId: string;
			principalId: string;
			role: "owner" | "admin" | "viewer";
			status: "active" | "revoked" | "invited";
		}
	>,
): OrganizationsMembershipReadPort {
	return {
		async findMembership(entryAgencyId, entryMembershipId, options) {
			void options;
			return entries[`${entryAgencyId}:${entryMembershipId}`] ?? null;
		},
	};
}

function createConsumerDeps(membershipRead: OrganizationsMembershipReadPort) {
	const grantRepository = createInMemoryGrantRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal: createInMemoryCommandJournalRepository(),
	});
	return {
		deps: {
			unitOfWork,
			membershipRead,
			inboxProcessor: { process: async () => "processed" as const },
		},
		grantRepository,
		published,
	};
}

describe("organizationsMembershipConsumer", () => {
	test("issues baseline owner grants on membership.activated for owner role", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps, grantRepository, published } =
			createConsumerDeps(membershipRead);
		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipActivatedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				role: "owner",
				revision: 1,
			}),
		);

		const derived =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		expect(derived).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
		expect(
			published.filter(
				(event) => event.eventType === GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
			),
		).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
	});

	test("skips grant issuance for non-owner membership activation", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "viewer",
				status: "active",
			},
		});
		const { deps, grantRepository, published } =
			createConsumerDeps(membershipRead);
		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipActivatedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				role: "viewer",
				revision: 1,
			}),
		);

		const derived =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		expect(derived).toHaveLength(0);
		expect(published).toHaveLength(0);
	});

	test("is idempotent when baseline grants already exist", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps, grantRepository, published } =
			createConsumerDeps(membershipRead);
		const envelope = createMembershipActivatedEnvelope({
			membershipId,
			agencyId,
			principalId: ownerPrincipalId,
			role: "owner",
			revision: 1,
		});

		await handleOrganizationsMembershipEvent(deps, envelope);
		await handleOrganizationsMembershipEvent(deps, envelope);

		const derived =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		expect(derived).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
		expect(
			published.filter(
				(event) => event.eventType === GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
			),
		).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
	});

	test("revokes derived grants on membership.revoked", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps, grantRepository, published } =
			createConsumerDeps(membershipRead);
		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipActivatedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				role: "owner",
				revision: 1,
			}),
		);

		membershipRead.findMembership = async () => ({
			agencyId,
			membershipId,
			principalId: ownerPrincipalId,
			role: "owner",
			status: "revoked",
		});

		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipRevokedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				revision: 2,
			}),
		);

		const derived =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		expect(derived).toHaveLength(0);
		expect(
			published.filter(
				(event) => event.eventType === GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
			),
		).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
	});

	test("rejects baseline grants when membership revoked inside grant TX (TOCTOU race)", async () => {
		let insideGrantTx = false;
		const membershipRead: OrganizationsMembershipReadPort = {
			async findMembership(entryAgencyId, entryMembershipId, options) {
				expect(options?.transactionClient).toBeDefined();
				if (insideGrantTx) {
					return {
						agencyId: entryAgencyId,
						membershipId: entryMembershipId,
						principalId: ownerPrincipalId,
						role: "owner",
						status: "revoked",
					};
				}
				return {
					agencyId: entryAgencyId,
					membershipId: entryMembershipId,
					principalId: ownerPrincipalId,
					role: "owner",
					status: "active",
				};
			},
		};
		const grantRepository = createInMemoryGrantRepository();
		const base = createRecordingGovernanceUnitOfWork({
			grantRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal: createInMemoryCommandJournalRepository(),
		});
		const unitOfWork: typeof base.unitOfWork = {
			async runInTransaction(ctx: TenantContext, work: (context: GovernanceTransactionContext) => Promise<T>) {
				insideGrantTx = true;
				return base.unitOfWork.runInTransaction(ctx, work).finally(() => {
					insideGrantTx = false;
				});
			},
		};
		const deps = {
			unitOfWork,
			membershipRead,
			inboxProcessor: { process: async () => "processed" as const },
		};

		await expect(
			handleOrganizationsMembershipEvent(
				deps,
				createMembershipActivatedEnvelope({
					membershipId,
					agencyId,
					principalId: ownerPrincipalId,
					role: "owner",
					revision: 1,
				}),
			),
		).rejects.toBeInstanceOf(OrganizationsMembershipConsumerError);

		const derived =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		expect(derived).toHaveLength(0);
	});

	test("passes governance TX client to membership read for same-connection revalidation", async () => {
		const txClientSentinel = {} as PoolClient;
		let receivedTxClient: PoolClient | undefined;
		const membershipRead: OrganizationsMembershipReadPort = {
			async findMembership(entryAgencyId, entryMembershipId, options) {
				receivedTxClient = options?.transactionClient;
				return {
					agencyId: entryAgencyId,
					membershipId: entryMembershipId,
					principalId: ownerPrincipalId,
					role: "owner",
					status: "active",
				};
			},
		};
		const grantRepository = createInMemoryGrantRepository();
		const base = createRecordingGovernanceUnitOfWork({
			grantRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal: createInMemoryCommandJournalRepository(),
		});
		const unitOfWork: GovernanceUnitOfWork = {
			async runInTransaction(ctx: TenantContext, work: (context: GovernanceTransactionContext) => Promise<T>) {
				return base.unitOfWork.runInTransaction(ctx, async (context) =>
					work({ ...context, client: txClientSentinel }),
				);
			},
		};
		const deps = {
			unitOfWork,
			membershipRead,
			inboxProcessor: { process: async () => "processed" as const },
		};

		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipActivatedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				role: "owner",
				revision: 1,
			}),
		);

		expect(receivedTxClient).toBe(txClientSentinel);
	});

	test("rejects forged membership.activated payload when read-model mismatches", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps } = createConsumerDeps(membershipRead);
		await expect(
			handleOrganizationsMembershipEvent(
				deps,
				createMembershipActivatedEnvelope({
					membershipId,
					agencyId,
					principalId: "99999999-9999-4999-8999-999999999999",
					role: "owner",
					revision: 1,
				}),
			),
		).rejects.toBeInstanceOf(OrganizationsMembershipConsumerError);
	});

	test("rejects forged membership.activated payload when agencyId mismatches read-model", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps } = createConsumerDeps(membershipRead);
		await expect(
			handleOrganizationsMembershipEvent(
				deps,
				createMembershipActivatedEnvelope({
					membershipId,
					agencyId: wrongAgencyId,
					principalId: ownerPrincipalId,
					role: "owner",
					revision: 1,
				}),
			),
		).rejects.toBeInstanceOf(OrganizationsMembershipConsumerError);
	});

	test("rejects forged membership.revoked payload when principalId mismatches read-model", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "revoked",
			},
		});
		const { deps } = createConsumerDeps(membershipRead);
		await expect(
			handleOrganizationsMembershipEvent(
				deps,
				createMembershipRevokedEnvelope({
					membershipId,
					agencyId,
					principalId: "99999999-9999-4999-8999-999999999999",
					revision: 2,
				}),
			),
		).rejects.toBeInstanceOf(OrganizationsMembershipConsumerError);
	});

	test("transfers baseline owner grants on ownership.transferred", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
			[`${agencyId}:${successorMembershipId}`]: {
				agencyId,
				membershipId: successorMembershipId,
				principalId: successorPrincipalId,
				role: "owner",
				status: "active",
			},
		});
		const { deps, grantRepository, published } =
			createConsumerDeps(membershipRead);

		await handleOrganizationsMembershipEvent(
			deps,
			createMembershipActivatedEnvelope({
				membershipId,
				agencyId,
				principalId: ownerPrincipalId,
				role: "owner",
				revision: 1,
			}),
		);

		await handleOrganizationsMembershipEvent(
			deps,
			createOwnershipTransferredEnvelope({
				agencyId,
				previousOwnerPrincipalId: ownerPrincipalId,
				previousOwnerMembershipId: membershipId,
				newOwnerPrincipalId: successorPrincipalId,
				newOwnerMembershipId: successorMembershipId,
				revision: 2,
			}),
		);

		const previousOwnerGrants =
			await grantRepository.findActiveByDerivedFromMembershipId(membershipId);
		const successorGrants =
			await grantRepository.findActiveByDerivedFromMembershipId(
				successorMembershipId,
			);
		expect(previousOwnerGrants).toHaveLength(0);
		expect(successorGrants).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
		expect(
			published.filter(
				(event) => event.eventType === GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
			),
		).toHaveLength(OWNER_BASELINE_CAPABILITIES.length);
		expect(
			published.filter(
				(event) => event.eventType === GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
			),
		).toHaveLength(OWNER_BASELINE_CAPABILITIES.length * 2);
	});

	test("rejects forged ownership.transferred payload when read-model mismatches", async () => {
		const membershipRead = createStubMembershipRead({
			[`${agencyId}:${membershipId}`]: {
				agencyId,
				membershipId,
				principalId: ownerPrincipalId,
				role: "owner",
				status: "active",
			},
			[`${agencyId}:${successorMembershipId}`]: {
				agencyId,
				membershipId: successorMembershipId,
				principalId: successorPrincipalId,
				role: "admin",
				status: "active",
			},
		});
		const { deps } = createConsumerDeps(membershipRead);
		await expect(
			handleOrganizationsMembershipEvent(
				deps,
				createOwnershipTransferredEnvelope({
					agencyId,
					previousOwnerPrincipalId: ownerPrincipalId,
					previousOwnerMembershipId: membershipId,
					newOwnerPrincipalId: successorPrincipalId,
					newOwnerMembershipId: successorMembershipId,
					revision: 2,
				}),
			),
		).rejects.toBeInstanceOf(OrganizationsMembershipConsumerError);
	});

	test("exports stable consumer name for wiring parity", () => {
		expect(GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME).toBe(
			"governance:organizations:v1",
		);
	});
});
