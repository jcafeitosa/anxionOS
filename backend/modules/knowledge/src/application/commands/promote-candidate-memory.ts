import type {
	KnowledgeCommandResult,
	PromoteCandidateMemoryCommand,
} from "@anxionos/contracts/knowledge";
import {
	knowledgeCommandResultSchema,
	promoteCandidateMemoryCommandSchema,
} from "@anxionos/contracts/knowledge";
import { createMemoryPromotedEvent } from "../../domain/events/knowledge-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import type { MemoryStorePort } from "../../domain/ports/memory-store";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwKnowledgeError } from "../errors";

export interface PromoteCandidateMemoryDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
	memoryStore: MemoryStorePort;
}

export async function promoteCandidateMemory(
	deps: PromoteCandidateMemoryDeps,
	input: PromoteCandidateMemoryCommand,
): Promise<KnowledgeCommandResult> {
	const command = promoteCandidateMemoryCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	const entry = await deps.memoryStore.findById(
		command.memoryEntryId,
		command.organizationId,
	);
	if (!entry) {
		throwKnowledgeError(
			"KN_MEMORY_NOT_FOUND",
			`Memory entry ${command.memoryEntryId} not found`,
		);
	}
	if (entry.tier === "PROMOTED") {
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: entry.id,
			revision: 1,
			idempotentReplay: true,
		});
		await deps.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "promoteCandidateMemory",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	}
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return knowledgeCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const promoted = await deps.memoryStore.update({
			...entry,
			tier: "PROMOTED",
			promotedAt: command.promotedAt,
		});
		await ctx.publishEvents([
			createMemoryPromotedEvent({
				memoryEntryId: promoted.id,
				organizationId: promoted.organizationId,
				contentHash: promoted.contentHash,
				promotedAt: command.promotedAt,
			}),
		]);
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: promoted.id,
			revision: 1,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "promoteCandidateMemory",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
