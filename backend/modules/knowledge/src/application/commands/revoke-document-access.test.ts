import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { KNOWLEDGE_EVENT_TYPES } from "@anxionos/contracts/knowledge";
import { revokeDocumentAccess } from "./revoke-document-access";
import {
	createKnowledgeTestUow,
	TEST_ACL_ID,
	TEST_ORG,
} from "./knowledge-test-support";

const DOCUMENT_ID = `kn_doc_${randomUUID()}`;
const VERSION_ID = `kn_dver_${randomUUID()}`;
const CHUNK_ID = `kn_chk_${randomUUID()}`;
const SPACE_ID = `kn_espc_${randomUUID()}`;

describe("revokeDocumentAccess", () => {
	test("revokes access and purges embeddings", async () => {
		const { unitOfWork, commandJournal, getDocuments, getEmbeddings, getPublished } =
			createKnowledgeTestUow({
				documents: [
					{
						id: DOCUMENT_ID,
						organizationId: TEST_ORG,
						knowledgeSourceId: `kn_src_${randomUUID()}`,
						title: "Policy",
						classification: "INTERNAL",
						aclId: TEST_ACL_ID,
						aclEpoch: 1,
						activeVersionId: VERSION_ID,
						status: "ACTIVE",
						revision: 2,
					},
				],
				chunks: [
					{
						id: CHUNK_ID,
						organizationId: TEST_ORG,
						documentVersionId: VERSION_ID,
						indexGenerationId: `kn_idx_${randomUUID()}`,
						sequence: 0,
						contentHash: "b".repeat(64),
						textContent: "capital limits policy",
						tokenCount: 4,
					},
				],
				embeddings: [
					{
						chunkId: CHUNK_ID,
						organizationId: TEST_ORG,
						embeddingSpaceId: SPACE_ID,
						dimensions: 3,
						vector: [1, 0, 0],
					},
				],
			});

		await revokeDocumentAccess(
			{ unitOfWork, commandJournal },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				documentId: DOCUMENT_ID,
				revokedAt: "2026-09-10T12:00:00.000Z",
			},
		);

		const document = getDocuments().get(DOCUMENT_ID);
		expect(document?.status).toBe("ARCHIVED");
		expect(document?.aclEpoch).toBe(2);
		expect(getEmbeddings().has(CHUNK_ID)).toBe(false);
		expect(getPublished()[0]?.eventType).toBe(
			KNOWLEDGE_EVENT_TYPES.DOCUMENT_ACCESS_REVOKED,
		);
	});
});
