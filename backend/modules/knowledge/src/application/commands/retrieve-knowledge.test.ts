import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createSimulatedEmbeddingPort } from "../../infrastructure/adapters/simulated-embedding-adapter";
import {
	createKnowledgeTestUow,
	TEST_ACL_ID,
	TEST_ORG,
} from "./knowledge-test-support";
import { retrieveKnowledge } from "./retrieve-knowledge";

const SPACE_ID = `kn_espc_${randomUUID()}`;
const DOC_ALLOWED = `kn_doc_${randomUUID()}`;
const DOC_REVOKED = `kn_doc_${randomUUID()}`;
const VERSION_ALLOWED = `kn_dver_${randomUUID()}`;
const VERSION_REVOKED = `kn_dver_${randomUUID()}`;
const CHUNK_ALLOWED = `kn_chk_${randomUUID()}`;
const CHUNK_REVOKED = `kn_chk_${randomUUID()}`;

describe("retrieveKnowledge", () => {
	test("returns only ACL-visible chunks and drops revoked embeddings", async () => {
		const embeddingPort = createSimulatedEmbeddingPort();
		const { unitOfWork } = createKnowledgeTestUow({
			embeddingSpaces: [
				{
					id: SPACE_ID,
					organizationId: TEST_ORG,
					displayName: "sim",
					dimensions: 8,
					modelRef: "simulated/text-embedding",
				},
			],
			documents: [
				{
					id: DOC_ALLOWED,
					organizationId: TEST_ORG,
					knowledgeSourceId: `kn_src_${randomUUID()}`,
					title: "Allowed",
					classification: "INTERNAL",
					aclId: TEST_ACL_ID,
					aclEpoch: 1,
					activeVersionId: VERSION_ALLOWED,
					status: "ACTIVE",
					revision: 2,
				},
				{
					id: DOC_REVOKED,
					organizationId: TEST_ORG,
					knowledgeSourceId: `kn_src_${randomUUID()}`,
					title: "Revoked",
					classification: "INTERNAL",
					aclId: TEST_ACL_ID,
					aclEpoch: 99,
					activeVersionId: VERSION_REVOKED,
					status: "ACTIVE",
					revision: 2,
				},
			],
			chunks: [
				{
					id: CHUNK_ALLOWED,
					organizationId: TEST_ORG,
					documentVersionId: VERSION_ALLOWED,
					indexGenerationId: `kn_idx_${randomUUID()}`,
					sequence: 0,
					contentHash: "d".repeat(64),
					textContent: "allowed institutional policy text",
					tokenCount: 5,
				},
				{
					id: CHUNK_REVOKED,
					organizationId: TEST_ORG,
					documentVersionId: VERSION_REVOKED,
					indexGenerationId: `kn_idx_${randomUUID()}`,
					sequence: 0,
					contentHash: "e".repeat(64),
					textContent: "revoked secret document",
					tokenCount: 4,
				},
			],
		});

		const allowedEmbeddings = await embeddingPort.embedBatch([
			{
				chunkId: CHUNK_ALLOWED,
				text: "allowed institutional policy text",
				dimensions: 8,
			},
			{
				chunkId: CHUNK_REVOKED,
				text: "revoked secret document",
				dimensions: 8,
			},
		]);
		for (const embedding of allowedEmbeddings) {
			await unitOfWork.runInTransaction(async (ctx) => {
				await ctx.embeddings.save({
					id: `kn_emb_${randomUUID()}`,
					organizationId: TEST_ORG,
					chunkId: embedding.chunkId,
					embeddingSpaceId: SPACE_ID,
					dimensions: embedding.dimensions,
					vector: embedding.vector,
				});
			});
		}

		const manifest = await retrieveKnowledge(
			{ unitOfWork, embeddingPort },
			{
				organizationId: TEST_ORG,
				queryText: "institutional policy",
				aclRef: { aclId: TEST_ACL_ID, epoch: 2 },
				embeddingSpaceId: SPACE_ID,
				limit: 5,
			},
		);

		expect(manifest.hits.length).toBe(1);
		expect(manifest.hits[0]?.documentId).toBe(DOC_ALLOWED);
		expect(manifest.hits.some((hit) => hit.documentId === DOC_REVOKED)).toBe(
			false,
		);
	});
});
