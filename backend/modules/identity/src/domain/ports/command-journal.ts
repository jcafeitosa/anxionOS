/**
 * Per-domain idempotency ledger (same pattern as `governance_command_journal`).
 * `commandId` is the materialized `Idempotency-Key`; the stored response
 * snapshot is replayed instead of re-executing the command (R04).
 */
export interface CommandJournalRecord {
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
	createdAt: Date;
}

export interface NewCommandJournalRecord {
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
}

export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalRecord | null>;
	record(entry: NewCommandJournalRecord): Promise<CommandJournalRecord>;
}
