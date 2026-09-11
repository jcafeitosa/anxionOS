import type {
	ExecutionCommandResult,
	ResolveVenueReconciliationCaseCommand,
} from "@anxionos/contracts/execution";
import {
	executionCommandResultSchema,
	resolveVenueReconciliationCaseCommandSchema,
} from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwExecutionError } from "../errors";
import { resolveVenueReconciliationCaseInTransaction } from "../reconciliation-support";

export interface ResolveVenueReconciliationCaseDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function resolveVenueReconciliationCase(
	deps: ResolveVenueReconciliationCaseDeps,
	input: ResolveVenueReconciliationCaseCommand,
): Promise<ExecutionCommandResult> {
	const command = resolveVenueReconciliationCaseCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}

		const reconciliationCase = await ctx.reconciliationCases.findById(
			command.caseId,
		);
		if (
			!reconciliationCase ||
			reconciliationCase.organizationId !== command.organizationId
		) {
			throwExecutionError(
				"EX_RECONCILIATION_NOT_FOUND",
				"reconciliation case not found",
			);
		}

		const resolved = await resolveVenueReconciliationCaseInTransaction(ctx, {
			case: reconciliationCase,
			disposition: command.disposition,
			rationale: command.rationale,
		});

		const result = executionCommandResultSchema.parse({
			aggregateId: resolved.id,
			revision: 1,
			reconciliationCaseId: resolved.id,
			orderId: resolved.orderId ?? undefined,
			fillId: resolved.fillId ?? undefined,
			disposition: command.disposition,
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "resolveVenueReconciliationCase",
			responseSnapshot: toCommandResultSnapshot(result),
		});

		return result;
	});
}
