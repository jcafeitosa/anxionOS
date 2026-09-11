import { describe, expect, test } from "bun:test";
import {
	AgentsCommandError,
	bindAgentSkill,
	createSkillVersion,
	recordSkillVersionEvaluation,
	registerAgent,
	registerSkill,
	submitSkillVersion,
} from "@anxionos/agents";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createInMemorySkillRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

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

function createSkillDeps() {
	const skillRepository = createInMemorySkillRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingAgentsUnitOfWork({
		agentRepository: createInMemoryAgentRepository(),
		agentVersionRepository: createInMemoryAgentVersionRepository(),
		skillRepository,
		commandJournal,
	});
	return {
		deps: { unitOfWork, commandJournal, skillRepository },
		published,
	};
}

function createFullDeps() {
	const agentRepository = createInMemoryAgentRepository();
	const agentVersionRepository = createInMemoryAgentVersionRepository();
	const skillRepository = createInMemorySkillRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository,
		skillRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			skillRepository,
			agentRepository,
		},
		agentRepository,
		agentVersionRepository,
		published,
	};
}

describe("registerSkill (S10)", () => {
	test("creates skill and emits registered event", async () => {
		const { deps, published } = createSkillDeps();
		const result = await registerSkill(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			slug: "risk-review",
			displayName: "Risk Review",
			organizationId,
		});
		expect(result.revision).toBe(1);
		expect(published[0]?.eventType).toBe(AGENTS_EVENT_TYPES.SKILL_REGISTERED);
	});

	test("rejects duplicate slug", async () => {
		const { deps } = createSkillDeps();
		await registerSkill(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			slug: "risk-review",
			displayName: "Risk Review",
			organizationId,
		});
		await expect(
			registerSkill(deps, {
				commandId: "33333333-3333-4333-8333-333333333333",
				slug: "risk-review",
				displayName: "Duplicate",
				organizationId,
			}),
		).rejects.toBeInstanceOf(AgentsCommandError);
	});
});

describe("skill lifecycle and bindAgentSkill (S10)", () => {
	test("verified skill binds to draft agent version", async () => {
		const { deps, published } = createFullDeps();

		const agent = await registerAgent(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			displayName: "Analyst",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});

		const draftVersionId = crypto.randomUUID();
		const now = new Date();
		await deps.unitOfWork.runInTransaction(undefined, async (ctx) => {
			await ctx.agentVersionRepository.save({
				id: draftVersionId,
				agentId: agent.aggregateId,
				versionNumber: 1,
				status: "draft",
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest",
				modelSlots: [],
				autonomyLevel: "L1",
				createdAt: now,
			});
		});

		const skill = await registerSkill(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			slug: "market-scan",
			displayName: "Market Scan",
			organizationId,
		});

		const skillVersion = await createSkillVersion(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			skillId: skill.aggregateId,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:skill-hash",
		});

		await submitSkillVersion(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			skillId: skill.aggregateId,
			skillVersionId: skillVersion.aggregateId,
			expectedRevision: skillVersion.revision,
		});

		const evaluated = await recordSkillVersionEvaluation(deps, {
			commandId: "99999999-9999-4999-8999-999999999999",
			skillId: skill.aggregateId,
			skillVersionId: skillVersion.aggregateId,
			expectedRevision: skillVersion.revision + 1,
			outcome: "verified",
			evaluationRef,
		});

		const agentRow = await deps.agentRepository.findById(agent.aggregateId);
		if (!agentRow) throw new Error("agent missing");

		const binding = await bindAgentSkill(deps, {
			commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
			agentId: agent.aggregateId,
			agentVersionId: draftVersionId,
			skillVersionId: skillVersion.aggregateId,
			expectedAgentRevision: agentRow.revision,
			bindingConfig: { priority: 1 },
		});

		expect(binding.aggregateId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(evaluated.revision).toBeGreaterThan(skillVersion.revision);
		expect(
			published.some(
				(e) => e.eventType === AGENTS_EVENT_TYPES.AGENT_SKILL_BOUND,
			),
		).toBe(true);
	});

	test("bindAgentSkill rejects non-verified skill version", async () => {
		const { deps } = createFullDeps();

		const agent = await registerAgent(deps, {
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
			displayName: "Worker",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});

		const draftVersionId = crypto.randomUUID();
		const now = new Date();
		await deps.unitOfWork.runInTransaction(undefined, async (ctx) => {
			await ctx.agentVersionRepository.save({
				id: draftVersionId,
				agentId: agent.aggregateId,
				versionNumber: 1,
				status: "draft",
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest",
				modelSlots: [],
				autonomyLevel: "L1",
				createdAt: now,
			});
		});

		const skill = await registerSkill(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccd",
			slug: "draft-only",
			displayName: "Draft Only",
			organizationId,
		});

		const skillVersion = await createSkillVersion(deps, {
			commandId: "dddddddd-dddd-4ddd-8ddd-ddddddddddde",
			skillId: skill.aggregateId,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:draft",
		});

		const agentRow = await deps.agentRepository.findById(agent.aggregateId);
		if (!agentRow) throw new Error("agent missing");

		await expect(
			bindAgentSkill(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef",
				agentId: agent.aggregateId,
				agentVersionId: draftVersionId,
				skillVersionId: skillVersion.aggregateId,
				expectedAgentRevision: agentRow.revision,
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_SKILL_VERSION_NOT_VERIFIED" });
	});
});

