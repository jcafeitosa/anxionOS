import { type Grant, isGrantEffectiveAt } from "../../domain/entities/grant";
import type { GrantRepository } from "../../domain/ports/grant-repository";

export interface HasCapabilityDeps {
	grantRepository: GrantRepository;
}

export interface HasCapabilityInput {
	principalId: string;
	/** Capability token, e.g. `identity.admin`, `console.platform`. */
	capability: string;
	asOf?: Date;
	/**
	 * Scope requirement:
	 *
	 * - a `string`: only a grant bound to exactly that scope counts. Autoridade
	 *   de PLATAFORMA se pede com `PLATFORM_SCOPE_ID` (ANX-462) — nao com escopo
	 *   nulo, que nao existe no modelo (`governance_grants.scope_id` e NOT NULL).
	 * - `undefined`: sem filtro de escopo (qualquer grant com a capability).
	 *   Reservado a capabilities scope-agnosticas *por contrato*; foi o valor
	 *   que, por engano, autorizou um grant de agencia a operar globalmente
	 *   quando o header `x-agency-id` era omitido (achado HIGH do G2).
	 */
	scopeId?: string;
}

/**
 * Generic capability check over the grant owner (`governance`). Callers
 * (HTTP boundaries of any module) must not read grant tables directly; they
 * consume this instead.
 */
export async function hasCapability(
	deps: HasCapabilityDeps,
	input: HasCapabilityInput,
): Promise<boolean> {
	const asOf = input.asOf ?? new Date();
	const grants = await deps.grantRepository.listActiveByPrincipal(
		input.principalId,
	);
	return grants.some(
		(grant) =>
			grant.capability === input.capability &&
			matchesScope(grant, input.scopeId) &&
			isGrantEffectiveAt(grant, asOf),
	);
}

/**
 * Escopo do grant: exato quando pedido, sem filtro quando o chamador nao
 * declara escopo. Nao existe ramo "escopo nulo" — a coluna e NOT NULL e um
 * grant sem escopo nao e representavel (por isso a plataforma tem
 * `PLATFORM_SCOPE_ID`).
 */
function matchesScope(grant: Grant, scopeId: string | undefined): boolean {
	if (scopeId === undefined) {
		return true;
	}
	return grant.scopeId === scopeId;
}
