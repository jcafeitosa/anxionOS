import { describe, expect, test } from "bun:test";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
import {
	AgentsCommandError,
	invokeBrainCapability,
	publishAgentVersion,
	registerAgent,
} from "@anxionos/agents";
import type { BrainInvocationGuardPort } from "@anxionos/agents";
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

async function seedPublishedAgent(
	deps: ReturnType<typeof createDeps>["deps"],
) {
	const registered = await registerAgent(deps, {
		commandId: "11111111-1111-4111-8111-111111111111",
		displayName: "Brain Agent",
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
	return registered.aggregateId;
}

function createDeps(invocationGuard?: BrainInvocationGuardPort) {
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
			invocationGuard,
		},
		published,
	};
}

describe("invokeBrainCapability (S5)", () => {
	test("emits brain invocation requested event when guard allows", async () => {
		const { deps, published } = createDeps({
			async assertInvokeAllowed() {
				return;
			},
		});
		const agentId = await seedPublishedAgent(deps);
		const result = await invokeBrainCapability(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			agentId,
			capabilityId: "strategy.research",
			correlationId: "run-abc",
		});
		expect(result.invocationId).toMatch(/^[0-9a-f-]{36}$/i);
		const event = published.find(
			(entry) => entry.eventType === AGENTS_EVENT_TYPES.BRAIN_INVOCATION_REQUESTED,
		);
		expect(event?.payload).toMatchObject({
			agentId,
			capabilityId: "strategy.research",
			correlationId: "run-abc",
		});
	});

	test("replays invoke idempotently with resolved agentVersionId", async () => {
		const { deps } = createDeps();
		const agentId = await seedPublishedAgent(deps);
		const commandId = "55555555-5555-4555-8555-555555555555";
		const first = await invokeBrainCapability(deps, {
			commandId,
			agentId,
			capabilityId: "strategy.research",
			correlationId: "run-replay",
		});
		expect(first.agentVersionId).toMatch(/^[0-9a-f-]{36}$/i);
		const second = await invokeBrainCapability(deps, {
			commandId,
			agentId,
			capabilityId: "strategy.research",
			correlationId: "run-replay",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("denies invoke when guard rejects", async () => {
		const { deps } = createDeps({
			async assertInvokeAllowed() {
				throw new AgentsCommandError("AGT_TRAVERSAL_DENIED", "Capability denied");
			},
		});
		const agentId = await seedPublishedAgent(deps);
		await expect(
			invokeBrainCapability(deps, {
				commandId: "44444444-4444-4444-8444-444444444444",
				agentId,
				capabilityId: "strategy.research",
				correlationId: "run-deny",
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_TRAVERSAL_DENIED" });
	});
});
