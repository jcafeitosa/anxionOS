import { describe, expect, test } from "bun:test";
import { AgentsCommandError, publishAgentVersion, registerAgent } from "@anxionos/agents";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

function createDeps() {
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
		},
	};
}

describe("publishAgentVersion autonomy runtime policy", () => {
	test("rejects L3 with AGT_AUTONOMY_LEVEL_DISABLED", async () => {
		const { deps } = createDeps();
		const registered = await registerAgent(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			displayName: "L3 Blocked",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		await expect(
			publishAgentVersion(
				{ ...deps, agentRepository: deps.agentRepository },
				{
					commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
					agentId: registered.aggregateId,
					versionNumber: 1,
					expectedRevision: 1,
					instructionRef,
					skillRefs: [],
					capabilityManifestHash: "sha256:manifest-l3",
					modelSlots: [],
					autonomyLevel: "L3",
				},
			),
		).rejects.toBeInstanceOf(AgentsCommandError);
		await expect(
			publishAgentVersion(
				{ ...deps, agentRepository: deps.agentRepository },
				{
					commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
					agentId: registered.aggregateId,
					versionNumber: 1,
					expectedRevision: 1,
					instructionRef,
					skillRefs: [],
					capabilityManifestHash: "sha256:manifest-l4",
					modelSlots: [],
					autonomyLevel: "L4",
				},
			),
		).rejects.toMatchObject({ agentsCode: "AGT_AUTONOMY_LEVEL_DISABLED" });
	});
});
