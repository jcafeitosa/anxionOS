import { type CapitalCommandResult, type ProposeAllocationCommand } from "@anxionos/contracts/capital";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { CapitalUnitOfWork } from "../../domain/ports/capital-unit-of-work";
import type { GrantValidationPort } from "../../domain/ports/grant-validation-port";
import { randomUUID } from "node:crypto";
import { capitalCommandResultSchema, proposeAllocationCommandSchema } from "@anxionos/contracts/capital";
import { createAllocationProposedEvent } from "../../domain/events/capital-events";
import { loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwCapitalError } from "../errors";

export interface ProposeAllocationDeps {
    unitOfWork: CapitalUnitOfWork;
    commandJournal: CommandJournalRepository;
    grantValidation: GrantValidationPort;
}

export async function proposeAllocation(deps, input) {
    const command = proposeAllocationCommandSchema.parse(input);
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
        const allocationId = `cap_alloc_${randomUUID()}`;
        const saved = await ctx.allocations.save({
            id: allocationId,
            accountId: command.accountId,
            organizationId: command.organizationId,
            portfolioId: command.portfolioId,
            grantId: command.grantId,
            state: "PROPOSED",
            limitAmount: command.limitAmount,
            limitCurrency: command.limitCurrency,
            revision: 1,
        });
        await ctx.publishEvents([
            createAllocationProposedEvent({
                allocationId: saved.id,
                accountId: saved.accountId,
                grantId: saved.grantId,
                portfolioId: saved.portfolioId,
                organizationId: command.organizationId,
                limitAmount: saved.limitAmount,
                limitCurrency: saved.limitCurrency,
            }),
        ]);
        const result = capitalCommandResultSchema.parse({
            aggregateId: saved.id,
            revision: saved.revision,
            accountId: command.accountId,
            allocationId: saved.id,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "proposeAllocation",
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
