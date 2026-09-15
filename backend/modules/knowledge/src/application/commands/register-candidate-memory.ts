import { randomUUID } from "node:crypto";
import type {
	KnowledgeCommandResult,
	RegisterCandidateMemoryCommand,
} from "@anxionos/contracts/knowledge";
import {
	knowledgeCommandResultSchema,
	registerCandidateMemoryCommandSchema,
} from "@anxionos/contracts/knowledge";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import type { MemoryStorePort } from "../../domain/ports/memory-store";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterCandidateMemoryDeps {
	commandJournal: CommandJournalRepository;
	memoryStore: MemoryStorePort;
	unitOfWork: KnowledgeUnitOfWork;
}

export async function registerCandidateMemory(
	deps: RegisterCandidateMemoryDeps,
	input: RegisterCandidateMemoryCommand,
): Promise<KnowledgeCommandResult> {
	const command = registerCandidateMemoryCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const commandJournal = ctx.commandJournal;
		const memoryStore = ctx.memoryStore ?? deps.memoryStore;
		const transactionReplay = await loadIdempotentCommandResult(
			commandJournal,
			command.commandId,
		);
		if (transactionReplay) return transactionReplay;
		const existing = await memoryStore.findByContentHash(
			command.organizationId,
			command.contentHash,
		);
		if (existing) {
			const result = knowledgeCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: 1,
				idempotentReplay: true,
			});
			await commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerCandidateMemory",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const memoryId = `kn_mem_${randomUUID()}`;
		const saved = await memoryStore.save({
			id: memoryId,
			organizationId: command.organizationId,
			tier: "CANDIDATE",
			summary: command.summary,
			contentHash: command.contentHash,
			sourceDocumentId: command.sourceDocumentId ?? null,
			createdAt: new Date().toISOString(),
			promotedAt: null,
		});
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			idempotentReplay: saved.id !== memoryId,
		});
		await commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerCandidateMemory",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
