import {
	PLATFORM_CONSOLE_CAPABILITY,
	PLATFORM_SCOPE_ID,
} from "@anxionos/contracts/governance";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import { hasCapability } from "./has-capability";

export interface HasPlatformConsoleGrantDeps {
	grantRepository: GrantRepository;
}

/**
 * ANX-166 — PLATFORM console access is an explicit grant, never inferred
 * from agency membership. Capability token: `console.platform`.
 *
 * ANX-462 — o grant precisa estar no escopo PLATAFORMA. Antes bastava a
 * capability, entao um grant agency-scoped de `console.platform` (emitivel por
 * um operador de agencia) abria o console de plataforma.
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
		scopeId: PLATFORM_SCOPE_ID,
	});
}
