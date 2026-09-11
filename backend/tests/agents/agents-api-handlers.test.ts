import { describe, expect, test } from "bun:test";
import { AgentsCommandError } from "@anxionos/agents";
import {
	handleGetAgent,
	handleListAgentVersions,
	handlePublishAgentVersion,
	handleRegisterAgent,
} from "../../apps/api/src/agents/handlers/agents";
import {
	handleBindAgentSkill,
	handleCreateSkillVersion,
	handleRecordSkillVersionEvaluation,
	handleRegisterSkill,
	handleSubmitSkillVersion,
} from "../../apps/api/src/agents/handlers/skills";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createInMemorySkillRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "33333333-3333-4333-8333-333333333333";

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

function createHandlerDeps() {
	const agentRepository = createInMemoryAgentRepository();
	const agentVersionRepository = createInMemoryAgentVersionRepository();
	const skillRepository = createInMemorySkillRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository,
		skillRepository,
		commandJournal,
	});
	return {
		agentRepository,
		agentVersionRepository,
		skillRepository,
		commandJournal,
		unitOfWork,
	};
}

describe("agents API handlers", () => {
	test("register, get, list versions and publish via handlers", async () => {
		const deps = createHandlerDeps();
		const registerCommandId = "11111111-1111-4111-8111-111111111111";
		const registered = await handleRegisterAgent(deps, {
			commandId: registerCommandId,
			agencyId,
			principalId,
			body: {
				displayName: "Handler Agent",
				kind: "AGENCY",
			},
		});
		expect(registered.agentId).toMatch(/^[0-9a-f-]{36}$/i);

		const agent = await handleGetAgent(deps, {
			agencyId,
			agentId: registered.agentId,
		});
		expect(agent.displayName).toBe("Handler Agent");
		expect(agent.organizationId).toBe(agencyId);

		const publishCommandId = "22222222-2222-4222-8222-222222222222";
		const published = await handlePublishAgentVersion(deps, {
			commandId: publishCommandId,
			agencyId,
			agentId: registered.agentId,
			principalId,
			body: {
				versionNumber: 1,
				expectedRevision: 1,
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest1",
				modelSlots: [],
				autonomyLevel: "L1",
			},
		});
		expect(published.agentVersionId).toMatch(/^[0-9a-f-]{36}$/i);

		const listed = await handleListAgentVersions(deps, {
			agencyId,
			agentId: registered.agentId,
		});
		expect(listed.versions).toHaveLength(1);
		expect(listed.versions[0]?.autonomyLevel).toBe("L1");
	});

	test("publish handler replays idempotently with stable agentRevision", async () => {
		const deps = createHandlerDeps();
		const registered = await handleRegisterAgent(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			agencyId,
			principalId,
			body: {
				displayName: "Replay Agent",
				kind: "AGENCY",
			},
		});
		const publishCommandId = "77777777-7777-4777-8777-777777777777";
		const first = await handlePublishAgentVersion(deps, {
			commandId: publishCommandId,
			agencyId,
			agentId: registered.agentId,
			principalId,
			body: {
				versionNumber: 1,
				expectedRevision: 1,
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest-replay",
				modelSlots: [],
				autonomyLevel: "L1",
			},
		});
		expect(first.agentRevision).toBe(2);
		const second = await handlePublishAgentVersion(deps, {
			commandId: publishCommandId,
			agencyId,
			agentId: registered.agentId,
			principalId,
			body: {
				versionNumber: 1,
				expectedRevision: 1,
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest-replay",
				modelSlots: [],
				autonomyLevel: "L1",
			},
		});
		expect(second.agentRevision).toBe(2);
		expect(second.idempotentReplay).toBe(true);
	});

	test("publish handler rejects L4 at runtime", async () => {
		const deps = createHandlerDeps();
		const registered = await handleRegisterAgent(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			agencyId,
			principalId,
			body: {
				displayName: "L4 Blocked",
				kind: "PLATFORM",
			},
		});
		await expect(
			handlePublishAgentVersion(deps, {
				commandId: "44444444-4444-4444-8444-444444444444",
				agencyId,
				agentId: registered.agentId,
				principalId,
				body: {
					versionNumber: 1,
					expectedRevision: 1,
					instructionRef,
					skillRefs: [],
					capabilityManifestHash: "sha256:manifest-l4",
					modelSlots: [],
					autonomyLevel: "L4",
				},
			}),
		).rejects.toBeInstanceOf(AgentsCommandError);
	});

	test("skill handlers register, version, evaluate and bind", async () => {
		const deps = createHandlerDeps();
		const registeredAgent = await handleRegisterAgent(deps, {
			commandId: "12121212-1212-4212-8212-121212121212",
			agencyId,
			principalId,
			body: {
				displayName: "Skill Host",
				kind: "AGENCY",
			},
		});
		const draftVersionId = crypto.randomUUID();
		const now = new Date();
		await deps.unitOfWork.runInTransaction(undefined, async (ctx) => {
			await ctx.agentVersionRepository.save({
				id: draftVersionId,
				agentId: registeredAgent.agentId,
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

		const skill = await handleRegisterSkill(deps, {
			commandId: "13131313-1313-4313-8313-131313131313",
			agencyId,
			principalId,
			body: {
				slug: "api-skill",
				displayName: "API Skill",
			},
		});
		const version = await handleCreateSkillVersion(deps, {
			commandId: "14141414-1414-4414-8414-141414141414",
			agencyId,
			skillId: skill.skillId,
			principalId,
			body: {
				schemaVersion: "1.0.0",
				contentRef,
				contentHash: "sha256:skill-hash",
			},
		});
		await handleSubmitSkillVersion(deps, {
			commandId: "15151515-1515-4515-8515-151515151515",
			agencyId,
			skillId: skill.skillId,
			skillVersionId: version.skillVersionId,
			principalId,
			body: { expectedRevision: version.revision },
		});
		await handleRecordSkillVersionEvaluation(deps, {
			commandId: "16161616-1616-4616-8616-161616161616",
			agencyId,
			skillId: skill.skillId,
			skillVersionId: version.skillVersionId,
			principalId,
			body: {
				expectedRevision: version.revision + 1,
				outcome: "verified",
				evaluationRef,
			},
		});

		const agentRow = await deps.agentRepository.findById(
			registeredAgent.agentId,
		);
		if (!agentRow) throw new Error("agent missing");

		const binding = await handleBindAgentSkill(deps, {
			commandId: "17171717-1717-4717-8717-171717171717",
			agencyId,
			agentId: registeredAgent.agentId,
			principalId,
			body: {
				agentVersionId: draftVersionId,
				skillVersionId: version.skillVersionId,
				expectedAgentRevision: agentRow.revision,
			},
		});
		expect(binding.bindingId).toMatch(/^[0-9a-f-]{36}$/i);
	});

	test("get agent returns not found for wrong agency scope", async () => {
		const deps = createHandlerDeps();
		const registered = await handleRegisterAgent(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			agencyId,
			principalId,
			body: {
				displayName: "Scoped Agent",
				kind: "AGENCY",
			},
		});
		await expect(
			handleGetAgent(deps, {
				agencyId: "99999999-9999-4999-8999-999999999999",
				agentId: registered.agentId,
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_AGENT_NOT_FOUND" });
	});
});
