import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createSkillVersion,
	recordSkillVersionEvaluation,
	registerSkill,
	submitSkillVersion,
} from "@anxionos/agents";
import { AGENTS_SKILL_EVALUATE_CAPABILITY } from "@anxionos/contracts/agents";
import { createGovernanceSkillEvaluationGuard } from "../../apps/api/src/agents/governance-guards";
import {
	createInMemoryAutonomyAssignmentRepository,
	createInMemoryGrantRepository,
} from "../governance/test-support";
import {
	createInMemoryCommandJournalRepository,
	createInMemorySkillRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyId = organizationId;
const actorPrincipalId = "33333333-3333-4333-8333-333333333333";

const contentRef = {
	bucket: "skills",
	key: "org/test/skill-v1.md",
	contentHash: "sha256:skill-content",
};

const evaluationRef = {
	evaluationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
	rubricVersion: "rubric-v1",
	outcome: "pass" as const,
	evidenceHash: "sha256:evidence",
};

function createEvalDeps(grantRepository = createInMemoryGrantRepository()) {
	const autonomyAssignmentRepository =
		createInMemoryAutonomyAssignmentRepository();
	const skillRepository = createInMemorySkillRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingAgentsUnitOfWork({
		skillRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			skillRepository,
			skillEvaluationGuard: createGovernanceSkillEvaluationGuard({
				autonomyAssignmentRepository,
				grantRepository,
			}),
		},
		grantRepository,
	};
}

async function seedCandidateSkill(
	deps: ReturnType<typeof createEvalDeps>["deps"],
) {
	const skill = await registerSkill(deps, {
		commandId: randomUUID(),
		slug: `guard-skill-${randomUUID().slice(0, 8)}`,
		displayName: "Guard Skill",
		organizationId,
	});
	const skillVersion = await createSkillVersion(deps, {
		commandId: randomUUID(),
		skillId: skill.aggregateId,
		schemaVersion: "1.0.0",
		contentRef,
		contentHash: "sha256:guard-hash",
	});
	await submitSkillVersion(deps, {
		commandId: randomUUID(),
		skillId: skill.aggregateId,
		skillVersionId: skillVersion.aggregateId,
		expectedRevision: skillVersion.revision,
	});
	return { skill, skillVersion };
}

describe("createGovernanceSkillEvaluationGuard (G4-M1)", () => {
	test("denies evaluation when member lacks agents.skills.evaluate grant", async () => {
		const { deps } = createEvalDeps();
		const { skill, skillVersion } = await seedCandidateSkill(deps);

		await expect(
			recordSkillVersionEvaluation(deps, {
				commandId: randomUUID(),
				skillId: skill.aggregateId,
				skillVersionId: skillVersion.aggregateId,
				expectedRevision: skillVersion.revision + 1,
				outcome: "verified",
				evaluationRef,
				actorPrincipalId,
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_TRAVERSAL_DENIED" });
	});

	test("allows evaluation when principal has agents.skills.evaluate grant", async () => {
		const grantRepository = createInMemoryGrantRepository();
		const now = new Date("2026-09-10T12:00:00.000Z");
		await grantRepository.save({
			id: randomUUID(),
			tenantId: agencyId,
			agencyId,
			scopeId: agencyId,
			scopeKind: "agency",
			granteePrincipalId: actorPrincipalId,
			granteeAgentId: null,
			capability: AGENTS_SKILL_EVALUATE_CAPABILITY,
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

		const { deps } = createEvalDeps(grantRepository);
		const { skill, skillVersion } = await seedCandidateSkill(deps);

		const result = await recordSkillVersionEvaluation(deps, {
			commandId: randomUUID(),
			skillId: skill.aggregateId,
			skillVersionId: skillVersion.aggregateId,
			expectedRevision: skillVersion.revision + 1,
			outcome: "verified",
			evaluationRef,
			actorPrincipalId,
		});
		expect(result.revision).toBeGreaterThan(skillVersion.revision);
	});
});
