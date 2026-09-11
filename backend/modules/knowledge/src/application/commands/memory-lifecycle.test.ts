import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { KNOWLEDGE_EVENT_TYPES } from "@anxionos/contracts/knowledge";
import { createInMemoryMemoryStore } from "../../infrastructure/adapters/in-memory-memory-store";
import { createKnowledgeTestUow, TEST_ORG } from "./knowledge-test-support";
import { promoteCandidateMemory } from "./promote-candidate-memory";
import { registerCandidateMemory } from "./register-candidate-memory";

describe("memory lifecycle", () => {
	test("register dedupes by content hash and promote emits event", async () => {
		const memoryStore = createInMemoryMemoryStore();
		const { unitOfWork, commandJournal, getPublished } =
			createKnowledgeTestUow();
		const contentHash = "c".repeat(64);
		const registered = await registerCandidateMemory(
			{ commandJournal, memoryStore },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				summary: "User prefers conservative sizing",
				contentHash,
			},
		);
		const replay = await registerCandidateMemory(
			{ commandJournal, memoryStore },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				summary: "duplicate",
				contentHash,
			},
		);
		expect(replay.idempotentReplay).toBe(true);
		expect(replay.aggregateId).toBe(registered.aggregateId);

		await promoteCandidateMemory(
			{ unitOfWork, commandJournal, memoryStore },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				memoryEntryId: registered.aggregateId,
				promotedAt: "2026-09-10T12:00:00.000Z",
			},
		);

		const promoted = await memoryStore.findById(
			registered.aggregateId,
			TEST_ORG,
		);
		expect(promoted?.tier).toBe("PROMOTED");
		expect(getPublished()[0]?.eventType).toBe(
			KNOWLEDGE_EVENT_TYPES.MEMORY_PROMOTED,
		);
	});
});
