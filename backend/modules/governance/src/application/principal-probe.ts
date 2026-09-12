import type { PrincipalLookup } from "../domain/ports/principal-lookup";
import { throwGovernanceError } from "./errors";

/**
 * ANX-477 — resultado da sonda de existencia de principal rodada ANTES de
 * `runInTransaction`.
 *
 * O comando segura uma conexao do pool enquanto a transacao esta' aberta. Se a
 * consulta de principal acontece dentro dela, o comando precisa de uma SEGUNDA
 * conexao do MESMO pool: com N chamadas concorrentes proximas de `pool.max`
 * (default 10) as transacoes esperam por uma conexao que so' seria liberada
 * quando elas mesmas terminassem — esgotamento do pool sob rajada. Resolver o
 * principal antes de abrir a transacao elimina a segunda conexao; a existencia
 * do principal e' dado que nao muda dentro da transacao.
 */
export type PrincipalExistenceProbe =
	| { readonly ok: true; readonly exists: boolean }
	| { readonly ok: false; readonly error: unknown };

/**
 * Executa a sonda de forma TOLERANTE: nunca lanca. O erro e' capturado para ser
 * reaplicado DENTRO da transacao, DEPOIS do replay.
 *
 * Motivo do cuidado: os comandos sao idempotentes e um replay (mesma
 * `commandId`, journal ja' gravado) devolve o resultado journalado sem julgar
 * estado mutavel. Se a sonda lancasse aqui, um replay com a identidade
 * indisponivel viraria erro de um comando que JA' foi aplicado — regressao
 * direta na garantia fechada pela ANX-476.
 */
export async function probePrincipalExistence(
	principalLookup: PrincipalLookup,
	principalId: string,
): Promise<PrincipalExistenceProbe> {
	try {
		return { ok: true, exists: await principalLookup.exists(principalId) };
	} catch (error) {
		return { ok: false, error };
	}
}

/**
 * Aplica o resultado da sonda DEPOIS de `loadIdempotentCommandResult` e do
 * early-return do replay: um comando NOVO falha exatamente como antes
 * (`GOV_PRINCIPAL_NOT_FOUND` quando o principal nao existe, ou o erro original
 * da identidade quando o servico esta' indisponivel); um replay ja' retornou o
 * resultado journalado antes de chegar aqui.
 */
export function applyPrincipalExistenceProbe(
	probe: PrincipalExistenceProbe,
	principalId: string,
): void {
	if (!probe.ok) {
		throw probe.error;
	}
	if (!probe.exists) {
		throwGovernanceError(
			"GOV_PRINCIPAL_NOT_FOUND",
			`Principal ${principalId} not found`,
		);
	}
}
