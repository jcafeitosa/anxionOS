import { describe, expect, test } from "bun:test";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import { submitChangeProposal } from "@anxionos/governance";
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
const proposerPrincipalId = "11111111-1111-4111-8111-111111111111";

function createSubmitProposalDeps() {
	const changeProposalRepository = createInMemoryChangeProposalRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository: createInMemoryGrantRepository(),
		changeProposalRepository,
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([proposerPrincipalId]),
		},
		changeProposalRepository,
		published,
	};
}

describe("submitChangeProposal", () => {
	test("submits pending institutional proposal and emits event", async () => {
		const { deps, changeProposalRepository, published } = createSubmitProposalDeps();
		const commandId = "30303030-3030-4303-8303-303030303030";
		const result = await submitChangeProposal(deps, {
			commandId,
			scopeId,
			kind: "INSTITUTIONAL",
			payloadHash: "sha256:abc123",
			proposerPrincipalId,
		});
		expect(result.revision).toBe(1);
		const stored = await changeProposalRepository.findById(result.aggregateId);
		expect(stored?.status).toBe("pending");
		expect(stored?.requiredApprovals).toBe(1);
		expect(published[0]?.eventType).toBe(GOVERNANCE_EVENT_TYPES.CHANGE_PROPOSAL_SUBMITTED);
	});

	test("unknown proposer fails closed", async () => {
		const changeProposalRepository = createInMemoryChangeProposalRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingGovernanceUnitOfWork({
			grantRepository: createInMemoryGrantRepository(),
			changeProposalRepository,
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		await expect(
			submitChangeProposal(
				{
					unitOfWork,
					commandJournal,
					principalLookup: createStubPrincipalLookup(),
				},
				{
					commandId: "40404040-4040-4404-8404-404040404040",
					scopeId,
					kind: "SOFTWARE",
					payloadHash: "sha256:def456",
					proposerPrincipalId,
				},
			),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});
