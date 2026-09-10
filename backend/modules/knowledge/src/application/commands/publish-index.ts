import type {
	KnowledgeCommandResult,
	PublishIndexCommand,
} from "@anxionos/contracts/knowledge";
import {
	knowledgeCommandResultSchema,
	publishIndexCommandSchema,
} from "@anxionos/contracts/knowledge";
import { createDocumentIndexedEvent } from "../../domain/events/knowledge-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwKnowledgeError } from "../errors";

export interface PublishIndexDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function publishIndex(
	deps: PublishIndexDeps,
	input: PublishIndexCommand,
): Promise<KnowledgeCommandResult> {
	const command = publishIndexCommandSchema.parse(input);
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
		const document = await ctx.documents.findById(
			command.documentId,
			command.organizationId,
		);
		if (!document) {
			throwKnowledgeError(
				"KN_DOCUMENT_NOT_FOUND",
				`Document ${command.documentId} not found`,
			);
		}
		if (document.revision !== command.expectedRevision) {
			throwKnowledgeError("KN_REVISION_CONFLICT", "Document revision mismatch");
		}
		const index = await ctx.indexGenerations.findById(
			command.indexGenerationId,
			command.organizationId,
		);
		if (!index || index.documentId !== command.documentId) {
			throwKnowledgeError(
				"KN_INDEX_NOT_FOUND",
				`Index ${command.indexGenerationId} not found`,
			);
		}
		if (index.status !== "READY" || index.embeddedCount < index.chunkCount) {
			throwKnowledgeError(
				"KN_INDEX_NOT_READY",
				"Index generation is not ready for publish",
			);
		}
		const embeddedCount = await ctx.embeddings.countByIndexGeneration(index.id);
		if (embeddedCount < index.chunkCount) {
			throwKnowledgeError(
				"KN_INDEX_NOT_READY",
				"Embeddings incomplete — activeVersion unchanged",
			);
		}
		const updatedDocument = await ctx.documents.update({
			...document,
			activeVersionId: index.documentVersionId,
			status: "ACTIVE",
			revision: document.revision + 1,
		});
		await ctx.indexGenerations.update({
			...index,
			status: "ACTIVE",
		});
		const version = await ctx.documentVersions.findById(
			index.documentVersionId,
			command.organizationId,
		);
		if (!version) {
			throwKnowledgeError(
				"KN_DOCUMENT_NOT_FOUND",
				"Document version missing for publish",
			);
		}
		await ctx.publishEvents([
			createDocumentIndexedEvent({
				documentId: updatedDocument.id,
				documentVersionId: index.documentVersionId,
				indexGenerationId: index.id,
				organizationId: command.organizationId,
				contentHash: version.contentHash,
			}),
		]);
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: updatedDocument.id,
			revision: updatedDocument.revision,
			documentId: updatedDocument.id,
			documentVersionId: index.documentVersionId,
			indexGenerationId: index.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "publishIndex",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
