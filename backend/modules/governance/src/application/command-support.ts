import { createHash } from "node:crypto";
import type { GovernanceCommandResult } from "@anxionos/contracts/governance";
import {
	CommandJournalConflictError,
	type CommandJournalRepository,
	type NewCommandJournalRecord,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwGovernanceError } from "./errors";

/**
 * Intencao por tras da `Idempotency-Key`. Uma chave so' pode ser **repetida**
 * para o MESMO comando contra o MESMO recurso; reuso divergente e' conflito, nao
 * replay (ANX-457/F1 do G5: antes o reuso devolvia 200 `idempotentReplay` **sem
 * aplicar** a operacao — mesma classe do achado A1/A2 do identity).
 */
export interface GovernanceCommandIntent {
	commandName: string;
	/** Id esperado do agregado, quando o comando o conhece. */
	aggregateId?: string;
	/** Validacao alternativa (comandos que CRIAM o agregado). */
	matchesAggregate?: (aggregateId: string) => Promise<boolean>;
	/**
	 * ANX-476/A (MEDIUM do G2) — fingerprint canonico do payload, para comandos
	 * cujo agregado NAO reconstroi a intencao inteira. O `TransitionAutonomyLevel`
	 * e' o caso: `transitionKind`, `actorPrincipalId` e `reason` vao apenas para o
	 * evento, entao sem o fingerprint um reuso divergente da key passava como
	 * replay 200. Compare sempre pelo hash, nunca pela lista de campos a mao — e'
	 * o que impede a comparacao de ficar fragil a medida que o schema muda.
	 */
	requestHash?: string;
}

async function assertIntentMatches(
	existing: {
		commandName: string;
		aggregateId: string;
		requestHash: string | null;
	},
	intent: GovernanceCommandIntent,
	commandId: string,
): Promise<void> {
	if (existing.commandName !== intent.commandName) {
		throwGovernanceError(
			"GOV_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already used by ${existing.commandName}`,
		);
	}
	if (
		intent.aggregateId !== undefined &&
		existing.aggregateId !== intent.aggregateId
	) {
		throwGovernanceError(
			"GOV_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied to another resource`,
		);
	}
	if (intent.matchesAggregate) {
		const matches = await intent.matchesAggregate(existing.aggregateId);
		if (!matches) {
			throwGovernanceError(
				"GOV_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${commandId} was already applied to another resource`,
			);
		}
	}
	if (
		intent.requestHash !== undefined &&
		existing.requestHash !== intent.requestHash
	) {
		throwGovernanceError(
			"GOV_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied with a different payload`,
		);
	}
}

/**
 * Fingerprint canonico de um payload de comando: SHA-256 de um JSON com chaves
 * ordenadas, onde `undefined` e `null` produzem o MESMO resultado (`"null"`,
 * ver `canonicalJson`) — ou seja, "ausente", `undefined` e `null` sao a mesma
 * intencao para efeito de idempotencia. Quem precisar distingui-los tem de
 * normalizar ANTES (ex.: `?? null` no call-site, como os comandos fazem).
 * Duas coisas que o `JSON.stringify` cru nao garante: (a) a mesma intencao com chaves em ordem diferente produz o
 * mesmo hash; (b) a ordem de insercao das chaves nao altera o resultado. Arrays
 * sao hasheados NA ORDEM dada: se a ordem nao for semantica (ex.: o
 * `capabilitySubset` da delegacao), o comando precisa normalizar antes de
 * chamar — a delegacao prefere comparar o conjunto com `capabilitySubsetsEqual`
 * a hashear.
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
	intent: GovernanceCommandIntent,
): Promise<GovernanceCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	await assertIntentMatches(existing, intent, commandId);
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

/**
 * ANX-476/ANX-475 (FURO 1 HIGH do G5 r2) — grava o journal convertendo a colisao
 * de `command_id` no codigo institucional de duplicata.
 *
 * O replay legitimo e' resolvido ANTES (por `loadIdempotentCommandResult`, com
 * validacao de intencao). Chegar aqui com a key ja' registrada significa que
 * outra transacao commitou o MESMO comando concorrentemente: nao ha find-then-
 * insert que devolva a linha alheia; o conflito derruba ESTA transacao, entao o
 * agregado duplicado nao persiste (sem double-apply) e o chamador recebe 409.
 */
export async function recordGovernanceCommand(
	context: { commandJournal: CommandJournalRepository },
	entry: NewCommandJournalRecord,
): Promise<void> {
	try {
		await context.commandJournal.record(entry);
	} catch (error) {
		if (error instanceof CommandJournalConflictError) {
			throwGovernanceError(
				"GOV_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${entry.commandId} was already recorded by another command`,
			);
		}
		throw error;
	}
}

export function toCommandResultSnapshot(
	result: GovernanceCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		authorityEpoch: result.authorityEpoch,
	};
}
