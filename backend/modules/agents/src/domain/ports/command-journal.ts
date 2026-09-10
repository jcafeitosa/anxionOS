export interface CommandJournalRecord {
	tenantId: string;
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
	createdAt: Date;
}

export interface NewCommandJournalRecord {
	tenantId: string;
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
}

export interface CommandJournalRepository {
	findByCommandId(tenantId: string, commandId: string): Promise<CommandJournalRecord | null>;
	record(entry: NewCommandJournalRecord): Promise<CommandJournalRecord>;
}
