import { randomUUID } from "node:crypto";
import {
	type ConnectionsCommandResult,
	connectionsCommandResultSchema,
	type RegisterAIAccountCommand,
	registerAIAccountCommandSchema,
} from "@anxionos/contracts/connections";
import { createAiAccountRegisteredEvent } from "../../domain/events/connections-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ConnectionsUnitOfWork } from "../../domain/ports/connections-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterAIAccountDeps {
	unitOfWork: ConnectionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerAIAccount(
	deps: RegisterAIAccountDeps,
	input: RegisterAIAccountCommand,
): Promise<ConnectionsCommandResult> {
	const command = registerAIAccountCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return connectionsCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const existing = await ctx.aiAccounts.findDraftByNaturalKey({
			organizationId: command.organizationId,
			ownerPrincipalId: command.ownerPrincipalId,
			providerId: command.providerId,
			displayName: command.displayName,
		});
		if (existing) {
			const result = connectionsCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: existing.revision,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerAIAccount",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const aiAccountId = `cx_acct_${randomUUID()}`;
		const saved = await ctx.aiAccounts.save({
			id: aiAccountId,
			organizationId: command.organizationId,
			ownerPrincipalId: command.ownerPrincipalId,
			providerId: command.providerId,
			displayName: command.displayName,
			status: "draft",
			revision: 1,
		});
		const result = connectionsCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
		});
		await ctx.publishEvents([
			createAiAccountRegisteredEvent({
				aiAccountId: saved.id,
				ownerPrincipalId: saved.ownerPrincipalId,
				providerId: saved.providerId,
				organizationId: saved.organizationId,
			}),
		]);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerAIAccount",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
