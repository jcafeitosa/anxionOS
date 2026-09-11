import { randomUUID } from "node:crypto";
import type {
	CancelOrderCommand,
	ExecutionCommandResult,
} from "@anxionos/contracts/execution";
import {
	cancelOrderCommandSchema,
	executionCommandResultSchema,
} from "@anxionos/contracts/execution";
import { createOrderCancelledEvent } from "../../domain/events/execution-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import { noopExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	subtractDecimalAmounts,
	toCommandResultSnapshot,
} from "../command-support";
import { throwExecutionError } from "../errors";

export interface CancelOrderDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
	capitalNotify?: ExecutionCapitalNotifyPort;
}

const TERMINAL_ORDER_STATUSES = new Set(["FILLED", "CANCELLED"]);

export async function cancelOrder(
	deps: CancelOrderDeps,
	input: CancelOrderCommand,
): Promise<ExecutionCommandResult> {
	const command = cancelOrderCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	const capitalNotify = deps.capitalNotify ?? noopExecutionCapitalNotifyPort;

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
		if (TERMINAL_ORDER_STATUSES.has(order.status)) {
			throwExecutionError(
				"EX_ORDER_NOT_CANCELLABLE",
				`order status ${order.status} cannot be cancelled`,
			);
		}

		const session = await ctx.sessions.findById(order.sessionId);
		if (!session || session.organizationId !== command.organizationId) {
			throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
		}

		const remainingQuantity = subtractDecimalAmounts(
			order.quantity,
			order.filledQuantity,
		);
		const cancelledAt = new Date().toISOString();
		const eventId = randomUUID();

		await ctx.orders.update({
			...order,
			status: "CANCELLED",
		});

		await ctx.publishEvents([
			createOrderCancelledEvent({
				eventId,
				organizationId: command.organizationId,
				orderId: order.id,
				sessionId: order.sessionId,
				clientOrderId: order.clientOrderId,
				cancelledAt,
				executionMode: session.executionMode,
				filledQuantity: order.filledQuantity,
				remainingQuantity,
				capitalAccountId: command.capitalAccountId,
				portfolioId: command.portfolioId,
				reservationId: command.reservationId,
			}),
		]);

		capitalNotify.onOrderCancelled({
			organizationId: command.organizationId,
			orderId: order.id,
			remainingQuantity,
			capitalAccountId: command.capitalAccountId,
			portfolioId: command.portfolioId,
			reservationId: command.reservationId,
		});

		const result = executionCommandResultSchema.parse({
			aggregateId: order.id,
			revision: 1,
			sessionId: order.sessionId,
			orderId: order.id,
			orderStatus: "CANCELLED",
			remainingQuantity,
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "cancelOrder",
			responseSnapshot: toCommandResultSnapshot(result),
		});

		return result;
	});
}
