import { describe, expect, test } from "bun:test";
import { AppError } from "@anxionos/contracts/errors";
import { GovernanceCommandError } from "@anxionos/governance";
import {
	GOVERNANCE_T01_DENY_REASONS,
	createGraphT01TraversalEvaluator,
} from "@anxionos/governance";
import { handleAuthorizationCan } from "../../apps/api/src/governance/handlers/authorization-can";
import {
	handleIssueGrant,
	handleListGrants,
	handleRevokeGrant,
	toGrantDto,
} from "../../apps/api/src/governance/handlers/grants";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "11111111-1111-4111-8111-111111111111";
const granteePrincipalId = "22222222-2222-4222-8222-222222222222";
const grantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherAgencyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherPrincipalId = "33333333-3333-4333-8333-333333333333";

function seedGrant(overrides: Partial<Grant> = {}): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: grantId,
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: principalId,
		granteeAgentId: null,
		capability: "owner.read",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date("2027-09-10T12:00:00.000Z"),
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function createGrantHandlerDeps() {
	const grantRepository = createInMemoryGrantRepository([seedGrant()]);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		grantRepository,
		commandJournal,
		unitOfWork,
		principalLookup: createStubPrincipalLookup([granteePrincipalId]),
	};
}

describe("governance API handlers (slice 6)", () => {
	test("handleListGrants returns DTOs for effective grants", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleListGrants(deps, {
			agencyId: scopeId,
			principalId,
		});
		expect(result.grants).toHaveLength(1);
		expect(result.grants[0]?.id).toBe(grantId);
	});

	test("handleIssueGrant issues grant for agency scope", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleIssueGrant(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			agencyId: scopeId,
			body: {
				granteePrincipalId,
				capability: "owner.manage",
			},
		});
		expect(result.aggregateId).toBeTruthy();
	});

	test("handleRevokeGrant revokes grant by id", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleRevokeGrant(deps, {
			commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
			agencyId: scopeId,
			grantId,
			body: { reason: "test revoke" },
		});
		expect(result.revision).toBeGreaterThan(0);
	});

	test("handleRevokeGrant rejects grant outside agency scope", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleRevokeGrant(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				agencyId: otherAgencyId,
				grantId,
				body: {},
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	test("handleAuthorizationCan rejects actorId mismatch", async () => {
		const traversalEvaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			graphEvaluator: {
				async evaluate() {
					return { decision: "ALLOW" as const };
				},
			},
		});
		await expect(
			handleAuthorizationCan({ traversalEvaluator } as never, {
				principalId,
				body: {
					agencyId: scopeId,
					actorId: otherPrincipalId,
					action: "trade.execute",
					resourceNodeKey: {
						scopeType: "AGENCY",
						scopeId,
						type: "account",
						id: scopeId,
					},
					validAt: new Date().toISOString(),
				},
			}),
		).rejects.toBeInstanceOf(AppError);
	});

	test("toGrantDto serializes ISO timestamps", () => {
		const dto = toGrantDto(seedGrant());
		expect(dto.validFrom).toMatch(/2026-09-10/);
	});

	test("handleAuthorizationCan fail-closed when graph unavailable", async () => {
		const traversalEvaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			graphEvaluator: {
				async evaluate() {
					throw new Error("down");
				},
			},
		});
		const result = await handleAuthorizationCan(
			{ traversalEvaluator } as never,
			{
				principalId,
				body: {
					agencyId: scopeId,
					actorId: principalId,
					action: "trade.execute",
					resourceNodeKey: {
						scopeType: "AGENCY",
						scopeId,
						type: "account",
						id: scopeId,
					},
					validAt: new Date().toISOString(),
				},
			},
		);
		expect(result.decision).toBe("DENY");
		expect(result.denyReasons).toContain(
			GOVERNANCE_T01_DENY_REASONS.GRAPH_UNAVAILABLE,
		);
	});
});
