import { type CapitalCommandResult, type ReserveForIntentCommand } from "@anxionos/contracts/capital";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { CapitalUnitOfWork } from "../../domain/ports/capital-unit-of-work";
import type { GrantValidationPort } from "../../domain/ports/grant-validation-port";
import { randomUUID } from "node:crypto";
import { capitalCommandResultSchema, reserveForIntentCommandSchema } from "@anxionos/contracts/capital";
import { createReservationCreatedEvent } from "../../domain/events/capital-events";
import { loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwCapitalError } from "../errors";

export interface ReserveForIntentDeps {
    unitOfWork: CapitalUnitOfWork;
    commandJournal: CommandJournalRepository;
    grantValidation: GrantValidationPort;
}

function mapBalanceAssertionError(error) {
    if (error instanceof Error) {
        if (error.message.startsWith("CAP_INSUFFICIENT_AVAILABLE:")) {
            throwCapitalError("CAP_INSUFFICIENT_AVAILABLE", error.message.split(":")[1] ?? "Insufficient available");
        }
    }
    throw error;
}
export async function reserveForIntent(deps, input) {
    const command = reserveForIntentCommandSchema.parse(input);
    const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
    if (replay)
        return replay;
    await deps.grantValidation.validateGrant(command.grantId, command.organizationId);
    return deps.unitOfWork.runInTransaction(async (ctx) => {
        const raced = await ctx.commandJournal.findByCommandId(command.commandId);
        if (raced) {
            const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
            return capitalCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const account = await ctx.accounts.findById(command.accountId, command.organizationId);
        if (!account) {
            throwCapitalError("CAP_ACCOUNT_NOT_FOUND", `Account ${command.accountId} not found`);
        }
        const existingReservation = await ctx.reservations.findActiveByIntent(command.accountId, command.intentHash);
        if (existingReservation) {
            throwCapitalError("CAP_DOUBLE_RESERVATION", `Active reservation already exists for intent ${command.intentHash}`);
        }
        try {
            await ctx.balanceLines.assertAvailableForReservation(command.accountId, command.asset, command.amount);
        }
        catch (error) {
            mapBalanceAssertionError(error);
        }
        const reservationId = `cap_res_${randomUUID()}`;
        const saved = await ctx.reservations.save({
            id: reservationId,
            accountId: command.accountId,
            organizationId: command.organizationId,
            portfolioId: command.portfolioId,
            grantId: command.grantId,
            intentHash: command.intentHash,
            asset: command.asset,
            amount: command.amount,
            reservationKind: command.reservationKind,
            status: "HELD",
            expiresAt: command.expiresAt ?? null,
        });
        await ctx.publishEvents([
            createReservationCreatedEvent({
                reservationId: saved.id,
                accountId: saved.accountId,
                intentHash: saved.intentHash,
                amount: saved.amount,
                asset: saved.asset,
                organizationId: command.organizationId,
            }),
        ]);
        const result = capitalCommandResultSchema.parse({
            aggregateId: saved.id,
            revision: 1,
            accountId: command.accountId,
            reservationId: saved.id,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "reserveForIntent",
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
