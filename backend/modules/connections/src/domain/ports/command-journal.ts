export interface CommandJournalRecord {
	commandId: string;
	organizationId: string;
	commandName: string;
	responseSnapshot: Record<string, unknown>;
}

export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalRecord | null>;
	save(record: CommandJournalRecord): Promise<void>;
}
