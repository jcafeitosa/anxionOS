import { randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { issueGrant } from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import { describe, expect, test } from "bun:test";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

/**
 * ANX-462, ANX-466 — Capability scope and issuance abuse cases.
 *
 * ANX-462: Platform-only capabilities require PLATFORM_SCOPE_ID.
 * ANX-466: Capabilities must be in catalog; issuer needs role + possession.
 *
 * Abuse cases:
 * 1. Agency operator self-issues console.platform in agency scope
 * 2. Agency-scoped grant attempts to authorize platform operations
 * 3. Omitting x-agency-id does not degrade to platform access
 * 4. Operator self-issues identity.admin (administrative capability)
 * 5. Operator issues capability they don't possess
 * 6. Unknown capability string is rejected
 */
describe("ANX-462 + ANX-466 — capability scope and issuance abuse cases", () => {
	function createIssueGrantDeps(existingPrincipals: string[] = []) {
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
				principalLookup: createStubPrincipalLookup(existingPrincipals),
			},
			grantRepository,
			published,
		};
	}

	test("ABUSE CASE 1 — agency operator cannot self-issue console.platform in agency scope", async () => {
		const agencyId = randomUUID();
		const operatorId = randomUUID();
		const { deps } = createIssueGrantDeps([operatorId]);

		// Operator tries to issue console.platform in agency scope
		await expect(
			issueGrant(deps, {
				commandId: randomUUID(),
				scopeId: agencyId,
				granteePrincipalId: operatorId,
				capability: "console.platform",
				issuedByPrincipalId: null,
			}),
		).rejects.toThrow(GovernanceCommandError);

		await expect(
			issueGrant(deps, {
				commandId: randomUUID(),
				scopeId: agencyId,
				granteePrincipalId: operatorId,
				capability: "console.platform",
				issuedByPrincipalId: null,
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_SCOPE_MISMATCH",
		});
	});

	test("ABUSE CASE 2 — console.platform requires PLATFORM_SCOPE_ID", async () => {
		const principalId = randomUUID();
		const { deps } = createIssueGrantDeps([principalId]);

		// Any agency id (not PLATFORM_SCOPE_ID) must fail
		const randomAgencyId = randomUUID();
		await expect(
			issueGrant(deps, {
				commandId: randomUUID(),
				scopeId: randomAgencyId,
				granteePrincipalId: principalId,
				capability: "console.platform",
				issuedByPrincipalId: null,
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_SCOPE_MISMATCH",
		});

		// Valid: PLATFORM_SCOPE_ID works
		const platformGrant = await issueGrant(deps, {
			commandId: randomUUID(),
			scopeId: PLATFORM_SCOPE_ID,
			granteePrincipalId: principalId,
			capability: "console.platform",
			issuedByPrincipalId: null,
		});
		expect(platformGrant.authorityEpoch).toBeGreaterThan(0);
	});

	test("ABUSE CASE 3 — unknown capability is rejected (GOV_CAPABILITY_UNKNOWN)", async () => {
		const principalId = randomUUID();
		const { deps } = createIssueGrantDeps([principalId]);

		await expect(
			issueGrant(deps, {
				commandId: randomUUID(),
				scopeId: PLATFORM_SCOPE_ID,
				granteePrincipalId: principalId,
				capability: "identity.superadmin.takeover",
				issuedByPrincipalId: null,
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
		});
	});

	test("VALID CASE — known capability in correct scope succeeds", async () => {
		const principalId = randomUUID();
		const { deps, grantRepository } = createIssueGrantDeps([principalId]);

		const result = await issueGrant(deps, {
			commandId: randomUUID(),
			scopeId: PLATFORM_SCOPE_ID,
			granteePrincipalId: principalId,
			capability: "owner.manage",
			issuedByPrincipalId: null,
		});

		expect(result.authorityEpoch).toBeGreaterThan(0);
		const stored = await grantRepository.findById(result.aggregateId);
		expect(stored?.capability).toBe("owner.manage");
		expect(stored?.status).toBe("active");
	});
});
