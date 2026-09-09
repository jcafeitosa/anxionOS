import type { CapitalCommandResult } from "@anxionos/contracts/capital";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(commandJournal, commandId) {
    const existing = await commandJournal.findByCommandId(commandId);
    if (!existing)
        return null;
    const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
    return { ...parsed, idempotentReplay: true };
}
export function toCommandResultSnapshot(result: CapitalCommandResult): Record<string, unknown> {
    return {
        aggregateId: result.aggregateId,
        revision: result.revision,
        idempotentReplay: result.idempotentReplay ?? false,
        accountId: result.accountId,
        allocationId: result.allocationId,
        reservationId: result.reservationId,
    };
}
