import type {
	KnowledgeCommandResult,
	RevokeDocumentAccessCommand,
} from "@anxionos/contracts/knowledge";
import {
	knowledgeCommandResultSchema,
	revokeDocumentAccessCommandSchema,
} from "@anxionos/contracts/knowledge";
import { createDocumentAccessRevokedEvent } from "../../domain/events/knowledge-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwKnowledgeError } from "../errors";

export interface RevokeDocumentAccessDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function revokeDocumentAccess(
	deps: RevokeDocumentAccessDeps,
	input: RevokeDocumentAccessCommand,
): Promise<KnowledgeCommandResult> {
	const command = revokeDocumentAccessCommandSchema.parse(input);
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
		if (document.status === "ARCHIVED") {
			const result = knowledgeCommandResultSchema.parse({
				aggregateId: document.id,
				revision: document.revision,
				documentId: document.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "revokeDocumentAccess",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const nextEpoch = document.aclEpoch + 1;
		const updated = await ctx.documents.update({
			...document,
			status: "ARCHIVED",
			aclEpoch: nextEpoch,
			revision: document.revision + 1,
		});
		if (document.activeVersionId) {
			const chunks = await ctx.chunks.listByDocumentVersion(
				document.activeVersionId,
			);
			await ctx.embeddings.purgeByChunkIds(chunks.map((chunk) => chunk.id));
		}
		await ctx.publishEvents([
			createDocumentAccessRevokedEvent({
				documentId: updated.id,
				organizationId: updated.organizationId,
				revokedAt: command.revokedAt,
				aclEpoch: nextEpoch,
			}),
		]);
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			documentId: updated.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "revokeDocumentAccess",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
