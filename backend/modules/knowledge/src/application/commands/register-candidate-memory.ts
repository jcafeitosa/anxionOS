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
import type { MemoryStorePort } from "../../domain/ports/memory-store";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterCandidateMemoryDeps {
	commandJournal: CommandJournalRepository;
	memoryStore: MemoryStorePort;
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
	const existing = await deps.memoryStore.findByContentHash(
		command.organizationId,
		command.contentHash,
	);
	if (existing) {
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: existing.id,
			revision: 1,
			idempotentReplay: true,
		});
		await deps.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerCandidateMemory",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	}
	const memoryId = `kn_mem_${randomUUID()}`;
	const saved = await deps.memoryStore.save({
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
	});
	await deps.commandJournal.save({
		commandId: command.commandId,
		organizationId: command.organizationId,
		commandName: "registerCandidateMemory",
		responseSnapshot: toCommandResultSnapshot(result),
	});
	const raced = await deps.commandJournal.findByCommandId(command.commandId);
	if (raced && raced.commandId !== command.commandId) {
		const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
		return knowledgeCommandResultSchema.parse({
			...parsed,
			idempotentReplay: true,
		});
	}
	return result;
}
