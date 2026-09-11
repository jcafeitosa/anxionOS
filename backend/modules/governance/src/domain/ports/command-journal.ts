export interface CommandJournalRecord {
	commandId: string;
	commandName: string;
	aggregateId: string;
	aggregateType: string;
	revision: number;
	responseSnapshot: Record<string, unknown> | null;
	/**
	 * Fingerprint canonico do payload do comando (ANX-476/A do G2). Existe para
	 * os comandos cujo agregado NAO reconstroi o payload inteiro — a transicao de
	 * autonomia grava `transitionKind`/`actorPrincipalId`/`reason` apenas nos
	 * eventos, entao sem este campo um reuso divergente da key passava como
	 * replay 200. `null` quando o comando nao o fornece.
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
	/** Ver `CommandJournalRecord.requestHash`. Opcional: nem todo comando precisa. */
	requestHash?: string | null;
}

export interface CommandJournalRepository {
	findByCommandId(commandId: string): Promise<CommandJournalRecord | null>;
	/**
	 * Grava o comando. ANX-476/ANX-475 (FURO 1 HIGH do G5 r2): uma colisao de
	 * `command_id` (outra transacao ja' registrou a MESMA `Idempotency-Key`) NAO
	 * pode ser engolida devolvendo a linha alheia — o efeito desta transacao ja'
	 * foi gravado e commitava junto (double-apply). Implementacoes devem lancar
	 * `CommandJournalConflictError`; a aplicacao o converte no codigo de
	 * duplicata do modulo, derrubando a transacao do perdedor.
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
