export interface CommandJournalEntry {
	commandId: string;
	organizationId: string;
	commandName: string;
	invoiceId?: string;
	responseSnapshot: Record<string, unknown>;
}

export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalEntry | null>;
	findByInvoiceId(invoiceId: string): Promise<CommandJournalEntry | null>;
	save(entry: CommandJournalEntry): Promise<void>;
}
