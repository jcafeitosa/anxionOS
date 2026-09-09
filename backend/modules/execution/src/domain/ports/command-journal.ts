export interface CommandJournalEntry {
    commandId: string;
    organizationId: string;
    commandName: string;
    clientOrderId?: string;
    responseSnapshot: Record<string, unknown>;
}
export interface CommandJournalRepository {
    findByCommandId(commandId: string): Promise<CommandJournalEntry | null>;
    findByClientOrderId(organizationId: string, clientOrderId: string): Promise<CommandJournalEntry | null>;
    save(entry: CommandJournalEntry): Promise<void>;
}
