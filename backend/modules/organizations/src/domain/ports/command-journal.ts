export interface CommandJournalRecord {
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
	/**
	 * Fingerprint canonico do payload do comando (S2/ANX-460). Existe para que o
	 * replay de uma `Idempotency-Key` seja valido apenas quando a intencao
	 * (comando + recurso + payload) coincide; sem ele, reusar a chave com outro
	 * payload devolvia 200 `idempotentReplay` sem aplicar. `null` quando o
	 * comando nao o fornece.
	 */
	requestHash: string | null;
	createdAt: Date;
}
export interface NewCommandJournalRecord {
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
	/** Ver `CommandJournalRecord.requestHash`. */
	requestHash?: string | null;
}
export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalRecord | null>;
	/**
	 * Grava o comando. Uma colisao de `command_id` (outra transacao ja' registrou
	 * a MESMA `Idempotency-Key`) NAO pode ser engolida devolvendo a linha alheia:
	 * o efeito desta transacao ja' foi gravado e commitava junto (double-apply).
	 * Implementacoes devem lancar `CommandJournalConflictError`; a aplicacao o
	 * converte em `ORG_DUPLICATE_IDEMPOTENCY` (409), derrubando a transacao do
	 * perdedor.
	 */
	record(entry: NewCommandJournalRecord): Promise<CommandJournalRecord>;
}

/** Colisao de `command_id` detectada na gravacao do journal. */
export class CommandJournalConflictError extends Error {
	readonly commandId: string;

	constructor(commandId: string) {
		super(`Command journal already has an entry for ${commandId}`);
		this.name = "CommandJournalConflictError";
		this.commandId = commandId;
	}
}
