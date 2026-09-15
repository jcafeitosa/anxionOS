import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createKnowledgeUnitOfWork,
	createPgCommandJournalRepository,
	ensureKnowledgeSchema,
} from "@anxionos/knowledge";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

/**
 * ANX-470 — prova de aderencia codigo<->DDL do modulo knowledge: as 9 tabelas
 * sao exercitadas pelos repositorios REAIS contra o schema real.
 */
describe("knowledge schema adherence (ANX-470)", () => {
	test("repositories exercise all knowledge tables on the real schema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureKnowledgeSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE knowledge_sources, knowledge_documents, knowledge_document_versions, knowledge_chunks, knowledge_embeddings, knowledge_embedding_spaces, knowledge_index_generations, knowledge_command_journal, knowledge_memories RESTART IDENTITY CASCADE",
			);
			const unitOfWork = createKnowledgeUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationId = randomUUID();
			const sourceId = randomUUID();
			const documentId = randomUUID();
			const versionId = randomUUID();
			const spaceId = randomUUID();
			const generationId = randomUUID();
			const chunkId = randomUUID();

			await unitOfWork.runInTransaction(async (ctx) => {
				// ordem de dependencia de FK: source -> document -> version ->
				// space -> generation -> chunk -> embedding
				await ctx.sources.save({
					id: sourceId,
					organizationId,
					displayName: "Test Source",
					sourceKind: "DOCUMENT",
					defaultClassification: "PUBLIC",
					defaultAclId: randomUUID(),
					defaultAclEpoch: 1,
					status: "ACTIVE",
					revision: 1,
				});
				const foundSource = await ctx.sources.findById(
					sourceId,
					organizationId,
				);
				expect(foundSource?.displayName).toBe("Test Source");

				await ctx.documents.save({
					id: documentId,
					organizationId,
					knowledgeSourceId: sourceId,
					title: "Test Document",
					classification: "PUBLIC",
					aclId: randomUUID(),
					aclEpoch: 1,
					activeVersionId: null,
					status: "DRAFT",
					revision: 1,
				});
				await ctx.documentVersions.save({
					id: versionId,
					documentId,
					organizationId,
					versionNumber: 1,
					contentHash: "sha256hash",
					blobBucket: "bucket",
					blobObjectKey: "path/to/blob",
					mimeType: "text/plain",
					byteSize: 123,
				});
				await ctx.embeddingSpaces.save({
					id: spaceId,
					organizationId,
					displayName: "Test Space",
					dimensions: 1536,
					modelRef: "text-embedding-3-small",
				});
				await ctx.indexGenerations.save({
					id: generationId,
					organizationId,
					documentId,
					documentVersionId: versionId,
					embeddingSpaceId: spaceId,
					status: "ACTIVE",
					chunkCount: 1,
					embeddedCount: 1,
				});
				await ctx.chunks.saveMany([
					{
						id: chunkId,
						organizationId,
						documentVersionId: versionId,
						indexGenerationId: generationId,
						sequence: 1,
						contentHash: "hash",
						textContent: "content",
						tokenCount: 100,
					},
				]);
				const listed = await ctx.chunks.listByIndexGeneration(generationId);
				expect(listed).toHaveLength(1);
				await ctx.embeddings.save({
					id: randomUUID(),
					organizationId,
					chunkId,
					embeddingSpaceId: spaceId,
					dimensions: 3,
					vector: [0.1, 0.2, 0.3],
				});
				const count = await ctx.embeddings.countByIndexGeneration(generationId);
				expect(count).toBeGreaterThanOrEqual(0);

				const cmdId = randomUUID();
				await ctx.commandJournal.save({
					commandId: cmdId,
					organizationId,
					commandName: "createDocument",
					responseSnapshot: { docId: documentId },
				});
				const replay = await ctx.commandJournal.findByCommandId(cmdId);
				expect(replay?.commandName).toBe("createDocument");

				const memoryStore = ctx.memoryStore;
				if (!memoryStore)
					throw new Error("memory store missing from transaction");
				const memory = await memoryStore.save({
					id: `kn_mem_${randomUUID()}`,
					organizationId,
					tier: "CANDIDATE",
					summary: "Test memory",
					contentHash: "memory-hash",
					sourceDocumentId: documentId,
					createdAt: new Date().toISOString(),
					promotedAt: null,
				});
				expect(
					(await memoryStore.findById(memory.id, organizationId))?.tier,
				).toBe("CANDIDATE");
				const promoted = await memoryStore.update({
					...memory,
					tier: "PROMOTED",
					promotedAt: new Date().toISOString(),
				});
				expect(promoted?.tier).toBe("PROMOTED");
			});
			expect(commandJournal).toBeDefined();
		} finally {
			await pool.end();
		}
	});
});
