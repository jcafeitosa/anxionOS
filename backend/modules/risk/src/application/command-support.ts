import type { RiskCommandResult } from "@anxionos/contracts/risk";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<RiskCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByIntentHash(
  commandJournal: CommandJournalRepository,
  organizationId: string,
  intentHash: string,
): Promise<RiskCommandResult | null> {
  const existing = await commandJournal.findByIntentHash(organizationId, intentHash);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: RiskCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    policyId: result.policyId,
    checkId: result.checkId,
    permitId: result.permitId,
    checkResult: result.checkResult,
    denyReasonCode: result.denyReasonCode,
  };
}

export function compareDecimalAmounts(left: string, right: string): number {
  const a = Number.parseFloat(left);
  const b = Number.parseFloat(right);
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}
