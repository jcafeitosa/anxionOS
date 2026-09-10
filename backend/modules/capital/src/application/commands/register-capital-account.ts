import { randomUUID } from "node:crypto";
import type {
	CapitalCommandResult,
	RegisterCapitalAccountCommand,
} from "@anxionos/contracts/capital";
import {
	capitalCommandResultSchema,
	registerCapitalAccountCommandSchema,
} from "@anxionos/contracts/capital";
import { createAccountRegisteredEvent } from "../../domain/events/capital-events";
import type {
	CapitalTransactionContext,
	CapitalUnitOfWork,
} from "../../domain/ports/capital-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterCapitalAccountDeps {
	unitOfWork: CapitalUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerCapitalAccount(
	deps: RegisterCapitalAccountDeps,
	input: unknown,
) {
	const command = registerCapitalAccountCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(
		async (ctx: CapitalTransactionContext) => {
			const raced = await ctx.commandJournal.findByCommandId(command.commandId);
			if (raced) {
				const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
				return capitalCommandResultSchema.parse({
					...parsed,
					idempotentReplay: true,
				});
			}
			const existing = await ctx.accounts.findActiveByNaturalKey(
				command.organizationId,
				command.ownerUserId,
			);
			if (existing) {
				const result = capitalCommandResultSchema.parse({
					aggregateId: existing.id,
					revision: existing.revision,
					accountId: existing.id,
				});
				await ctx.commandJournal.save({
					commandId: command.commandId,
					organizationId: command.organizationId,
					commandName: "registerCapitalAccount",
					responseSnapshot: toCommandResultSnapshot(result),
				});
				return result;
			}
			const accountId = `cap_acc_${randomUUID()}`;
			const saved = await ctx.accounts.save({
				id: accountId,
				organizationId: command.organizationId,
				ownerUserId: command.ownerUserId,
				baseCurrency: command.baseCurrency,
				executionMode: command.executionMode,
				status: "ACTIVE",
				revision: 1,
			});
			await ctx.balanceLines.save({
				accountId: saved.id,
				asset: command.baseCurrency,
				settled: command.initialSettledAmount,
				encumbered: "0",
				reserved: "0",
				revision: 1,
			});
			await ctx.publishEvents([
				createAccountRegisteredEvent({
					accountId: saved.id,
					ownerUserId: saved.ownerUserId,
					baseCurrency: saved.baseCurrency,
					organizationId: command.organizationId,
				}),
			]);
			const result = capitalCommandResultSchema.parse({
				aggregateId: saved.id,
				revision: saved.revision,
				accountId: saved.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerCapitalAccount",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		},
	);
}
