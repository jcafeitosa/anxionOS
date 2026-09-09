import { type ProposeDecisionCommand, type DecisionsCommandResult } from "@anxionos/contracts/decisions";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import { randomUUID } from "node:crypto";
import { decisionsCommandResultSchema, proposeDecisionCommandSchema } from "@anxionos/contracts/decisions";
import { createProposalCreatedEvent } from "../../domain/events/decisions-events";
import { loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwDecisionsError } from "../errors";

export interface ProposeDecisionDeps {
    unitOfWork: DecisionsUnitOfWork;
    commandJournal: CommandJournalRepository;
}

export async function proposeDecision(deps: ProposeDecisionDeps, input: ProposeDecisionCommand): Promise<DecisionsCommandResult> {
    const command = proposeDecisionCommandSchema.parse(input);
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
        const decisionId = `dc_dec_${randomUUID()}`;
        const proposalId = `dc_prp_${randomUUID()}`;
        const savedDecision = await ctx.decisions.save({
            id: decisionId,
            organizationId: command.organizationId,
            grantId: command.grantId,
            expectedAuthorityEpoch: command.expectedAuthorityEpoch,
            correlationId: command.correlationId,
            status: "PROPOSED",
            revision: 1,
        });
        await ctx.proposals.save({
            id: proposalId,
            decisionId: savedDecision.id,
            organizationId: command.organizationId,
            proposalKind: command.proposalKind,
            status: "OPEN",
        });
        await ctx.publishEvents([
            createProposalCreatedEvent({
                decisionId: savedDecision.id,
                proposalId,
                organizationId: command.organizationId,
                grantId: command.grantId,
                expectedAuthorityEpoch: command.expectedAuthorityEpoch,
                proposalKind: command.proposalKind,
                correlationId: command.correlationId,
            }),
        ]);
        const result = decisionsCommandResultSchema.parse({
            aggregateId: savedDecision.id,
            revision: savedDecision.revision,
            decisionId: savedDecision.id,
            proposalId,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "proposeDecision",
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
