import { describe, expect, test } from "bun:test";
import { AgentsCommandError, publishAgentVersion, registerAgent } from "@anxionos/agents";
import type { AgentPublishGuardPort } from "@anxionos/agents";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyId = organizationId;

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

function createDeps(publishGuard?: AgentPublishGuardPort) {
	const agentRepository = createInMemoryAgentRepository();
	const agentVersionRepository = createInMemoryAgentVersionRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			agentRepository,
			publishGuard,
		},
	};
}

describe("publishAgentVersion publish guard (G3-AGT-03)", () => {
	test("denies publish when guard rejects traversal", async () => {
		const { deps } = createDeps({
			async assertPublishAllowed() {
				throw new AgentsCommandError("AGT_TRAVERSAL_DENIED", "No grant for agents.publish");
			},
		});
		const registered = await registerAgent(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			displayName: "Guarded Agent",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		await expect(
			publishAgentVersion(deps, {
				commandId: "22222222-2222-4222-8222-222222222222",
				agentId: registered.aggregateId,
				versionNumber: 1,
				expectedRevision: 1,
				instructionRef,
				skillRefs: [],
				capabilityManifestHash: "sha256:manifest1",
				modelSlots: [],
				autonomyLevel: "L1",
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_TRAVERSAL_DENIED" });
	});
});
