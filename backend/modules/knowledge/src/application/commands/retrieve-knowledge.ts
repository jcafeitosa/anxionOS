import type {
	ContextManifest,
	RetrievalHit,
	RetrieveKnowledgeQuery,
} from "@anxionos/contracts/knowledge";
import { retrieveKnowledgeQuerySchema } from "@anxionos/contracts/knowledge";
import type { EmbeddingPort } from "../../domain/ports/embedding-port";
import type {
	ChunkRecord,
	DocumentRecord,
	KnowledgeUnitOfWork,
} from "../../domain/ports/knowledge-unit-of-work";
import { buildContextManifest } from "../context-manifest";
import { throwKnowledgeError } from "../errors";
import { sanitizeRetrievalQuery } from "../query-sanitizer";
import { cosineSimilarity } from "../retrieval-ranking";

export interface RetrieveKnowledgeDeps {
	unitOfWork: KnowledgeUnitOfWork;
	embeddingPort: EmbeddingPort;
}

function isAclAllowed(
	document: DocumentRecord,
	requestedAclId: string,
	requestedEpoch: number,
): boolean {
	return (
		document.aclId === requestedAclId && document.aclEpoch <= requestedEpoch
	);
}

export async function retrieveKnowledge(
	deps: RetrieveKnowledgeDeps,
	input: RetrieveKnowledgeQuery,
): Promise<ContextManifest> {
	const query = retrieveKnowledgeQuerySchema.parse(input);
	const sanitized = sanitizeRetrievalQuery(query.queryText);
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const space = await ctx.embeddingSpaces.findById(
			query.embeddingSpaceId,
			query.organizationId,
		);
		if (!space) {
			throwKnowledgeError(
				"KN_INDEX_NOT_FOUND",
				`Embedding space ${query.embeddingSpaceId} not found`,
			);
		}
		const [queryEmbedding] = await deps.embeddingPort.embedBatch([
			{
				chunkId: "query",
				text: sanitized,
				dimensions: space.dimensions,
			},
		]);
		const documents = (
			await ctx.documents.listActiveByOrganization(query.organizationId)
		).filter((document) =>
			isAclAllowed(document, query.aclRef.aclId, query.aclRef.epoch),
		);
		const chunkById = new Map<string, ChunkRecord>();
		const documentByVersion = new Map<string, DocumentRecord>();
		for (const document of documents) {
			if (!document.activeVersionId) continue;
			documentByVersion.set(document.activeVersionId, document);
			const chunks = await ctx.chunks.listByDocumentVersion(
				document.activeVersionId,
			);
			for (const chunk of chunks) {
				chunkById.set(chunk.id, chunk);
			}
		}
		const embeddings = await ctx.embeddings.listByOrganization(
			query.organizationId,
		);
		const ranked: RetrievalHit[] = [];
		for (const embedding of embeddings) {
			if (embedding.embeddingSpaceId !== query.embeddingSpaceId) continue;
			const chunk = chunkById.get(embedding.chunkId);
			if (!chunk) continue;
			const document = documentByVersion.get(chunk.documentVersionId);
			if (!document) continue;
			const rawScore = cosineSimilarity(
				queryEmbedding.vector,
				embedding.vector,
			);
			const score = Number.isFinite(rawScore)
				? Math.max(0, Math.min(1, rawScore))
				: 0;
			ranked.push({
				chunkId: chunk.id,
				documentId: document.id,
				documentVersionId: chunk.documentVersionId,
				contentHash: chunk.contentHash,
				textPreview: chunk.textContent.slice(0, 256),
				score,
				provenance: {
					sourceTitle: document.title,
					classification:
						document.classification as RetrievalHit["provenance"]["classification"],
					aclId: document.aclId,
					aclEpoch: document.aclEpoch,
				},
			});
		}
		ranked.sort((left, right) => right.score - left.score);
		return buildContextManifest({
			organizationId: query.organizationId,
			queryText: sanitized,
			hits: ranked.slice(0, query.limit),
		});
	});
}
