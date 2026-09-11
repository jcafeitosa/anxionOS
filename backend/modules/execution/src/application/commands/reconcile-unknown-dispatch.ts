import { randomUUID } from "node:crypto";
import type {
	ExecutionCommandResult,
	ReconcileUnknownDispatchCommand,
} from "@anxionos/contracts/execution";
import {
	executionCommandResultSchema,
	reconcileUnknownDispatchCommandSchema,
} from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwExecutionError } from "../errors";
import {
	openVenueReconciliationCaseInTransaction,
	resolveVenueReconciliationCaseInTransaction,
} from "../reconciliation-support";

export interface ReconcileUnknownDispatchDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function reconcileUnknownDispatch(
	deps: ReconcileUnknownDispatchDeps,
	input: ReconcileUnknownDispatchCommand,
): Promise<ExecutionCommandResult> {
	const command = reconcileUnknownDispatchCommandSchema.parse(input);
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

		const order = await ctx.orders.findByIdForUpdate(command.orderId);
		if (!order || order.organizationId !== command.organizationId) {
			throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
		}
		if (
			order.venueDispatchStatus !== "UNKNOWN" &&
			order.venueDispatchStatus !== "RECONCILING"
		) {
			throwExecutionError(
				"EX_DISPATCH_UNKNOWN",
				"order dispatch is not in UNKNOWN/RECONCILING state",
			);
		}

		const session = await ctx.sessions.findById(order.sessionId);
		if (!session || session.organizationId !== command.organizationId) {
			throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
		}

		let correlatedFillId: string | undefined;
		if (command.venueFillId) {
			const fill = await ctx.fills.findByVenueFillId(command.venueFillId);
			if (fill && fill.organizationId === command.organizationId) {
				correlatedFillId = fill.id;
			}
		} else if (command.clientOrderId) {
			const correlatedOrder = await ctx.orders.findByClientOrderId(
				command.organizationId,
				command.clientOrderId,
			);
			if (correlatedOrder) {
				const fills = await ctx.fills.findByOrderId(correlatedOrder.id);
				correlatedFillId = fills[0]?.id;
			}
		}

		let nextDispatchStatus = order.venueDispatchStatus ?? "UNKNOWN";
		let disposition: string | undefined;
		let reconciliationCaseId: string | undefined;

		if (command.decision === "KEEP_RECONCILING") {
			nextDispatchStatus = "RECONCILING";
			const opened = await openVenueReconciliationCaseInTransaction(ctx, {
				organizationId: command.organizationId,
				caseKind: "ORDER_STATUS_MISMATCH",
				orderId: order.id,
				venueAdapterRefId: session.venueAdapterRefId,
				evidence: command.rationale,
			});
			reconciliationCaseId = opened.id;
		} else if (command.decision === "CONFIRM_EXISTING") {
			if (!correlatedFillId) {
				const opened = await openVenueReconciliationCaseInTransaction(ctx, {
					organizationId: command.organizationId,
					caseKind: "FILL_MISSING",
					orderId: order.id,
					venueAdapterRefId: session.venueAdapterRefId,
					venueFillId: command.venueFillId,
					evidence: command.rationale,
				});
				reconciliationCaseId = opened.id;
				nextDispatchStatus = "RECONCILING";
			} else {
				nextDispatchStatus = "ACK";
				disposition = "CONFIRMED_EXISTING";
				const opened = await openVenueReconciliationCaseInTransaction(ctx, {
					organizationId: command.organizationId,
					caseKind: "ORDER_STATUS_MISMATCH",
					orderId: order.id,
					fillId: correlatedFillId,
					venueAdapterRefId: session.venueAdapterRefId,
					venueFillId: command.venueFillId,
					evidence: command.rationale,
				});
				const resolved = await resolveVenueReconciliationCaseInTransaction(ctx, {
					case: opened,
					disposition: "CONFIRMED_EXISTING",
					rationale: command.rationale,
				});
				reconciliationCaseId = resolved.id;
			}
		} else {
			nextDispatchStatus = "FAILED";
			disposition = "MARKED_FAILED";
			const opened = await openVenueReconciliationCaseInTransaction(ctx, {
				organizationId: command.organizationId,
				caseKind: "ORDER_STATUS_MISMATCH",
				orderId: order.id,
				venueAdapterRefId: session.venueAdapterRefId,
				evidence: command.rationale,
			});
			const resolved = await resolveVenueReconciliationCaseInTransaction(ctx, {
				case: opened,
				disposition: "MARKED_FAILED",
				rationale: command.rationale,
			});
			reconciliationCaseId = resolved.id;
		}

		await ctx.orders.update({
			...order,
			venueDispatchStatus: nextDispatchStatus,
		});

		const result = executionCommandResultSchema.parse({
			aggregateId: order.id,
			revision: 1,
			orderId: order.id,
			fillId: correlatedFillId,
			venueDispatchStatus: nextDispatchStatus,
			reconciliationCaseId,
			disposition,
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "reconcileUnknownDispatch",
			responseSnapshot: toCommandResultSnapshot(result),
		});

		return result;
	});
}
