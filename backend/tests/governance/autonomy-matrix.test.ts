import { describe, expect, test } from "bun:test";
import {
	AUTONOMY_NORMATIVE_MATRIX,
	GOVERNANCE_EVENT_TYPES,
} from "@anxionos/contracts/governance";
import {
	assignAutonomyLevel,
	evaluateAutonomyCapability,
	getEffectiveAutonomy,
	transitionAutonomyLevel,
} from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import {
	validateAutonomyTransition,
	validateInitialAssignment,
} from "../../modules/governance/src/domain/policies/autonomy-normative-matrix";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryAutonomyAssignmentRepository,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "22222222-2222-4222-8222-222222222222";
const actorPrincipalId = "33333333-3333-4333-8333-333333333333";
const approvalId = "44444444-4444-4444-8444-444444444444";

function createAutonomyDeps() {
	const autonomyAssignmentRepository = createInMemoryAutonomyAssignmentRepository();
	const grantRepository = createInMemoryGrantRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		autonomyAssignmentRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: { unitOfWork, commandJournal },
		autonomyAssignmentRepository,
		grantRepository,
		published,
	};
}

describe("autonomy normative matrix", () => {
	test("defines five levels with L3/L4 runtime disabled", () => {
		expect(AUTONOMY_NORMATIVE_MATRIX).toHaveLength(5);
		const l3 = AUTONOMY_NORMATIVE_MATRIX.find((entry) => entry.level === "L3");
		const l4 = AUTONOMY_NORMATIVE_MATRIX.find((entry) => entry.level === "L4");
		expect(l3?.runtimeEnabled).toBe(false);
		expect(l4?.runtimeEnabled).toBe(false);
	});

	test("rejects L3 initial assignment", () => {
		const result = validateInitialAssignment("L3", true);
		expect(result.allowed).toBe(false);
	});

	test("promote requires approval and evidence", () => {
		const withoutApproval = validateAutonomyTransition({
			currentLevel: "L1",
			targetLevel: "L2",
			transitionKind: "promote",
			hasApproval: false,
			hasEvidence: true,
		});
		expect(withoutApproval.allowed).toBe(false);

		const withBoth = validateAutonomyTransition({
			currentLevel: "L1",
			targetLevel: "L2",
			transitionKind: "promote",
			hasApproval: true,
			hasEvidence: true,
		});
		expect(withBoth.allowed).toBe(true);
	});

	test("demote allows safe descent without approval", () => {
		const result = validateAutonomyTransition({
			currentLevel: "L2",
			targetLevel: "L1",
			transitionKind: "demote",
			hasApproval: false,
			hasEvidence: false,
		});
		expect(result.allowed).toBe(true);
	});
});

