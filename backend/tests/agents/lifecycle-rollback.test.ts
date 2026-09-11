import { describe, expect, test } from "bun:test";
import {
	publishAgentVersion,
	registerAgent,
	rollbackAgentVersion,
	transitionAgentStatus,
} from "@anxionos/agents";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
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

function createDeps() {
	const agentRepository = createInMemoryAgentRepository();
	const agentVersionRepository = createInMemoryAgentVersionRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			agentRepository,
			agentVersionRepository,
		},
		published,
		agentRepository,
	};
}

describe("transitionAgentStatus", () => {
	test("transitions to CONFIGURED after publish and emits status event", async () => {
		const { deps, published, agentRepository } = createDeps();
		const registered = await registerAgent(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			displayName: "Lifecycle Agent",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		await publishAgentVersion(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			agentId: registered.aggregateId,
			versionNumber: 1,
			expectedRevision: 1,
			instructionRef,
			skillRefs: [],
			capabilityManifestHash: "sha256:manifest1",
			modelSlots: [],
			autonomyLevel: "L1",
		});
		const agentAfterPublish = await agentRepository.findById(
			registered.aggregateId,
		);
		await transitionAgentStatus(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			agentId: registered.aggregateId,
			expectedRevision: agentAfterPublish!.revision,
			targetStatus: "CONFIGURED",
		});
		const agent = await agentRepository.findById(registered.aggregateId);
		expect(agent?.status).toBe("CONFIGURED");
		expect(
			published.some(
				(event) => event.eventType === AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED,
			),
		).toBe(true);
	});
});

describe("rollbackAgentVersion", () => {
	test("rolls active version back to prior published version", async () => {
		const { deps, published, agentRepository } = createDeps();
		const registered = await registerAgent(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			displayName: "Rollback Agent",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		await publishAgentVersion(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			agentId: registered.aggregateId,
			versionNumber: 1,
			expectedRevision: 1,
			instructionRef,
			skillRefs: [],
			capabilityManifestHash: "sha256:v1",
			modelSlots: [],
			autonomyLevel: "L0",
		});
		const afterV1 = await agentRepository.findById(registered.aggregateId);
		const v1Id = afterV1!.activeVersionId;
		await publishAgentVersion(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			agentId: registered.aggregateId,
			versionNumber: 2,
			expectedRevision: afterV1!.revision,
			instructionRef,
			skillRefs: [],
			capabilityManifestHash: "sha256:v2",
			modelSlots: [],
			autonomyLevel: "L1",
		});
		const afterV2 = await agentRepository.findById(registered.aggregateId);
		await rollbackAgentVersion(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			agentId: registered.aggregateId,
			expectedRevision: afterV2!.revision,
			targetVersionNumber: 1,
		});
		const rolledBack = await agentRepository.findById(registered.aggregateId);
		expect(rolledBack?.activeVersionId).toBe(v1Id);
		expect(
			published.some(
				(event) =>
					event.eventType === AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK,
			),
		).toBe(true);
	});
});
