import { createHash, randomUUID } from "node:crypto";
import type {
	ExecutionCommandResult,
	SubmitOrderCommand,
} from "@anxionos/contracts/execution";
import {
	assertExecutionModuleModeSupported,
	executionCommandResultSchema,
	submitOrderCommandSchema,
} from "@anxionos/contracts/execution";
import {
	createFillConfirmedEvent,
	createOrderSubmittedEvent,
} from "../../domain/events/execution-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import { noopExecutionCapitalNotifyPort } from "../../domain/ports/execution-capital-notify-port";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import type {
	RiskPermitValidationFailure,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import type { SimulatedVenuePort } from "../../domain/ports/simulated-venue-port";
import {
	assertMatchingSubmitOrderFingerprint,
	assertOrderMatchesSubmitCommand,
	buildSubmitOrderFingerprint,
	compareDecimalAmounts,
	loadIdempotentByClientOrderId,
	loadIdempotentCommandResultWithGuard,
	multiplyDecimalAmounts,
	replayIdempotentCommandJournalEntry,
	subtractDecimalAmounts,
	toCommandResultSnapshot,
} from "../command-support";
import {
	assertNoBlindRetryOnUnknownDispatch,
	handleDuplicateVenueFill,
} from "../reconciliation-support";
import {
	DuplicateVenueFillSignal,
	parseCommandResultSnapshot,
	throwExecutionError,
} from "../errors";

export interface SubmitOrderDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
	riskPermitValidation: RiskPermitValidationPort;
	simulatedVenueAdapter: SimulatedVenuePort;
	capitalNotify?: ExecutionCapitalNotifyPort;
}

function mapPermitFailure(failure: RiskPermitValidationFailure | undefined) {
	if (failure === "STALE") {
		throwExecutionError("EX_PERMIT_STALE", "risk permit epoch stale");
	}
	throwExecutionError("EX_PERMIT_BYPASS", "risk permit validation failed");
}

function resolveSubmitOrderStatus(
	orderQuantity: string,
	fillQuantity: string,
	deferFill: boolean,
): "SUBMITTED" | "PARTIALLY_FILLED" {
	if (deferFill) return "SUBMITTED";
	if (compareDecimalAmounts(fillQuantity, orderQuantity) < 0) {
		return "PARTIALLY_FILLED";
	}
	return "SUBMITTED";
}

