import { describe, expect, test } from "bun:test";
import { AgentsCommandError } from "@anxionos/agents";
import {
	handleGetAgent,
	handleListAgentVersions,
	handlePublishAgentVersion,
	handleRegisterAgent,
} from "../../apps/api/src/agents/handlers/agents";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "33333333-3333-4333-8333-333333333333";

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

function createHandlerDeps() {
	const agentRepository = createInMemoryAgentRepository();
	const agentVersionRepository = createInMemoryAgentVersionRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository,
		commandJournal,
	});
	return {
		agentRepository,
		agentVersionRepository,
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
