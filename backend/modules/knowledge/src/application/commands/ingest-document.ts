import { randomUUID } from "node:crypto";
import type {
	IngestDocumentCommand,
	KnowledgeCommandResult,
} from "@anxionos/contracts/knowledge";
import {
	ingestDocumentCommandSchema,
	knowledgeCommandResultSchema,
} from "@anxionos/contracts/knowledge";
import { createChunkEmbeddedEvent } from "../../domain/events/knowledge-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { EmbeddingPort } from "../../domain/ports/embedding-port";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { SIMULATED_EMBEDDING_DIMENSIONS } from "../constants";
import { parseCommandResultSnapshot, throwKnowledgeError } from "../errors";
import { hashText, splitIntoChunks } from "../text-chunking";

export interface IngestDocumentDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
	embeddingPort: EmbeddingPort;
}

export async function ingestDocument(
	deps: IngestDocumentDeps,
	input: IngestDocumentCommand,
): Promise<KnowledgeCommandResult> {
	const command = ingestDocumentCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return knowledgeCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const source = await ctx.sources.findById(
			command.knowledgeSourceId,
			command.organizationId,
		);
		if (!source || source.status !== "ACTIVE") {
			throwKnowledgeError(
				"KN_SOURCE_NOT_FOUND",
				`Knowledge source ${command.knowledgeSourceId} not found or inactive`,
			);
		}
		let space = await ctx.embeddingSpaces.findById(
			command.embeddingSpaceId,
			command.organizationId,
		);
		if (!space) {
			space = await ctx.embeddingSpaces.save({
				id: command.embeddingSpaceId,
				organizationId: command.organizationId,
				displayName: "simulated-default",
				dimensions: SIMULATED_EMBEDDING_DIMENSIONS,
				modelRef: "simulated/text-embedding",
			});
		}
		const documentId = `kn_doc_${randomUUID()}`;
		const versionId = `kn_dver_${randomUUID()}`;
		const indexId = `kn_idx_${randomUUID()}`;
		await ctx.documents.save({
			id: documentId,
			organizationId: command.organizationId,
			knowledgeSourceId: command.knowledgeSourceId,
			title: command.title,
			classification: command.classification,
			aclId: command.aclRef.aclId,
			aclEpoch: command.aclRef.epoch,
			activeVersionId: null,
			status: "DRAFT",
			revision: 1,
		});
		await ctx.documentVersions.save({
			id: versionId,
			documentId,
			organizationId: command.organizationId,
			versionNumber: 1,
			contentHash: command.blobRef.contentHash,
			blobBucket: command.blobRef.bucket,
			blobObjectKey: command.blobRef.objectKey,
			mimeType: command.mimeType,
			byteSize: command.byteSize,
		});
		const textChunks = splitIntoChunks(command.plainText);
		const chunkRecords = textChunks.map((text, sequence) => ({
			id: `kn_chk_${randomUUID()}`,
			organizationId: command.organizationId,
			documentVersionId: versionId,
			indexGenerationId: indexId,
			sequence,
			contentHash: hashText(text),
			tokenCount: Math.max(1, Math.ceil(text.length / 4)),
		}));
		await ctx.indexGenerations.save({
			id: indexId,
			organizationId: command.organizationId,
			documentId,
			documentVersionId: versionId,
			embeddingSpaceId: command.embeddingSpaceId,
			status: "READY",
			chunkCount: chunkRecords.length,
			embeddedCount: 0,
		});
		await ctx.chunks.saveMany(chunkRecords);
		const embeddings = await deps.embeddingPort.embedBatch(
			chunkRecords.map((chunk, idx) => ({
				chunkId: chunk.id,
				text: textChunks[idx],
				dimensions: space.dimensions,
			})),
		);
		const events = [];
		for (const embedding of embeddings) {
			await ctx.embeddings.save({
				id: `kn_emb_${randomUUID()}`,
				organizationId: command.organizationId,
				chunkId: embedding.chunkId,
				embeddingSpaceId: command.embeddingSpaceId,
				dimensions: embedding.dimensions,
				vector: embedding.vector,
			});
			events.push(
				createChunkEmbeddedEvent({
					chunkId: embedding.chunkId,
					documentVersionId: versionId,
					embeddingSpaceId: command.embeddingSpaceId,
					dimensions: embedding.dimensions,
				}),
			);
		}
		await ctx.indexGenerations.update({
			id: indexId,
			organizationId: command.organizationId,
			documentId,
			documentVersionId: versionId,
			embeddingSpaceId: command.embeddingSpaceId,
			status: "READY",
			chunkCount: chunkRecords.length,
			embeddedCount: chunkRecords.length,
		});
		if (events.length > 0) {
			await ctx.publishEvents(events);
		}
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: documentId,
			revision: 1,
			documentId,
			documentVersionId: versionId,
			indexGenerationId: indexId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "ingestDocument",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
