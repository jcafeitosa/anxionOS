import { describe, expect, test } from "bun:test";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import type { Grant } from "@anxionos/governance";
import { revokeGrant } from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const granteePrincipalId = "11111111-1111-4111-8111-111111111111";
const grantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const activeGrant: Grant = {
	id: grantId,
	scopeId,
	scopeKind: "agency",
	granteePrincipalId,
	granteeAgentId: null,
	capability: "owner.manage",
	resourceRef: null,
	status: "active",
	validFrom: new Date("2026-09-08T12:00:00.000Z"),
	validUntil: null,
	derivedFromMembershipId: null,
	issuedByPrincipalId: null,
	authorityEpochAtIssue: 1,
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

function createRevokeGrantDeps(seed: Grant[] = [activeGrant]) {
	const grantRepository = createInMemoryGrantRepository(seed);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore([
			{ scopeId, epoch: 1, updatedAt: new Date("2026-09-08T12:00:00.000Z") },
		]),
		commandJournal,
	});
	return {
		deps: { unitOfWork, commandJournal, grantRepository },
		grantRepository,
		published,
	};
}

describe("revokeGrant", () => {
	test("revokes active grant, bumps epoch and emits events", async () => {
		const { deps, grantRepository, published } = createRevokeGrantDeps();
		const commandId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
		const result = await revokeGrant(deps, { commandId, grantId });
		expect(result.authorityEpoch).toBe(2);
		expect(result.revision).toBe(2);
		const stored = await grantRepository.findById(grantId);
		expect(stored?.status).toBe("revoked");
		expect(published.map((event) => event.eventType)).toEqual([
			GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
			GOVERNANCE_EVENT_TYPES.AUTHORITY_EPOCH_BUMPED,
		]);
	});

	test("re-revoke is idempotent without duplicate epoch bump events", async () => {
		const revokedGrant: Grant = {
			...activeGrant,
			status: "revoked",
			revision: 2,
		};
		const { deps, published } = createRevokeGrantDeps([revokedGrant]);
		const commandId = "10101010-1010-4101-8101-101010101010";
		const result = await revokeGrant(deps, { commandId, grantId });
		expect(result.revision).toBe(2);
		expect(result.authorityEpoch).toBe(1);
		expect(published).toHaveLength(0);
	});

	test("unknown grant fails closed", async () => {
		const { deps } = createRevokeGrantDeps([]);
		await expect(
			revokeGrant(deps, {
				commandId: "20202020-2020-4202-8202-202020202020",
				grantId,
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});
