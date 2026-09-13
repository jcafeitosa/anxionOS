import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { KNOWLEDGE_EVENT_TYPES } from "@anxionos/contracts/knowledge";
import type {
	KnowledgeTransactionContext,
	KnowledgeUnitOfWork,
} from "../../domain/ports/knowledge-unit-of-work";
import type { MemoryStorePort } from "../../domain/ports/memory-store";
import { createInMemoryMemoryStore } from "./fixtures/in-memory-memory-store";
import {
	createKnowledgeTestUow,
	TEST_ORG,
} from "./fixtures/knowledge-test-support";
import { promoteCandidateMemory } from "./promote-candidate-memory";
import { registerCandidateMemory } from "./register-candidate-memory";

describe("memory lifecycle", () => {
	test("register dedupes by content hash and promote emits event", async () => {
		const memoryStore = createInMemoryMemoryStore();
		const { unitOfWork, commandJournal, getPublished } =
			createKnowledgeTestUow();
		const contentHash = "c".repeat(64);
		const registered = await registerCandidateMemory(
			{ commandJournal, memoryStore, unitOfWork },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				summary: "User prefers conservative sizing",
				contentHash,
			},
		);
		const replay = await registerCandidateMemory(
			{ commandJournal, memoryStore, unitOfWork },
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

	test("register marks a natural-key race as an idempotent replay", async () => {
		const { commandJournal, unitOfWork } = createKnowledgeTestUow();
		const existing = {
			id: "kn_mem_existing",
			organizationId: TEST_ORG,
			tier: "CANDIDATE" as const,
			summary: "Existing",
			contentHash: "r".repeat(64),
			sourceDocumentId: null,
			createdAt: new Date().toISOString(),
			promotedAt: null,
		};
		const baseStore = createInMemoryMemoryStore();
		const memoryStore: MemoryStorePort = {
			...baseStore,
			async findByContentHash() {
				return null;
			},
			async save() {
				return existing;
			},
		};

		const result = await registerCandidateMemory(
			{ commandJournal, memoryStore, unitOfWork },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				summary: "Raced",
				contentHash: existing.contentHash,
			},
		);

		expect(result.aggregateId).toBe(existing.id);
		expect(result.idempotentReplay).toBe(true);
	});

	test("register persists memory and its journal through the unit of work", async () => {
		const memoryStore = createInMemoryMemoryStore();
		const base = createKnowledgeTestUow();
		let transactions = 0;
		const unitOfWork: KnowledgeUnitOfWork = {
			async runInTransaction<T>(
				work: (ctx: KnowledgeTransactionContext) => Promise<T>,
			): Promise<T> {
				transactions += 1;
				return base.unitOfWork.runInTransaction(work);
			},
		};

		await registerCandidateMemory(
			{
				commandJournal: base.commandJournal,
				memoryStore,
				unitOfWork,
			},
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				summary: "Transactional memory",
				contentHash: "t".repeat(64),
			},
		);

		expect(transactions).toBe(1);
	});
});
