import { randomUUID } from "node:crypto";
import type {
	KnowledgeCommandResult,
	RegisterKnowledgeSourceCommand,
} from "@anxionos/contracts/knowledge";
import {
	knowledgeCommandResultSchema,
	registerKnowledgeSourceCommandSchema,
} from "@anxionos/contracts/knowledge";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterKnowledgeSourceDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerKnowledgeSource(
	deps: RegisterKnowledgeSourceDeps,
	input: RegisterKnowledgeSourceCommand,
): Promise<KnowledgeCommandResult> {
	const command = registerKnowledgeSourceCommandSchema.parse(input);
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
		const existing = await ctx.sources.findActiveByNaturalKey(
			command.organizationId,
			command.displayName,
		);
		if (existing) {
			const result = knowledgeCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: existing.revision,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerKnowledgeSource",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const sourceId = `kn_src_${randomUUID()}`;
		const saved = await ctx.sources.save({
			id: sourceId,
			organizationId: command.organizationId,
			displayName: command.displayName,
			sourceKind: command.sourceKind,
			defaultClassification: command.defaultClassification,
			defaultAclId: command.defaultAclRef.aclId,
			defaultAclEpoch: command.defaultAclRef.epoch,
			status: "ACTIVE",
			revision: 1,
		});
		const result = knowledgeCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerKnowledgeSource",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
