import { createHash } from "node:crypto";
import type { CommandResult } from "@anxionos/contracts/organizations";
import { AgencyRevisionConflictError } from "../domain/errors/agency-errors";
import {
	type MembershipConflictConstraint,
	MembershipRevisionConflictError,
	MembershipUniquenessConflictError,
} from "../domain/errors/membership-errors";
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
	 *
	 * **Obrigatorio** (G4-F4/ANX-460): era opcional e um comando futuro que o
	 * omitisse perderia o binding de intencao em silencio, voltando a permitir
	 * replay com payload divergente. Todos os 8 comandos o fornecem.
	 */
	requestHash: string;
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
		// F-06 do G5: a mensagem NAO nomeia o comando alheio. O namespace de
		// `Idempotency-Key` e' global (sem tenant_id — ANX-480), entao nomear o
		// comando vazaria o nome de um comando de OUTRO tenant para quem
		// adivinhasse a key. O codigo em `details.code` ja' basta para depurar.
		throwOrganizationError(
			"ORG_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already used by another command`,
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
	// `requestHash` e' obrigatorio na intencao, entao a comparacao e' sempre feita
	// (o antigo curto-circuito `!== undefined` era inalcancavel e mascararia um
	// comando que omitisse o hash — G4-F4/ANX-460). Linha pre'-migration 0006 tem
	// `requestHash = null` e falha aqui de proposito: fail-closed.
	if (existing.requestHash !== intent.requestHash) {
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
 * Mensagem unica do conflito de convite pendente. O caminho **sequencial**
 * (pre-check em `invite-member`) e o de **corrida** (indice parcial) precisam
 * dizer a MESMA coisa: antes divergiam (`Pending invite already exists for
 * {email} in agency {id}` vs `There is already a pending invite for this email
 * in this agency`) — mesmo codigo, textos diferentes, drift observavel de
 * contrato (LOW-1 de G2/G3/G4 na ANX-460).
 */
export const PENDING_INVITE_CONFLICT_MESSAGE =
	"There is already a pending invite for this email in this agency";

/**
 * Traduz o conflito de unicidade de membership no codigo institucional certo,
 * derivado da CONSTRAINT: "convite pendente", "vinculo ativo" e "outro owner
 * ativo" sao conflitos diferentes e o cliente precisa saber qual (F-2 do G4 /
 * LOW do G2). Compartilhado entre o wrapper de gravacao e `acceptInviteByToken`,
 * que trata o conflito de **revisao** de forma propria (404 opaco) mas deve usar
 * ESTE mapeamento para o de **unicidade** (G5 LOW-2). O indice de owner unico e'
 * hoje inalcancavel pela API, mas o mapeamento e' explicito.
 */
/**
 * Mapa **exaustivo** de constraint → resposta institucional. Exaustivo de
 * proposito: com um `if/else` encadeado, uma 4a constraint adicionada a'
 * allowlist cairia em **silencio** na mensagem de "vinculo ativo" — o mesmo
 * drift que a mensagem unica combateu (G2 INFO + F-G4-1 do G4 na ANX-460). O
 * tipo `Record<MembershipConflictConstraint, ...>` garante em compilacao que
 * toda constraint da allowlist tem resposta propria.
 */
const MEMBERSHIP_CONFLICT_RESPONSES: Record<
	MembershipConflictConstraint,
	{ code: "ORG_OWNER_REQUIRED" | "ORG_MEMBERSHIP_EXISTS"; message: string }
> = {
	organizations_memberships_one_owner_active_uidx: {
		code: "ORG_OWNER_REQUIRED",
		message: "This agency already has an active owner",
	},
	organizations_memberships_agency_email_invited_uidx: {
		code: "ORG_MEMBERSHIP_EXISTS",
		message: PENDING_INVITE_CONFLICT_MESSAGE,
	},
	organizations_memberships_agency_principal_active_uidx: {
		code: "ORG_MEMBERSHIP_EXISTS",
		message: "Target principal already has an active membership in this agency",
	},
};

/**
 * Traduz o conflito de unicidade de membership no codigo institucional certo,
 * derivado da CONSTRAINT ("convite pendente", "vinculo ativo" e "outro owner
 * ativo" sao conflitos diferentes e o cliente precisa saber qual). Compartilhado
 * entre o wrapper de gravacao e `acceptInviteByToken`, que trata o conflito de
 * **revisao** de forma propria (404 opaco) mas usa ESTE mapeamento para o de
 * **unicidade** (G5 LOW-2).
 */
export function throwMembershipUniquenessConflict(
	error: MembershipUniquenessConflictError,
): never {
	const response = MEMBERSHIP_CONFLICT_RESPONSES[error.constraint];
	throwOrganizationError(response.code, response.message, { cause: error });
}

/**
 * Executa uma gravacao de agregado traduzindo os conflitos de dominio em codigos
 * institucionais:
 *
 * - **corrida de revisao** → `ORG_REVISION_CONFLICT` (409). Sem isto o erro cru
 *   vazava ate' o boundary e o perdedor recebia **500** — os 8 modulos que ja'
 *   tem `<MOD>_REVISION_CONFLICT` sempre responderam 409 (S4a/S4c, ANX-460);
 * - **vinculo ativo duplicado** → `ORG_MEMBERSHIP_EXISTS` (409). O repositorio
 *   converte a violacao `23505` dos indices parciais de membership em
 *   `MembershipUniquenessConflictError`; sem este mapeamento o `23505` cru subia
 *   como 500 (F-01 dos gates G3/G4/G5: alcancavel pela transicao
 *   `revoked -> active` e pela corrida de convites duplicados).
 *
 * Nao use em `accept-invite-by-token`: ali o conflito de revisao e' mapeado para
 * um 404 opaco de proposito, para nao confirmar a existencia/consumo de um token.
 * O conflito de vinculo ativo, esse, vale para os dois (ANX-482).
 */

export async function saveWithRevisionConflictMapping<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof MembershipUniquenessConflictError) {
			throwMembershipUniquenessConflict(error);
		}
		if (
			error instanceof MembershipRevisionConflictError ||
			error instanceof AgencyRevisionConflictError
		) {
			throwOrganizationError(
				"ORG_REVISION_CONFLICT",
				"Resource was modified concurrently; reload and retry",
				{ cause: error },
			);
		}
		throw error;
	}
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