describe("bindAgentSkill cross-org guard (G4-M2)", () => {
	const otherOrganizationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

	test("rejects binding skill from another organization", async () => {
		const { deps } = createFullDeps();

		const agent = await registerAgent(deps, {
			commandId: "a1111111-1111-4111-8111-111111111111",
			displayName: "Org A Agent",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});

		const draftVersionId = crypto.randomUUID();
		const now = new Date();
		await deps.unitOfWork.runInTransaction(undefined, async (ctx) => {
			await ctx.agentVersionRepository.save({
				id: draftVersionId,
				agentId: agent.aggregateId,
				versionNumber: 1,
				status: "draft",
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest",
				modelSlots: [],
				autonomyLevel: "L1",
				createdAt: now,
			});
		});

		const foreignSkill = await registerSkill(deps, {
			commandId: "a2222222-2222-4222-8222-222222222222",
			slug: "foreign-skill",
			displayName: "Foreign Skill",
			organizationId: otherOrganizationId,
		});

		const foreignVersion = await createSkillVersion(deps, {
			commandId: "a3333333-3333-4333-8333-333333333333",
			skillId: foreignSkill.aggregateId,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:foreign",
		});

		await submitSkillVersion(deps, {
			commandId: "a4444444-4444-4444-8444-444444444444",
			skillId: foreignSkill.aggregateId,
			skillVersionId: foreignVersion.aggregateId,
			expectedRevision: foreignVersion.revision,
		});

		await recordSkillVersionEvaluation(deps, {
			commandId: "a5555555-5555-4555-8555-555555555555",
			skillId: foreignSkill.aggregateId,
			skillVersionId: foreignVersion.aggregateId,
			expectedRevision: foreignVersion.revision + 1,
			outcome: "verified",
			evaluationRef,
		});

		const agentRow = await deps.agentRepository.findById(agent.aggregateId);
		if (!agentRow) throw new Error("agent missing");

		await expect(
			bindAgentSkill(deps, {
				commandId: "a6666666-6666-4666-8666-666666666666",
				agentId: agent.aggregateId,
				agentVersionId: draftVersionId,
				skillVersionId: foreignVersion.aggregateId,
				expectedAgentRevision: agentRow.revision,
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_TRAVERSAL_DENIED" });
	});
});

describe("recordSkillVersionEvaluation gate (S13)", () => {
	async function createCandidateSkillVersion() {
		const { deps } = createSkillDeps();
		const skill = await registerSkill(deps, {
			commandId: "f1111111-1111-4111-8111-111111111111",
			slug: "gate-skill",
			displayName: "Gate Skill",
			organizationId,
		});
		const skillVersion = await createSkillVersion(deps, {
			commandId: "f2222222-2222-4222-8222-222222222222",
			skillId: skill.aggregateId,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:gate-hash",
		});
		await submitSkillVersion(deps, {
			commandId: "f3333333-3333-4333-8333-333333333333",
			skillId: skill.aggregateId,
			skillVersionId: skillVersion.aggregateId,
			expectedRevision: skillVersion.revision,
		});
		return { deps, skill, skillVersion };
	}

	test("rejects verified promotion when evaluationRef outcome is fail", async () => {
		const { deps, skill, skillVersion } = await createCandidateSkillVersion();
		await expect(
			recordSkillVersionEvaluation(deps, {
				commandId: "f4444444-4444-4444-8444-444444444444",
				skillId: skill.aggregateId,
				skillVersionId: skillVersion.aggregateId,
				expectedRevision: skillVersion.revision + 1,
				outcome: "verified",
				evaluationRef: { ...evaluationRef, outcome: "fail" },
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_SKILL_EVALUATION_GATE_DENIED" });
	});

	test("rejects rejected outcome when evaluationRef outcome is pass", async () => {
		const { deps, skill, skillVersion } = await createCandidateSkillVersion();
		await expect(
			recordSkillVersionEvaluation(deps, {
				commandId: "f5555555-5555-4555-8555-555555555555",
				skillId: skill.aggregateId,
				skillVersionId: skillVersion.aggregateId,
				expectedRevision: skillVersion.revision + 1,
				outcome: "rejected",
				evaluationRef,
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_SKILL_EVALUATION_GATE_DENIED" });
	});

	test("allows rejected outcome when evaluationRef outcome is fail", async () => {
		const { deps, skill, skillVersion } = await createCandidateSkillVersion();
		const result = await recordSkillVersionEvaluation(deps, {
			commandId: "f6666666-6666-4666-8666-666666666666",
			skillId: skill.aggregateId,
			skillVersionId: skillVersion.aggregateId,
			expectedRevision: skillVersion.revision + 1,
			outcome: "rejected",
			evaluationRef: { ...evaluationRef, outcome: "fail" },
		});
		expect(result.revision).toBeGreaterThan(skillVersion.revision);
	});
});
