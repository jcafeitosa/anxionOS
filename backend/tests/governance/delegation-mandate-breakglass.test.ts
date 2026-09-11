import { describe, expect, test } from "bun:test";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import {
	activateBreakGlass,
	createDelegation,
	type Grant,
	issueMandate,
} from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryDelegationRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const parentGrantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const delegatePrincipalId = "22222222-2222-4222-8222-222222222222";

function seedParentGrant(capability = "owner.*"): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: parentGrantId,
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: ownerPrincipalId,
		granteeAgentId: null,
		capability,
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date("2027-09-10T12:00:00.000Z"),
		derivedFromMembershipId: null,
		issuedByPrincipalId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function createDelegationDeps(parentGrant: Grant) {
	const grantRepository = createInMemoryGrantRepository([parentGrant]);
	const delegationRepository = createInMemoryDelegationRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		delegationRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			grantRepository,
			principalLookup: createStubPrincipalLookup([
				ownerPrincipalId,
				delegatePrincipalId,
			]),
		},
		delegationRepository,
		grantRepository,
		published,
	};
}

describe("createDelegation (G3-GOV-04)", () => {
	test("creates delegation and child grants within parent authority", async () => {
		const { deps, delegationRepository, grantRepository, published } =
			createDelegationDeps(seedParentGrant());
		const commandId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const result = await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read", "owner.manage"],
			validUntil: "2027-01-01T00:00:00.000Z",
		});
		expect(result.authorityEpoch).toBe(1);
		const delegation = await delegationRepository.findById(result.aggregateId);
		expect(delegation?.capabilitySubset).toEqual([
			"owner.read",
			"owner.manage",
		]);
		const childGrants = await grantRepository.listEffective(
			scopeId,
			delegatePrincipalId,
		);
		expect(childGrants).toHaveLength(2);
		expect(
			published.some(
				(e) => e.eventType === GOVERNANCE_EVENT_TYPES.DELEGATION_CREATED,
			),
		).toBe(true);
	});

	/**
	 * FURO 5 (LOW do G5 r2) — o subset que AMPLIA o parent e' recusado com 409 e
	 * ZERO escrita (nenhum grant filho, nenhum evento): a delegacao nunca amplia
	 * autoridade.
	 */
	test("rejects capability subset that exceeds parent grant", async () => {
		const { deps, grantRepository, published } = createDelegationDeps(
			seedParentGrant("owner.read"),
		);
		await expect(
			createDelegation(deps, {
				commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				parentGrantId,
				delegatePrincipalId,
				capabilitySubset: ["owner.manage"],
				validUntil: "2027-01-01T00:00:00.000Z",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_DELEGATION_EXCEEDS_PARENT",
			statusCode: 409,
		} satisfies Partial<GovernanceCommandError>);
		expect(
			await grantRepository.listEffective(scopeId, delegatePrincipalId),
		).toHaveLength(0);
		expect(published).toHaveLength(0);
	});

	/**
	 * FURO 5 (LOW do G5 r2) — o invariante de catalogo do ANX-466/N3 nao tinha
	 * teste commitado: subset com token fora do catalogo e' 400
	 * `GOV_CAPABILITY_UNKNOWN` e nao grava nem o filho nem o evento.
	 */
	test("rejects a capability subset outside the catalog and writes nothing", async () => {
		const { deps, grantRepository, published } = createDelegationDeps(
			seedParentGrant(),
		);
		await expect(
			createDelegation(deps, {
				commandId: "f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0",
				parentGrantId,
				delegatePrincipalId,
				capabilitySubset: ["totally.unknown.capability"],
				validUntil: "2027-01-01T00:00:00.000Z",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
			statusCode: 400,
		} satisfies Partial<GovernanceCommandError>);
		expect(
			await grantRepository.listEffective(scopeId, delegatePrincipalId),
		).toHaveLength(0);
		expect(published).toHaveLength(0);
	});

	test("unknown parent grant fails closed", async () => {
		const { deps } = createDelegationDeps(seedParentGrant());
		await expect(
			createDelegation(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				parentGrantId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				delegatePrincipalId,
				capabilitySubset: ["owner.read"],
				validUntil: "2027-01-01T00:00:00.000Z",
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_GRANT_NOT_FOUND" });
	});

	test("replays idempotently for the same commandId", async () => {
		const { deps } = createDelegationDeps(seedParentGrant());
		const commandId = "12121212-1212-4121-8121-121212121212";
		const first = await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read"],
			validUntil: "2027-01-01T00:00:00.000Z",
		});
		const second = await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read"],
			validUntil: "2027-01-01T00:00:00.000Z",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});
});

