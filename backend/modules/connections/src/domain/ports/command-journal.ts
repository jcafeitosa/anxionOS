export interface CommandJournalRecord {
	commandId: string;
	organizationId: string;
	commandName: string;
	requestHash: string | null;
	responseSnapshot: Record<string, unknown>;
}

export interface CommandJournalRepository {
	findByCommandId(
		organizationId: string,
		commandId: string,
	): Promise<CommandJournalRecord | null>;
	save(record: CommandJournalRecord): Promise<void>;
}
