import { describe, expect, test } from "bun:test";
import { GovernanceCommandError } from "@anxionos/governance";
import {
	handleAssignAutonomy,
	handleEvaluateAutonomyCapability,
	handleGetAutonomyMatrix,
	handleGetEffectiveAutonomy,
	handleTransitionAutonomy,
	toAutonomyAssignmentDto,
} from "../../apps/api/src/governance/handlers/autonomy";
import type { AutonomyAssignment } from "../../modules/governance/src/domain/entities/autonomy-assignment";
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

function seedAssignment(
	overrides: Partial<AutonomyAssignment> = {},
): AutonomyAssignment {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: "55555555-5555-4555-8555-555555555555",
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		subjectAgentId: agentId,
		level: "L1",
		status: "active",
		evidenceHash: null,
		approvalId: null,
		authorityEpochAtAssignment: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function seedAgentGrant(): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: "66666666-6666-4666-8666-666666666666",
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: actorPrincipalId,
		granteeAgentId: agentId,
		capability: "strategy.research",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: null,
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function createAutonomyHandlerDeps(
	seed: AutonomyAssignment[] = [],
	grantSeed: Grant[] = [],
) {
	const autonomyAssignmentRepository =
		createInMemoryAutonomyAssignmentRepository(seed);
	const grantRepository = createInMemoryGrantRepository(grantSeed);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		autonomyAssignmentRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		autonomyAssignmentRepository,
		grantRepository,
		commandJournal,
		unitOfWork,
	};
}

describe("autonomy API handlers (slice 5)", () => {
	test("handleGetAutonomyMatrix returns five levels with L3/L4 disabled", () => {
		const result = handleGetAutonomyMatrix();
		expect(result.matrix).toHaveLength(5);
		const l3 = result.matrix.find((entry) => entry.level === "L3");
		expect(l3?.runtimeEnabled).toBe(false);
	});

	test("handleGetEffectiveAutonomy returns active assignment", async () => {
		const deps = createAutonomyHandlerDeps([seedAssignment()]);
		const result = await handleGetEffectiveAutonomy(deps, {
			agencyId: scopeId,
			agentId,
		});
		expect(result.level).toBe("L1");
		expect(result.assignment?.subjectAgentId).toBe(agentId);
	});

	test("handleAssignAutonomy assigns L0 for agency agent", async () => {
		const deps = createAutonomyHandlerDeps();
		const result = await handleAssignAutonomy(deps, {
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			agencyId: scopeId,
			agentId,
			body: { level: "L0" },
		});
		expect(result.revision).toBe(1);
	});

	test("handleTransitionAutonomy promotes with approval and evidence", async () => {
		const deps = createAutonomyHandlerDeps([seedAssignment({ level: "L0" })]);
		const result = await handleTransitionAutonomy(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			agencyId: scopeId,
			agentId,
			actorPrincipalId,
			body: {
				targetLevel: "L1",
				transitionKind: "promote",
				approvalId,
				evidenceHash: "sha256:demo",
			},
		});
		expect(result.authorityEpoch).toBeGreaterThan(0);
	});

	test("handleTransitionAutonomy blocks L3 at runtime", async () => {
		const deps = createAutonomyHandlerDeps([seedAssignment({ level: "L2" })]);
		await expect(
			handleTransitionAutonomy(deps, {
				commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				agencyId: scopeId,
				agentId,
				actorPrincipalId,
				body: {
					targetLevel: "L3",
					transitionKind: "promote",
					approvalId,
					evidenceHash: "sha256:demo",
				},
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	test("handleEvaluateAutonomyCapability resolves grants server-side", async () => {
		const deps = createAutonomyHandlerDeps(
			[seedAssignment()],
			[seedAgentGrant()],
		);
		const denied = await handleEvaluateAutonomyCapability(deps, {
			body: {
				agencyId: scopeId,
				subjectAgentId: agentId,
				capability: "intent.propose",
			},
		});
		expect(denied.allowed).toBe(false);

		const allowed = await handleEvaluateAutonomyCapability(deps, {
			body: {
				agencyId: scopeId,
				subjectAgentId: agentId,
				capability: "strategy.research",
			},
		});
		expect(allowed.allowed).toBe(true);
	});

	test("toAutonomyAssignmentDto serializes ISO timestamps", () => {
		const dto = toAutonomyAssignmentDto(seedAssignment());
		expect(dto.createdAt).toMatch(/2026-09-10/);
	});
});
