import { describe, expect, test } from "bun:test";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import { issueGrant } from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
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
const granteePrincipalId = "11111111-1111-4111-8111-111111111111";

function createIssueGrantDeps() {
	const grantRepository = createInMemoryGrantRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([granteePrincipalId]),
		},
		grantRepository,
		published,
	};
}

describe("issueGrant", () => {
	test("issues grant, bumps authority epoch and emits events", async () => {
		const { deps, grantRepository, published } = createIssueGrantDeps();
		const commandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const result = await issueGrant(deps, {
			commandId,
			scopeId,
			granteePrincipalId,
			capability: "owner.manage",
		});
		expect(result.authorityEpoch).toBe(1);
		expect(result.revision).toBe(1);
		const stored = await grantRepository.findById(result.aggregateId);
		expect(stored?.status).toBe("active");
		expect(stored?.authorityEpochAtIssue).toBe(1);
		expect(published.map((event) => event.eventType)).toEqual([
			GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
			GOVERNANCE_EVENT_TYPES.AUTHORITY_EPOCH_BUMPED,
		]);
	});

	test("replays idempotently for the same commandId", async () => {
		const { deps } = createIssueGrantDeps();
		const commandId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const first = await issueGrant(deps, {
			commandId,
			scopeId,
			granteePrincipalId,
			capability: "owner.read",
		});
		const second = await issueGrant(deps, {
			commandId,
			scopeId,
			granteePrincipalId,
			capability: "owner.read",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("unknown principal fails closed", async () => {
		const grantRepository = createInMemoryGrantRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingGovernanceUnitOfWork({
			grantRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		await expect(
			issueGrant(
				{
					unitOfWork,
					commandJournal,
					principalLookup: createStubPrincipalLookup(),
				},
				{
					commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
					scopeId,
					granteePrincipalId,
					capability: "owner.manage",
				},
			),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});