describe("assignAutonomyLevel", () => {
	test("assigns L0 and emits autonomy.assigned event", async () => {
		const { deps, published, autonomyAssignmentRepository } = createAutonomyDeps();
		const commandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const result = await assignAutonomyLevel(deps, {
			commandId,
			scopeId,
			subjectAgentId: agentId,
			level: "L0",
		});
		expect(result.revision).toBe(1);
		const stored = await autonomyAssignmentRepository.findById(result.aggregateId);
		expect(stored?.level).toBe("L0");
		expect(stored?.status).toBe("active");
		expect(published.map((event) => event.eventType)).toContain(
			GOVERNANCE_EVENT_TYPES.AUTONOMY_ASSIGNED,
		);
	});

	test("rejects duplicate active assignment", async () => {
		const { deps } = createAutonomyDeps();
		await assignAutonomyLevel(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			scopeId,
			subjectAgentId: agentId,
			level: "L0",
		});
		await expect(
			assignAutonomyLevel(deps, {
				commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				scopeId,
				subjectAgentId: agentId,
				level: "L1",
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	test("L2 requires approval on initial assign", async () => {
		const { deps } = createAutonomyDeps();
		await expect(
			assignAutonomyLevel(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				scopeId,
				subjectAgentId: agentId,
				level: "L2",
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});

async function seedAgentAtLevel(
	deps: ReturnType<typeof createAutonomyDeps>["deps"],
	targetLevel: "L0" | "L1" | "L2",
) {
	await assignAutonomyLevel(deps, {
		commandId: "a0000000-0000-4000-8000-000000000001",
		scopeId,
		subjectAgentId: agentId,
		level: "L0",
	});
	if (targetLevel === "L0") {
		return;
	}
	await transitionAutonomyLevel(deps, {
		commandId: "b0000000-0000-4000-8000-000000000002",
		scopeId,
		subjectAgentId: agentId,
		targetLevel: "L1",
		transitionKind: "promote",
		approvalId,
		evidenceHash: "sha256:seed-l1",
		actorPrincipalId,
	});
	if (targetLevel === "L1") {
		return;
	}
	await transitionAutonomyLevel(deps, {
		commandId: "c0000000-0000-4000-8000-000000000003",
		scopeId,
		subjectAgentId: agentId,
		targetLevel: "L2",
		transitionKind: "promote",
		approvalId,
		evidenceHash: "sha256:seed-l2",
		actorPrincipalId,
	});
}

describe("G3-GOV-06 autonomy transitions", () => {
describe("transitionAutonomyLevel", () => {
	test("promotes L0→L1 with approval and evidence", async () => {
		const { deps, published } = createAutonomyDeps();
		await assignAutonomyLevel(deps, {
			commandId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
			scopeId,
			subjectAgentId: agentId,
			level: "L0",
		});
		const result = await transitionAutonomyLevel(deps, {
			commandId: "10101010-1010-4101-8101-010101010101",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L1",
			transitionKind: "promote",
			approvalId,
			evidenceHash: "sha256:evidence-demo",
			actorPrincipalId,
		});
		expect(result.revision).toBe(1);
		expect(published.map((event) => event.eventType)).toContain(
			GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED,
		);
	});

	test("blocks L3 promotion at runtime", async () => {
		const { deps } = createAutonomyDeps();
		await assignAutonomyLevel(deps, {
			commandId: "12121212-1212-4121-8121-212121212121",
			scopeId,
			subjectAgentId: agentId,
			level: "L0",
		});
		await transitionAutonomyLevel(deps, {
			commandId: "13131313-1313-4131-8131-313131313131",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L1",
			transitionKind: "promote",
			approvalId,
			evidenceHash: "sha256:step1",
			actorPrincipalId,
		});
		await transitionAutonomyLevel(deps, {
			commandId: "14141414-1414-4141-8141-414141414141",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L2",
			transitionKind: "promote",
			approvalId,
			evidenceHash: "sha256:step2",
			actorPrincipalId,
		});
		await expect(
			transitionAutonomyLevel(deps, {
				commandId: "15151515-1515-4151-8151-515151515151",
				scopeId,
				subjectAgentId: agentId,
				targetLevel: "L3",
				transitionKind: "promote",
				approvalId,
				evidenceHash: "sha256:step3",
				actorPrincipalId,
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	test("demotes L2→L1 without approval", async () => {
		const { deps, autonomyAssignmentRepository } = createAutonomyDeps();
		await seedAgentAtLevel(deps, "L2");

		const result = await transitionAutonomyLevel(deps, {
			commandId: "17171717-1717-4171-8171-717171717171",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L1",
			transitionKind: "demote",
			actorPrincipalId,
		});

		const active = await autonomyAssignmentRepository.findActiveByAgentAndScope(
			scopeId,
			agentId,
		);
		expect(active?.level).toBe("L1");
		expect(active?.id).toBe(result.aggregateId);
		expect(result.revision).toBe(1);
	});

	test("takeover sets operator level ≤L2 with approval and audit fields", async () => {
		const { deps, published, autonomyAssignmentRepository } =
			createAutonomyDeps();

		const result = await transitionAutonomyLevel(deps, {
			commandId: "18181818-1818-4181-8181-818181818181",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L2",
			transitionKind: "takeover",
			approvalId,
			evidenceHash: "sha256:operator-takeover",
			actorPrincipalId,
			reason: "operator emergency takeover",
		});

		const active = await autonomyAssignmentRepository.findActiveByAgentAndScope(
			scopeId,
			agentId,
		);
		expect(active?.level).toBe("L2");
		expect(active?.approvalId).toBe(approvalId);
		expect(active?.evidenceHash).toBe("sha256:operator-takeover");
		expect(result.aggregateId).toBe(active?.id);
		expect(published.map((event) => event.eventType)).toContain(
			GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED,
		);
	});


	test("takeover without prior assignment emits fromLevel null (not targetLevel)", async () => {
		const { deps, published } = createAutonomyDeps();

		await transitionAutonomyLevel(deps, {
			commandId: "20202020-2020-4202-8202-020202020202",
			scopeId,
			subjectAgentId: agentId,
			targetLevel: "L2",
			transitionKind: "takeover",
			approvalId,
			evidenceHash: "sha256:operator-takeover-null-from",
			actorPrincipalId,
			reason: "operator emergency takeover",
		});

		const transitionEvent = published.find(
			(event) =>
				event.eventType === GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED,
		);
		expect(transitionEvent).toBeDefined();
		const payload = transitionEvent?.payload as {
			fromLevel: string | null;
			toLevel: string;
			transitionKind: string;
		};
		expect(payload.fromLevel).toBeNull();
		expect(payload.toLevel).toBe("L2");
		expect(payload.transitionKind).toBe("takeover");
	});

	test("blocks L4 promotion at runtime", async () => {
		const { deps } = createAutonomyDeps();
		await seedAgentAtLevel(deps, "L2");

		await expect(
			transitionAutonomyLevel(deps, {
				commandId: "19191919-1919-4191-8191-919191919191",
				scopeId,
				subjectAgentId: agentId,
				targetLevel: "L4",
				transitionKind: "promote",
				approvalId,
				evidenceHash: "sha256:l4-attempt",
				actorPrincipalId,
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});
});
});

describe("evaluateAutonomyCapability", () => {
	test("denies capability without individual grant", async () => {
		const { deps, autonomyAssignmentRepository, grantRepository } =
			createAutonomyDeps();
		await assignAutonomyLevel(deps, {
			commandId: "16161616-1616-4161-8161-616161616161",
			scopeId,
			subjectAgentId: agentId,
			level: "L1",
		});
		const effective = await getEffectiveAutonomy(
			{ autonomyAssignmentRepository },
			{ scopeId, subjectAgentId: agentId },
		);
		expect(effective.level).toBe("L1");

		const denied = await evaluateAutonomyCapability(
			{ autonomyAssignmentRepository, grantRepository },
			{
				scopeId,
				subjectAgentId: agentId,
				capability: "strategy.research",
			},
		);
		expect(denied.allowed).toBe(false);

		const now = new Date("2026-09-10T12:00:00.000Z");
		await grantRepository.save({
			id: "55555555-5555-4555-8555-555555555555",
			tenantId: scopeId,
			agencyId: scopeId,
			scopeId,
			scopeKind: "agency",
			granteePrincipalId: actorPrincipalId,
			granteeAgentId: agentId,
			capability: "strategy.research",
			resourceRef: null,
			status: "active",
			authorityEpochAtIssue: 1,
			revision: 1,
			derivedFromMembershipId: null,
			validFrom: now,
			validUntil: null,
			createdAt: now,
			updatedAt: now,
		});

		const allowed = await evaluateAutonomyCapability(
			{ autonomyAssignmentRepository, grantRepository },
			{
				scopeId,
				subjectAgentId: agentId,
				capability: "strategy.research",
			},
		);
		expect(allowed.allowed).toBe(true);
	});
});
