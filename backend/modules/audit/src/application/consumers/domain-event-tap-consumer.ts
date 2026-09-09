import { randomUUID } from "node:crypto";
import {
  mapDomainEventTapToAuditInput,
  type AuditCommandResult,
  type DomainEventTapBridge,
} from "@anxionos/contracts/audit";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AuditUnitOfWork } from "../../domain/ports/audit-unit-of-work";
import { ingestDomainEventTap } from "../commands/ingest-domain-event-tap";

export interface DomainEventTapConsumerDeps {
  unitOfWork: AuditUnitOfWork;
  commandJournal: CommandJournalRepository;
}

export function createDomainEventTapConsumer(deps: DomainEventTapConsumerDeps): {
  handle(tap: DomainEventTapBridge): Promise<AuditCommandResult>;
} {
  return {
    async handle(tap: DomainEventTapBridge) {
      const command = mapDomainEventTapToAuditInput(tap, randomUUID());
      return ingestDomainEventTap(
        { unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
        {
          commandId: command.commandId,
          organizationId: command.organizationId,
          sourceEventId: command.sourceEventId,
          ownerDomain: command.ownerDomain,
          eventType: command.eventType,
          occurredAt: command.occurredAt,
          payloadHash: command.payloadHash,
        },
      );
    },
  };
}
