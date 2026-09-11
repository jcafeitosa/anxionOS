import { createHash } from "node:crypto";
import type { CommandResult } from "@anxionos/contracts/organizations";
import {
	CommandJournalConflictError,
	type CommandJournalRepository,
	type NewCommandJournalRecord,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwOrganizationError } from "./errors";

/**
 * Intencao por tras da `Idempotency-Key`. Uma chave so' pode ser **repetida**
 * para o MESMO comando contra o MESMO recurso/payload; reuso divergente e'
 * conflito (409 `ORG_DUPLICATE_IDEMPOTENCY`), nao replay. Espelha o mecanismo
 * provado no governance (`GovernanceCommandIntent`, ANX-457/F1 do G5).
 */
export interface OrganizationCommandIntent {
	commandName: string;
	/** Id esperado do agregado, quando o comando o conhece. */
	aggregateId?: string;
	/** Validacao alternativa (comandos que CRIAM o agregado). */
	matchesAggregate?: (aggregateId: string) => Promise<boolean>;
	/**
	 * Fingerprint canonico do payload do comando. Necessario para comandos cujo
	 * agregado NAO reconstroi a intencao inteira (ex.: `UpdateAgencyMarkets`
	 * distingue dois payloads no MESMO agencyId) e para que o replay continue
	 * valido depois de o agregado mudar de estado (comparar estado quebraria o
	 * retry legitimo).
	 */
	requestHash?: string;
}

async function assertIntentMatches(
	existing: {
		commandName: string;
		aggregateId: string;
		requestHash: string | null;
	},
	intent: OrganizationCommandIntent,
	commandId: string,
): Promise<void> {
	if (existing.commandName !== intent.commandName) {
		throwOrganizationError(
			"ORG_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already used by ${existing.commandName}`,
		);
	}
	if (
		intent.aggregateId !== undefined &&
		existing.aggregateId !== intent.aggregateId
	) {
		throwOrganizationError(
			"ORG_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied to another resource`,
		);
	}
	if (intent.matchesAggregate) {
		const matches = await intent.matchesAggregate(existing.aggregateId);
		if (!matches) {
			throwOrganizationError(
				"ORG_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${commandId} was already applied to another resource`,
			);
		}
	}
	if (
		intent.requestHash !== undefined &&
		existing.requestHash !== intent.requestHash
	) {
		throwOrganizationError(
			"ORG_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied with a different payload`,
		);
	}
}

/**
 * Fingerprint canonico de um payload de comando: SHA-256 de um JSON com chaves
 * ordenadas, onde uma entrada `undefined` e' OMITIDA (ausente e `undefined` sao
 * a mesma coisa — `null` continua distinto). Mesma implementacao do governance,
 * para que a comparacao nao dependa da ordem de insercao das chaves.
 */
export function hashCommandPayload(payload: Record<string, unknown>): string {
	return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function canonicalJson(value: unknown): string {
	if (value === undefined || value === null) {
		return "null";
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
		return `{${entries
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	intent: OrganizationCommandIntent,
): Promise<CommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	await assertIntentMatches(existing, intent, commandId);
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

/**
 * Grava o journal convertendo a colisao de `command_id` no codigo institucional
 * de duplicata. O replay legitimo e' resolvido ANTES (por
 * `loadIdempotentCommandResult`, com validacao de intencao). Chegar aqui com a
 * key ja' registrada significa que outra transacao commitou o MESMO comando
 * concorrentemente: o conflito derruba ESTA transacao (sem double-apply) e o
 * chamador recebe 409.
 */
export async function recordOrganizationCommand(
	context: { commandJournal: CommandJournalRepository },
	entry: NewCommandJournalRecord,
): Promise<void> {
	try {
		await context.commandJournal.record(entry);
	} catch (error) {
		if (error instanceof CommandJournalConflictError) {
			throwOrganizationError(
				"ORG_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${entry.commandId} was already recorded by another command`,
			);
		}
		throw error;
	}
}

export function toCommandResultSnapshot(
	result: CommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
	};
}
