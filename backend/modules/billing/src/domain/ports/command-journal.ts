export interface CommandJournalEntry {
	commandId: string;
	organizationId: string;
	commandName: string;
	requestHash: string | null;
	usageRecordId?: string;
	webhookEventId?: string;
	responseSnapshot: Record<string, unknown>;
}
export interface CommandJournalRepository {
	findByCommandId(
		organizationId: string,
		commandId: string,
	): Promise<CommandJournalEntry | null>;
	findByUsageRecordId(
		organizationId: string,
		usageRecordId: string,
	): Promise<CommandJournalEntry | null>;
	findByWebhookEventId(
		organizationId: string,
		webhookEventId: string,
	): Promise<CommandJournalEntry | null>;
	save(entry: CommandJournalEntry): Promise<void>;
}