describe("issueMandate (INV-GOV-04)", () => {
	test("issues mandate when backing grant is active", async () => {
		const parentGrant = seedParentGrant();
		const { deps } = createDelegationDeps(parentGrant);
		const agentId = "33333333-3333-4333-8333-333333333333";
		const result = await issueMandate(deps, {
			commandId: "abababab-abab-4aba-8aba-abababababab",
			grantId: parentGrantId,
			agentId,
			mandateKind: "operator",
		});
		expect(result.aggregateId).toBeTruthy();
	});

	test("rejects mandate when backing grant is revoked", async () => {
		const revokedGrant = { ...seedParentGrant(), status: "revoked" as const };
		const { deps } = createDelegationDeps(revokedGrant);
		await expect(
			issueMandate(deps, {
				commandId: "bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc",
				grantId: parentGrantId,
				agentId: "33333333-3333-4333-8333-333333333333",
				mandateKind: "ceo",
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_GRANT_REVOKED" });
	});
});

describe("activateBreakGlass", () => {
	test("issues time-limited grant with audit event", async () => {
		const grantRepository = createInMemoryGrantRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
			grantRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		const result = await activateBreakGlass(
			{
				unitOfWork,
				commandJournal,
				principalLookup: createStubPrincipalLookup([delegatePrincipalId]),
			},
			{
				commandId: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
				scopeId,
				granteePrincipalId: delegatePrincipalId,
				capability: "owner.manage",
				reason: "incident INC-001",
				expiresAt,
				incidentRef: "INC-001",
			},
		);
		const grant = await grantRepository.findById(result.aggregateId);
		expect(grant?.resourceRef).toBe("break-glass:INC-001");
		expect(
			published.some(
				(e) => e.eventType === GOVERNANCE_EVENT_TYPES.BREAK_GLASS_ACTIVATED,
			),
		).toBe(true);
	});

	test("rejects break-glass TTL beyond 24h", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingGovernanceUnitOfWork({
			grantRepository: createInMemoryGrantRepository(),
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
		await expect(
			activateBreakGlass(
				{
					unitOfWork,
					commandJournal,
					principalLookup: createStubPrincipalLookup([delegatePrincipalId]),
				},
				{
					commandId: "dededede-dede-4ded-8ded-dededededede",
					scopeId,
					granteePrincipalId: delegatePrincipalId,
					capability: "owner.manage",
					reason: "incident INC-002",
					expiresAt,
				},
			),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
	});

	/**
	 * FURO 5 (LOW do G5 r2) — o invariante de catalogo do ANX-466/N2 nao tinha
	 * teste commitado: capability fora do catalogo e' 400
	 * `GOV_CAPABILITY_UNKNOWN`, sem grant e sem evento (o break-glass nao pode
	 * perpetuar token que o sistema nao consome).
	 */
	test("rejects a capability outside the catalog and writes nothing", async () => {
		const grantRepository = createInMemoryGrantRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
			grantRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		await expect(
			activateBreakGlass(
				{
					unitOfWork,
					commandJournal,
					principalLookup: createStubPrincipalLookup([delegatePrincipalId]),
				},
				{
					commandId: "efefefef-efef-4efe-8efe-efefefefefef",
					scopeId,
					granteePrincipalId: delegatePrincipalId,
					capability: "totally.unknown.capability",
					reason: "incident INC-003",
					expiresAt,
					incidentRef: "INC-003",
				},
			),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
			statusCode: 400,
		} satisfies Partial<GovernanceCommandError>);
		expect(
			await grantRepository.listActiveByPrincipal(delegatePrincipalId),
		).toHaveLength(0);
		expect(published).toHaveLength(0);
	});
});
