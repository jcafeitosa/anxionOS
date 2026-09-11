import type {
	ExecutionCommandResult,
	OpenVenueReconciliationCaseCommand,
} from "@anxionos/contracts/execution";
import {
	executionCommandResultSchema,
	openVenueReconciliationCaseCommandSchema,
} from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import { openVenueReconciliationCaseInTransaction } from "../reconciliation-support";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwExecutionError } from "../errors";

export interface OpenVenueReconciliationCaseDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function openVenueReconciliationCase(
	deps: OpenVenueReconciliationCaseDeps,
	input: OpenVenueReconciliationCaseCommand,
): Promise<ExecutionCommandResult> {
	const command = openVenueReconciliationCaseCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}

		if (command.orderId) {
			const order = await ctx.orders.findById(command.orderId);
			if (!order || order.organizationId !== command.organizationId) {
				throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
			}
		}

		const reconciliationCase = await openVenueReconciliationCaseInTransaction(
			ctx,
			{
				organizationId: command.organizationId,
				caseKind: command.caseKind,
				orderId: command.orderId,
				fillId: command.fillId,
				venueAdapterRefId: command.venueAdapterRefId,
				venueFillId: command.venueFillId,
				evidence: command.evidence,
			},
		);

		const result = executionCommandResultSchema.parse({
			aggregateId: reconciliationCase.id,
			revision: 1,
			reconciliationCaseId: reconciliationCase.id,
			orderId: command.orderId,
			fillId: command.fillId,
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "openVenueReconciliationCase",
			responseSnapshot: toCommandResultSnapshot(result),
		});

		return result;
	});
}