export async function submitOrder(
	deps: SubmitOrderDeps,
	input: SubmitOrderCommand,
): Promise<ExecutionCommandResult> {
	const command = submitOrderCommandSchema.parse(input);
	const requestFingerprint = buildSubmitOrderFingerprint(command);

	const replayByCommand = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replayByCommand) return replayByCommand;

	const replayByClientOrder = await loadIdempotentByClientOrderId(
		deps.commandJournal,
		command.organizationId,
		command.clientOrderId,
		requestFingerprint,
	);
	if (replayByClientOrder) return replayByClientOrder;

	const adapter = deps.simulatedVenueAdapter;
	if (!adapter) {
		throwExecutionError(
			"EX_MODE_FORBIDDEN",
			"simulated venue adapter is required",
		);
	}

	const capitalNotify = deps.capitalNotify ?? noopExecutionCapitalNotifyPort;
	const deferFill = command.deferFill === true;
	const simulateDispatchTimeout = command.simulateDispatchTimeout === true;
	const fillQuantity = command.fillQuantity ?? command.quantity;

	if (compareDecimalAmounts(fillQuantity, command.quantity) > 0) {
		throwExecutionError(
			"EX_ORDER_NOT_FILLABLE",
			"fill quantity exceeds order quantity",
		);
	}

	try {
		return await deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			return replayIdempotentCommandJournalEntry(
				racedByCommand,
				command.organizationId,
			);
		}
		const racedByClientOrder = await ctx.commandJournal.findByClientOrderId(
			command.organizationId,
			command.clientOrderId,
		);
		if (racedByClientOrder) {
			assertMatchingSubmitOrderFingerprint(
				typeof racedByClientOrder.responseSnapshot.requestFingerprint ===
					"string"
					? racedByClientOrder.responseSnapshot.requestFingerprint
					: undefined,
				command,
			);
			const parsed = parseCommandResultSnapshot(
				racedByClientOrder.responseSnapshot,
			);
			return executionCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const session = await ctx.sessions.findById(command.sessionId);
		if (!session || session.organizationId !== command.organizationId) {
			throwExecutionError(
				"EX_SESSION_NOT_FOUND",
				"execution session not found",
			);
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
			mapPermitFailure(permitCheck.failure);
		}

		const existingOrder = await ctx.orders.findByClientOrderId(
			command.organizationId,
			command.clientOrderId,
		);
		if (existingOrder) {
			assertOrderMatchesSubmitCommand(existingOrder, command);
			assertNoBlindRetryOnUnknownDispatch(existingOrder.venueDispatchStatus);
			throwExecutionError(
				"EX_DUPLICATE_CLIENT_ORDER",
				"client order already exists",
			);
		}

		const orderId = `ex_ord_${randomUUID()}`;
		const initialFilledQuantity = deferFill ? "0" : fillQuantity;
		const initialStatus = resolveSubmitOrderStatus(
			command.quantity,
			initialFilledQuantity,
			deferFill,
		);
		const initialDispatchStatus = simulateDispatchTimeout
			? "UNKNOWN"
			: deferFill
				? "DISPATCHED"
				: "ACK";

		const savedOrder = await ctx.orders.save({
			id: orderId,
			organizationId: command.organizationId,
			sessionId: command.sessionId,
			clientOrderId: command.clientOrderId,
			instrumentId: command.instrumentId,
			side: command.side,
			quantity: command.quantity,
			price: command.price,
			filledQuantity: initialFilledQuantity,
			status: initialStatus,
			venueDispatchStatus: initialDispatchStatus,
		});

		const attemptNo =
			(await ctx.orderAttempts.countByOrderId(savedOrder.id)) + 1;
		await ctx.orderAttempts.save({
			id: `ex_att_${randomUUID()}`,
			organizationId: command.organizationId,
			orderId: savedOrder.id,
			attemptNo,
			adapterKind: "SIMULATED",
			requestHash: createHash("sha256")
				.update(
					`${savedOrder.id}:${command.clientOrderId}:${command.quantity}:${command.price}`,
				)
				.digest("hex"),
			status: simulateDispatchTimeout ? "TIMEOUT" : "ACK",
			responseCode: simulateDispatchTimeout ? "TIMEOUT" : "200",
			errorCode: simulateDispatchTimeout ? "VENUE_TIMEOUT" : null,
			sentAt: new Date().toISOString(),
		});

		const events = [
			createOrderSubmittedEvent({
				orderId: savedOrder.id,
				sessionId: command.sessionId,
				organizationId: command.organizationId,
				clientOrderId: command.clientOrderId,
				instrumentId: command.instrumentId,
				side: command.side,
				quantity: command.quantity,
				price: command.price,
				executionMode: session.executionMode,
			}),
		];

		let fillId: string | undefined;
		let venueFillId: string | undefined;

		if (!deferFill && !simulateDispatchTimeout) {
			const notionalAmount = multiplyDecimalAmounts(
				fillQuantity,
				command.price,
			);
			const simulated = adapter.fill(
				{
					orderId: savedOrder.id,
					clientOrderId: command.clientOrderId,
					quantity: command.quantity,
					fillQuantity,
					price: command.price,
					asset: command.asset,
				},
				notionalAmount,
			);
			const existingFill = await ctx.fills.findByVenueFillId(
				simulated.venueFillId,
			);
			if (existingFill) {
				throw new DuplicateVenueFillSignal({
					organizationId: command.organizationId,
					orderId: savedOrder.id,
					existingFillId: existingFill.id,
					venueFillId: simulated.venueFillId,
					venueAdapterRefId: session.venueAdapterRefId,
				});
			}
			fillId = `ex_fill_${randomUUID()}`;
			venueFillId = simulated.venueFillId;
			const fillEventId = randomUUID();
			await ctx.fills.save({
				id: fillId,
				organizationId: command.organizationId,
				orderId: savedOrder.id,
				venueFillId: simulated.venueFillId,
				quantity: simulated.quantity,
				price: simulated.price,
				notionalAmount: simulated.notionalAmount,
				asset: simulated.asset,
				status: "CONFIRMED",
				filledAt: simulated.filledAt,
			});
			events.push(
				createFillConfirmedEvent({
					eventId: fillEventId,
					organizationId: command.organizationId,
					fillId,
					orderId: savedOrder.id,
					side: command.side,
					instrumentId: command.instrumentId,
					quantity: simulated.quantity,
					price: simulated.price,
					notionalAmount: simulated.notionalAmount,
					asset: simulated.asset,
					filledAt: simulated.filledAt,
					executionMode: session.executionMode,
					capitalAccountId: command.capitalAccountId,
					portfolioId: command.portfolioId,
				}),
			);
			capitalNotify.onFillConfirmed({
				organizationId: command.organizationId,
				fillId,
				orderId: savedOrder.id,
				notionalAmount: simulated.notionalAmount,
				asset: simulated.asset,
				capitalAccountId: command.capitalAccountId,
				portfolioId: command.portfolioId,
			});
		}

		if (simulateDispatchTimeout) {
			await ctx.publishEvents(events);
			const timeoutResult = executionCommandResultSchema.parse({
				aggregateId: savedOrder.id,
				revision: 1,
				sessionId: command.sessionId,
				orderId: savedOrder.id,
				orderStatus: initialStatus,
				remainingQuantity: subtractDecimalAmounts(
					command.quantity,
					initialFilledQuantity,
				),
				venueDispatchStatus: "UNKNOWN",
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "submitOrder",
				clientOrderId: command.clientOrderId,
				responseSnapshot: toCommandResultSnapshot(timeoutResult, {
					requestFingerprint,
				}),
			});
			return timeoutResult;
		}

		await ctx.publishEvents(events);

		const result = executionCommandResultSchema.parse({
			aggregateId: savedOrder.id,
			revision: 1,
			sessionId: command.sessionId,
			orderId: savedOrder.id,
			fillId,
			venueFillId,
			orderStatus: initialStatus,
			remainingQuantity: subtractDecimalAmounts(
				command.quantity,
				initialFilledQuantity,
			),
			venueDispatchStatus: initialDispatchStatus,
		});

		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "submitOrder",
			clientOrderId: command.clientOrderId,
			responseSnapshot: toCommandResultSnapshot(result, {
				requestFingerprint,
			}),
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
			throwExecutionError(
				"EX_DUPLICATE_FILL",
				"venue fill id already exists",
				{
					reconciliationCaseId: reconciliationCase.id,
					disposition: "LINKED_EXISTING_FILL",
				},
			);
		}
		throw error;
	}
}
