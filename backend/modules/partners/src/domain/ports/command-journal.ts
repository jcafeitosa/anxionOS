export interface CommandJournalEntry {
	commandId: string;
	organizationId: string;
	commandName: string;
	requestHash: string | null;
	invoiceId?: string;
	responseSnapshot: Record<string, unknown>;
}

export interface CommandJournalRepository {
	findByCommandId(
		organizationId: string,
		commandId: string,
	): Promise<CommandJournalEntry | null>;
	findByInvoiceId(
		organizationId: string,
		invoiceId: string,
	): Promise<CommandJournalEntry | null>;
	save(entry: CommandJournalEntry): Promise<void>;
}
