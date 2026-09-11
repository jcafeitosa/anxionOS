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
	 * When provided, only grants bound to that scope count. Identity principals
	 * are global (D-IDN-023), so agency-scoped callers pass the agency id and
	 * platform-scoped callers omit it.
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
			(input.scopeId === undefined || grant.scopeId === input.scopeId) &&
			isGrantEffectiveAt(grant, asOf),
	);
}
