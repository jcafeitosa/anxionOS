import { describe, expect, test } from "bun:test";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
import { publishAgentVersion, registerAgent } from "@anxionos/agents";
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
		},
		agentRepository,
		agentVersionRepository,
		published,
	};
}

describe("registerAgent", () => {
	test("creates agent in DRAFT and emits registered event", async () => {
		const { deps, published } = createDeps();
		const commandId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const result = await registerAgent(deps, {
			commandId,
			displayName: "Research Analyst",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		expect(result.aggregateId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(result.revision).toBe(1);
		expect(published[0]?.eventType).toBe(AGENTS_EVENT_TYPES.AGENT_REGISTERED);
		expect(published[0]?.payload).toMatchObject({
			status: "DRAFT",
			kind: "AGENCY",
			displayName: "Research Analyst",
		});
	});

	test("replays idempotently for the same commandId", async () => {
		const { deps } = createDeps();
		const commandId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		const first = await registerAgent(deps, {
			commandId,
			displayName: "Ops Worker",
			kind: "PLATFORM",
			organizationId,
		});
		const second = await registerAgent(deps, {
			commandId,
			displayName: "Ops Worker",
			kind: "PLATFORM",
			organizationId,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});
});

describe("publishAgentVersion", () => {
	test("creates published version and bumps agent revision", async () => {
		const { deps, agentRepository, agentVersionRepository, published } = createDeps();
		const registered = await registerAgent(deps, {
			commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
			displayName: "Risk Monitor",
			kind: "AGENCY",
			agencyId,
			organizationId,
		});
		const publishCommandId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
		const publishedResult = await publishAgentVersion(deps, {
			commandId: publishCommandId,
			agentId: registered.aggregateId,
			versionNumber: 1,
			expectedRevision: 1,
			instructionRef,
			skillRefs: [],
			capabilityManifestHash: "sha256:manifest1",
			modelSlots: [],
			autonomyLevel: "L1",
		});
		expect(publishedResult.revision).toBe(2);
		const agent = await agentRepository.findById(registered.aggregateId);
		expect(agent?.activeVersionId).toBe(publishedResult.aggregateId);
		expect(agent?.revision).toBe(2);
		const version = await agentVersionRepository.findById(publishedResult.aggregateId);
		expect(version?.status).toBe("published");
		expect(version?.publishedAt).toBeInstanceOf(Date);
		const publishEvent = published.find(
			(event) => event.eventType === AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED,
		);
		expect(publishEvent?.payload).toMatchObject({
			versionNumber: 1,
			capabilityManifestHash: "sha256:manifest1",
			autonomyLevel: "L1",
		});
	});

	test("replays publish idempotently for the same commandId", async () => {
		const { deps } = createDeps();
		const registered = await registerAgent(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			displayName: "Duplicate Publish",
			kind: "PLATFORM",
			organizationId,
		});
		const publishCommandId = "22222222-2222-4222-8222-222222222222";
		const input = {
			commandId: publishCommandId,
			agentId: registered.aggregateId,
			versionNumber: 1,
			expectedRevision: 1,
			instructionRef,
			skillRefs: [],
			capabilityManifestHash: "sha256:manifest2",
			modelSlots: [],
			autonomyLevel: "L0" as const,
		};
		const first = await publishAgentVersion(deps, input);
		const second = await publishAgentVersion(deps, input);
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});
});
