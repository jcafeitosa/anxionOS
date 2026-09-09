import { type CheckAuthorityCommand, type DecisionsCommandResult } from "@anxionos/contracts/decisions";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import { checkAuthorityCommandSchema, decisionsCommandResultSchema } from "@anxionos/contracts/decisions";
import { createAuthorityCheckedEvent } from "../../domain/events/decisions-events";
import { loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwDecisionsError } from "../errors";

export interface CheckAuthorityDeps {
    unitOfWork: DecisionsUnitOfWork;
    commandJournal: CommandJournalRepository;
}

export async function checkAuthority(deps: CheckAuthorityDeps, input: CheckAuthorityCommand): Promise<DecisionsCommandResult> {
    const command = checkAuthorityCommandSchema.parse(input);
    const existingCommand = await deps.commandJournal.findByCommandId(command.commandId);
    if (existingCommand && existingCommand.organizationId !== command.organizationId) {
        throwDecisionsError("DC_CROSS_TENANT", "command journal organization mismatch");
    }
    const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
    if (replay)
        return replay;
    return deps.unitOfWork.runInTransaction(async (ctx) => {
        const raced = await ctx.commandJournal.findByCommandId(command.commandId);
        if (raced) {
            const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
            return decisionsCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const decision = await ctx.decisions.findById(command.decisionId);
        if (!decision || decision.organizationId !== command.organizationId) {
            throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
        }
        if (decision.grantId !== command.grantId) {
            throwDecisionsError("DC_AUTHORITY_STALE", "grant mismatch");
        }
        if (decision.expectedAuthorityEpoch !== command.authorityEpoch) {
            throwDecisionsError("DC_AUTHORITY_STALE", "authority epoch mismatch");
        }
        if (decision.status === "SUBMITTED") {
            throwDecisionsError("DC_INTENT_IMMUTABLE", "decision already submitted");
        }
        const updated = await ctx.decisions.updateStatus(decision.id, "AUTHORITY_CHECKED", decision.revision + 1);
        await ctx.publishEvents([
            createAuthorityCheckedEvent({
                decisionId: updated.id,
                organizationId: command.organizationId,
                grantId: command.grantId,
                authorityEpoch: command.authorityEpoch,
            }),
        ]);
        const result = decisionsCommandResultSchema.parse({
            aggregateId: updated.id,
            revision: updated.revision,
            decisionId: updated.id,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "checkAuthority",
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
