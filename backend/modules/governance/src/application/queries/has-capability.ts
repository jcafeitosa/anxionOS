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
	 * Scope requirement, with three distinct meanings:
	 *
	 * - a `string`: only a grant bound to exactly that scope counts.
	 * - `null`: only an **unscoped** grant counts (platform authority). An
	 *   agency-scoped grant must never satisfy a request that declares no scope
	 *   — that is the privilege escalation this parameter exists to prevent.
	 * - `undefined`: no scope filtering (any grant with the capability). Only
	 *   legitimate for capabilities that are scope-agnostic by contract, such
	 *   as the PLATFORM console token.
	 */
	scopeId?: string | null;
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
 * `scopeId === undefined` preserves the historical "any scope" behaviour;
 * `null` demands platform (unscoped) authority; a string demands that exact
 * scope. Fail-closed: an unknown/absent grant scope never matches `null`.
 */
function matchesScope(
	grant: Grant,
	scopeId: string | null | undefined,
): boolean {
	if (scopeId === undefined) {
		return true;
	}
	if (scopeId === null) {
		return grant.scopeId === null || grant.scopeId === undefined;
	}
	return grant.scopeId === scopeId;
}
