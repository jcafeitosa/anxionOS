export interface CommandJournalEntry {
	commandId: string;
	organizationId: string;
	commandName: string;
	journalEntryId?: string;
	positionId?: string;
	positionRevision?: number;
	responseSnapshot: Record<string, unknown>;
}
export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalEntry | null>;
	findByJournalEntryId(
		journalEntryId: string,
	): Promise<CommandJournalEntry | null>;
	findByPositionRevision(
		positionId: string,
		revision: number,
	): Promise<CommandJournalEntry | null>;
	save(entry: CommandJournalEntry): Promise<void>;
}
