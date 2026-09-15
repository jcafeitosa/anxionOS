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

/** Colisao de `command_id` detectada durante uma insercao atomica. */
export class CommandJournalConflictError extends Error {
	readonly commandId: string;

	constructor(commandId: string) {
		super(`Command journal already has an entry for ${commandId}`);
		this.name = "CommandJournalConflictError";
		this.commandId = commandId;
	}
}
