import { isGrantEffectiveAt } from "../../domain/entities/grant";
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
	 * Escopo exigido, sempre explicito. So' conta grant vinculado exatamente a
	 * este escopo; autoridade de PLATAFORMA se pede com `PLATFORM_SCOPE_ID`
	 * (ANX-462).
	 *
	 * ANX-469: o parametro era opcional e `undefined` significava "qualquer
	 * escopo" — o footgun que autorizou um grant de agencia a operar
	 * globalmente quando o header `x-agency-id` era omitido (achado HIGH do
	 * G2). Obrigatorio no tipo: um chamador que nao declare escopo nao compila,
	 * entao o bypass nao pode voltar por omissao.
	 */
	scopeId: string;
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
			grant.scopeId === input.scopeId &&
			isGrantEffectiveAt(grant, asOf),
	);
}
