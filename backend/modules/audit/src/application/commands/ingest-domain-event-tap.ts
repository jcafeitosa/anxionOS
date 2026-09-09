import { type AuditCommandResult, type IngestDomainEventTapCommand } from "@anxionos/contracts/audit";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AuditUnitOfWork } from "../../domain/ports/audit-unit-of-work";
import { randomUUID } from "node:crypto";
import { auditCommandResultSchema, ingestDomainEventTapCommandSchema } from "@anxionos/contracts/audit";
import { createManifestRecordedEvent } from "../../domain/events/audit-events";
import { loadIdempotentBySourceEventId, loadIdempotentCommandResult, toCommandResultSnapshot, } from "../command-support";
import { parseCommandResultSnapshot, throwAuditError } from "../errors";

export interface IngestDomainEventTapDeps {
    unitOfWork: AuditUnitOfWork;
    commandJournal: CommandJournalRepository;
}

export async function ingestDomainEventTap(deps: IngestDomainEventTapDeps, input: IngestDomainEventTapCommand): Promise<AuditCommandResult> {
    const command = ingestDomainEventTapCommandSchema.parse(input);
    const existingCommand = await deps.commandJournal.findByCommandId(command.commandId);
    if (existingCommand && existingCommand.organizationId !== command.organizationId) {
        throwAuditError("AUD_CROSS_TENANT", "command journal organization mismatch");
    }
    const replayByCommand = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
    if (replayByCommand)
        return replayByCommand;
    const existingBySource = await deps.commandJournal.findBySourceEventId(command.sourceEventId);
    if (existingBySource && existingBySource.organizationId !== command.organizationId) {
        throwAuditError("AUD_CROSS_TENANT", "source event organization mismatch");
    }
    const replayBySource = await loadIdempotentBySourceEventId(deps.commandJournal, command.sourceEventId);
    if (replayBySource)
        return replayBySource;
    return deps.unitOfWork.runInTransaction(async (ctx) => {
        const racedByCommand = await ctx.commandJournal.findByCommandId(command.commandId);
        if (racedByCommand) {
            if (racedByCommand.organizationId !== command.organizationId) {
                throwAuditError("AUD_CROSS_TENANT", "command journal organization mismatch");
            }
            const parsed = parseCommandResultSnapshot(racedByCommand.responseSnapshot);
            return auditCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const racedBySource = await ctx.commandJournal.findBySourceEventId(command.sourceEventId);
        if (racedBySource) {
            if (racedBySource.organizationId !== command.organizationId) {
                throwAuditError("AUD_CROSS_TENANT", "source event organization mismatch");
            }
            const parsed = parseCommandResultSnapshot(racedBySource.responseSnapshot);
            return auditCommandResultSchema.parse({ ...parsed, idempotentReplay: true });
        }
        const existingManifest = await ctx.manifests.findBySourceEventId(command.sourceEventId);
        if (existingManifest) {
            if (existingManifest.organizationId !== command.organizationId) {
                throwAuditError("AUD_CROSS_TENANT", "manifest organization mismatch");
            }
            const result = auditCommandResultSchema.parse({
                aggregateId: existingManifest.id,
                revision: 1,
                manifestId: existingManifest.id,
                idempotentReplay: true,
            });
            await ctx.commandJournal.save({
                commandId: command.commandId,
                organizationId: command.organizationId,
                commandName: "ingestDomainEventTap",
                sourceEventId: command.sourceEventId,
                responseSnapshot: toCommandResultSnapshot(result),
            });
            return result;
        }
        const manifestId = `aud_man_${randomUUID()}`;
        const flightRecordId = `aud_rec_${randomUUID()}`;
        const recordedAt = new Date().toISOString();
        const savedManifest = await ctx.manifests.save({
            id: manifestId,
            organizationId: command.organizationId,
            sourceEventId: command.sourceEventId,
            ownerDomain: command.ownerDomain,
            eventType: command.eventType,
            occurredAt: command.occurredAt,
            payloadHash: command.payloadHash,
            recordedAt,
        });
        await ctx.flightRecorderEntries.save({
            id: flightRecordId,
            organizationId: command.organizationId,
            manifestId: savedManifest.id,
            sourceEventId: command.sourceEventId,
            ownerDomain: command.ownerDomain,
            eventType: command.eventType,
            occurredAt: command.occurredAt,
            payloadHash: command.payloadHash,
            recordedAt,
        });
        await ctx.publishEvents([
            createManifestRecordedEvent({
                manifestId: savedManifest.id,
                flightRecordId,
                organizationId: savedManifest.organizationId,
                sourceEventId: savedManifest.sourceEventId,
                ownerDomain: savedManifest.ownerDomain,
                eventType: savedManifest.eventType,
                occurredAt: savedManifest.occurredAt,
                payloadHash: savedManifest.payloadHash,
                recordedAt,
            }),
        ]);
        const result = auditCommandResultSchema.parse({
            aggregateId: savedManifest.id,
            revision: 1,
            manifestId: savedManifest.id,
            flightRecordId,
        });
        await ctx.commandJournal.save({
            commandId: command.commandId,
            organizationId: command.organizationId,
            commandName: "ingestDomainEventTap",
            sourceEventId: command.sourceEventId,
            responseSnapshot: toCommandResultSnapshot(result),
        });
        return result;
    });
}
