import { type ExecutionCommandResult, type SubmitOrderCommand } from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import type { RiskPermitValidationPort, RiskPermitValidationFailure } from "../../domain/ports/risk-permit-validation";
import type { SimulatedVenuePort } from "../../domain/ports/simulated-venue-port";
import { randomUUID } from "node:crypto";
import { assertExecutionModuleModeSupported, executionCommandResultSchema, submitOrderCommandSchema } from "@anxionos/contracts/execution";
import { createFillConfirmedEvent, createOrderSubmittedEvent, } from "../../domain/events/execution-events";
import { loadIdempotentByClientOrderId, loadIdempotentCommandResult, multiplyDecimalAmounts, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwExecutionError } from "../errors";

export interface SubmitOrderDeps {
    unitOfWork: ExecutionUnitOfWork;
    commandJournal: CommandJournalRepository;
    riskPermitValidation: RiskPermitValidationPort;
    simulatedVenueAdapter: SimulatedVenuePort;
}

function mapPermitFailure(failure: RiskPermitValidationFailure | undefined) {
    if (failure === "STALE") {
        throwExecutionError("EX_PERMIT_STALE", "risk permit epoch stale");
    }
    throwExecutionError("EX_PERMIT_BYPASS", "risk permit validation failed");
}
export async function submitOrder(deps: SubmitOrderDeps, input: SubmitOrderCommand): Promise<ExecutionCommandResult> {
    const command = submitOrderCommandSchema.parse(input);
    const existingCommand = await deps.commandJournal.findByCommandId(command.commandId);
    if (existingCommand && existingCommand.organizationId !== command.organizationId) {
        throwExecutionError("EX_CROSS_TENANT", "command journal organization mismatch");
    }
    const replayByCommand = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
    if (replayByCommand)
        return replayByCommand;
    const replayByClientOrder = await loadIdempotentByClientOrderId(deps.commandJournal, command.organizationId, command.clientOrderId);
    if (replayByClientOrder)
        return replayByClientOrder;
    const adapter = deps.simulatedVenueAdapter;
    if (!adapter) {
        throwExecutionError("EX_MODE_FORBIDDEN", "simulated venue adapter is required");
    }
    return deps.unitOfWork.runInTransaction(async (ctx) => {
        const racedByCommand = await ctx.commandJournal.findByCommandId(command.commandId);
        if (racedByCommand) {
            const parsed = parseCommandResultSnapshot(racedByCommand.responseSnapshot);
            return executionCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const racedByClientOrder = await ctx.commandJournal.findByClientOrderId(command.organizationId, command.clientOrderId);
        if (racedByClientOrder) {
            const parsed = parseCommandResultSnapshot(racedByClientOrder.responseSnapshot);
            return executionCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const session = await ctx.sessions.findById(command.sessionId);
        if (!session || session.organizationId !== command.organizationId) {
            throwExecutionError("EX_SESSION_NOT_FOUND", "execution session not found");
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
        const existingOrder = await ctx.orders.findByClientOrderId(command.organizationId, command.clientOrderId);
        if (existingOrder) {
            throwExecutionError("EX_DUPLICATE_CLIENT_ORDER", "client order already exists");
        }
        const orderId = `ex_ord_${randomUUID()}`;
        const savedOrder = await ctx.orders.save({
            id: orderId,
            organizationId: command.organizationId,
            sessionId: command.sessionId,
            clientOrderId: command.clientOrderId,
            instrumentId: command.instrumentId,
            side: command.side,
            quantity: command.quantity,
            price: command.price,
            status: "SUBMITTED",
        });
        const notionalAmount = multiplyDecimalAmounts(command.quantity, command.price);
        const simulated = adapter.fill({
            orderId: savedOrder.id,
            clientOrderId: command.clientOrderId,
            quantity: command.quantity,
            price: command.price,
            asset: command.asset,
        }, notionalAmount);
        const existingFill = await ctx.fills.findByVenueFillId(simulated.venueFillId);
        if (existingFill) {
            throwExecutionError("EX_DUPLICATE_FILL", "venue fill id already exists");
        }
        const fillId = `ex_fill_${randomUUID()}`;
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
        await ctx.publishEvents([
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
        ]);
        const result = executionCommandResultSchema.parse({
            aggregateId: savedOrder.id,
            revision: 1,
            sessionId: command.sessionId,
            orderId: savedOrder.id,
            fillId,
            venueFillId: simulated.venueFillId,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "submitOrder",
            clientOrderId: command.clientOrderId,
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
