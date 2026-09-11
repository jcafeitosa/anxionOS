import { PLATFORM_CONSOLE_CAPABILITY } from "@anxionos/contracts/governance";
import { isGrantEffectiveAt } from "../../domain/entities/grant";
import type { GrantRepository } from "../../domain/ports/grant-repository";

export interface HasPlatformConsoleGrantDeps {
	grantRepository: GrantRepository;
}

/**
 * ANX-166 — PLATFORM console access is an explicit grant, never inferred
 * from agency membership. Capability token: `console.platform`.
 */
export async function hasPlatformConsoleGrant(
	deps: HasPlatformConsoleGrantDeps,
	principalId: string,
	asOf: Date = new Date(),
): Promise<boolean> {
	const grants = await deps.grantRepository.listActiveByPrincipal(principalId);
	return grants.some(
		(grant) =>
			grant.capability === PLATFORM_CONSOLE_CAPABILITY &&
			isGrantEffectiveAt(grant, asOf),
	);
}
