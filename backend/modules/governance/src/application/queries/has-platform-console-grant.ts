import { PLATFORM_CONSOLE_CAPABILITY } from "@anxionos/contracts/governance";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import { hasCapability } from "./has-capability";

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
	return hasCapability(deps, {
		principalId,
		capability: PLATFORM_CONSOLE_CAPABILITY,
		asOf,
	});
}
