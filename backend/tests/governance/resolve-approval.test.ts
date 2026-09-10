import { describe, expect, test } from "bun:test";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import { resolveApproval } from "@anxionos/governance";
import type { ChangeProposal } from "@anxionos/governance";
import type { Grant } from "@anxionos/governance";
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
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const viewerPrincipalId = "22222222-2222-4222-8222-222222222222";
const proposalId = "50505050-5050-4505-8505-505050505050";

const pendingProposal: ChangeProposal = {
	id: proposalId,
	scopeId,
	kind: "INSTITUTIONAL",
	payloadHash: "sha256:institutional-change",
	proposerPrincipalId: viewerPrincipalId,
	status: "pending",
	requiredApprovals: 1,
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

const ownerGrant: Grant = {
	id: "60606060-6060-4606-8606-606060606060",
	scopeId,
	scopeKind: "agency",
	granteePrincipalId: ownerPrincipalId,
	granteeAgentId: null,
	capability: "owner.manage",
	resourceRef: null,
	status: "active",
	validFrom: new Date("2026-09-08T12:00:00.000Z"),
	validUntil: null,
	derivedFromMembershipId: null,
	authorityEpochAtIssue: 1,
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

function createResolveApprovalDeps(options?: {
	grants?: Grant[];
	proposal?: ChangeProposal;
}) {
	const changeProposalRepository = createInMemoryChangeProposalRepository([
		options?.proposal ?? pendingProposal,
	]);
	const grantRepository = createInMemoryGrantRepository(
		options?.grants ?? [ownerGrant],
	);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository,
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: { unitOfWork, commandJournal, changeProposalRepository },
		changeProposalRepository,
		published,
	};
}

describe("resolveApproval", () => {
	test("owner approves institutional proposal and emits approval resolved event", async () => {
		const { deps, changeProposalRepository, published } =
			createResolveApprovalDeps();
		const commandId = "70707070-7070-4707-8707-707070707070";
		const result = await resolveApproval(deps, {
			commandId,
			changeProposalId: proposalId,
			decision: "APPROVED",
			resolverPrincipalId: ownerPrincipalId,
		});
		expect(result.revision).toBe(1);
		const updated = await changeProposalRepository.findById(proposalId);
		expect(updated?.status).toBe("approved");
		expect(published[0]?.eventType).toBe(
			GOVERNANCE_EVENT_TYPES.APPROVAL_RESOLVED,
		);
	});

	test("resolver without owner authority fails closed", async () => {
		const { deps } = createResolveApprovalDeps({ grants: [] });
		await expect(
			resolveApproval(deps, {
				commandId: "80808080-8080-4808-8808-808080808080",
				changeProposalId: proposalId,
				decision: "APPROVED",
				resolverPrincipalId: viewerPrincipalId,
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	test("non-pending proposal cannot be resolved", async () => {
		const approvedProposal: ChangeProposal = {
			...pendingProposal,
			status: "approved",
		};
		const { deps } = createResolveApprovalDeps({ proposal: approvedProposal });
		await expect(
			resolveApproval(deps, {
				commandId: "90909090-9090-4909-8909-909090909090",
				changeProposalId: proposalId,
				decision: "APPROVED",
				resolverPrincipalId: ownerPrincipalId,
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});
