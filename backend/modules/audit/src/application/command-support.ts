import type { AuditCommandResult } from "@anxionos/contracts/audit";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<AuditCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentBySourceEventId(
  commandJournal: CommandJournalRepository,
  sourceEventId: string,
): Promise<AuditCommandResult | null> {
  const existing = await commandJournal.findBySourceEventId(sourceEventId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: AuditCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    manifestId: result.manifestId,
    flightRecordId: result.flightRecordId,
  };
}
