import { randomUUID } from "node:crypto";
import type {
	ExecutionCommandResult,
	RecordFillCommand,
} from "@anxionos/contracts/execution";
import {
	assertExecutionModuleModeSupported,
	executionCommandResultSchema,
	recordFillCommandSchema,
} from "@anxionos/contracts/execution";
import { createFillConfirmedEvent } from "../../domain/events/execution-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import { noopExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import type { RiskPermitValidationPort } from "../../domain/ports/risk-permit-validation";
import type { SimulatedVenuePort } from "../../domain/ports/simulated-venue-port";
import {
	addDecimalAmounts,
	compareDecimalAmounts,
	loadIdempotentCommandResultWithGuard,
	multiplyDecimalAmounts,
	replayIdempotentCommandJournalEntry,
	resolveOrderStatusAfterFill,
	subtractDecimalAmounts,
	toCommandResultSnapshot,
} from "../command-support";
import {
	assertNoBlindRetryOnUnknownDispatch,
	handleDuplicateVenueFill,
} from "../reconciliation-support";
import { DuplicateVenueFillSignal, throwExecutionError } from "../errors";

export interface RecordFillDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
	riskPermitValidation: RiskPermitValidationPort;
	simulatedVenueAdapter: SimulatedVenuePort;
	capitalNotify?: ExecutionCapitalNotifyPort;
}

export async function recordFill(
	deps: RecordFillDeps,
	input: RecordFillCommand,
): Promise<ExecutionCommandResult> {
	const command = recordFillCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;

	const adapter = deps.simulatedVenueAdapter;
	if (!adapter) {
		throwExecutionError(
			"EX_MODE_FORBIDDEN",
			"simulated venue adapter is required",
		);
	}

	const capitalNotify = deps.capitalNotify ?? noopExecutionCapitalNotifyPort;

	try {
		return await deps.unitOfWork.runInTransaction(async (ctx) => {
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
		assertNoBlindRetryOnUnknownDispatch(order.venueDispatchStatus);
		if (order.status === "CANCELLED") {
			throwExecutionError(
				"EX_ORDER_NOT_FILLABLE",
				"cancelled order cannot accept fills",
			);
		}
		if (order.status === "FILLED") {
			throwExecutionError(
				"EX_ORDER_NOT_FILLABLE",
				"filled order cannot accept additional fills",
			);
		}

		const remainingBefore = subtractDecimalAmounts(
			order.quantity,
			order.filledQuantity,
		);
		if (compareDecimalAmounts(command.fillQuantity, remainingBefore) > 0) {
			throwExecutionError(
				"EX_ORDER_NOT_FILLABLE",
				"fill quantity exceeds remaining order quantity",
			);
		}

		const session = await ctx.sessions.findById(order.sessionId);
		if (!session || session.organizationId !== command.organizationId) {
			throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
		}
		if (session.status !== "OPEN") {
			throwExecutionError("EX_SESSION_NOT_FOUND", "execution session not open");
		}
		assertExecutionModuleModeSupported(session.executionMode);

		const permitCheck = await deps.riskPermitValidation.validatePermit({
			organizationId: command.organizationId,
			riskPermitId: session.riskPermitId,
			intentHash: session.intentHash,
			authorityEpoch: session.authorityEpoch,
			riskEpoch: session.riskEpoch,
		});
		if (!permitCheck.valid) {
			if (permitCheck.failure === "STALE") {
				throwExecutionError("EX_PERMIT_STALE", "risk permit epoch stale");
			}
			throwExecutionError("EX_PERMIT_BYPASS", "risk permit validation failed");
		}

		const fillPrice = command.price ?? order.price;
		const fillAsset = command.asset ?? "USD";
		const notionalAmount = multiplyDecimalAmounts(
			command.fillQuantity,
			fillPrice,
		);
		const simulated = adapter.fill(
			{
				orderId: order.id,
				clientOrderId: order.clientOrderId,
				quantity: order.quantity,
				fillQuantity: command.fillQuantity,
				price: fillPrice,
				asset: fillAsset,
			},
			notionalAmount,
		);

		const existingFill = await ctx.fills.findByVenueFillId(
			simulated.venueFillId,
		);
		if (existingFill) {
			throw new DuplicateVenueFillSignal({
				organizationId: command.organizationId,
				orderId: order.id,
				existingFillId: existingFill.id,
				venueFillId: simulated.venueFillId,
				venueAdapterRefId: session.venueAdapterRefId,
			});
		}

		const fillId = `ex_fill_${randomUUID()}`;
		const fillEventId = randomUUID();
		await ctx.fills.save({
			id: fillId,
			organizationId: command.organizationId,
			orderId: order.id,
			venueFillId: simulated.venueFillId,
			quantity: simulated.quantity,
			price: simulated.price,
			notionalAmount: simulated.notionalAmount,
			asset: simulated.asset,
			status: "CONFIRMED",
			filledAt: simulated.filledAt,
		});

		const newFilledQuantity = addDecimalAmounts(
			order.filledQuantity,
			command.fillQuantity,
		);
		const nextStatus = resolveOrderStatusAfterFill(
			order.quantity,
			newFilledQuantity,
		);
		await ctx.orders.update({
			...order,
			filledQuantity: newFilledQuantity,
			status: nextStatus,
		});

		await ctx.publishEvents([
			createFillConfirmedEvent({
				eventId: fillEventId,
				organizationId: command.organizationId,
				fillId,
				orderId: order.id,
				side: order.side,
				instrumentId: order.instrumentId,
				quantity: simulated.quantity,
				price: simulated.price,
				notionalAmount: simulated.notionalAmount,
				asset: simulated.asset,
				filledAt: simulated.filledAt,
				executionMode: session.executionMode,
				capitalAccountId: command.capitalAccountId,
				portfolioId: command.portfolioId,
			}),
		]);

		capitalNotify.onFillConfirmed({
			organizationId: command.organizationId,
			fillId,
			orderId: order.id,
			notionalAmount: simulated.notionalAmount,
			asset: simulated.asset,
			capitalAccountId: command.capitalAccountId,
			portfolioId: command.portfolioId,
		});

		const result = executionCommandResultSchema.parse({
			aggregateId: order.id,
			revision: 1,
			sessionId: order.sessionId,
			orderId: order.id,
			fillId,
			venueFillId: simulated.venueFillId,
			orderStatus: nextStatus,
			remainingQuantity: subtractDecimalAmounts(
				order.quantity,
				newFilledQuantity,
			),
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordFill",
			responseSnapshot: toCommandResultSnapshot(result),
		});

		return result;
		});
	} catch (error) {
		if (error instanceof DuplicateVenueFillSignal) {
			const reconciliationCase = await handleDuplicateVenueFill(
				deps.unitOfWork,
				{
					organizationId: error.organizationId,
					orderId: error.orderId,
					existingFillId: error.existingFillId,
					venueFillId: error.venueFillId,
					venueAdapterRefId: error.venueAdapterRefId,
				},
			);
			throwExecutionError("EX_DUPLICATE_FILL", "venue fill id already exists", {
				reconciliationCaseId: reconciliationCase.id,
				disposition: "LINKED_EXISTING_FILL",
			});
		}
		throw error;
	}
}
