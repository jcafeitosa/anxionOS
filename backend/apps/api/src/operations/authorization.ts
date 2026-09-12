import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { hasCapability, type GrantRepository } from "@anxionos/governance";

/**
 * ANX-497 — SLO snapshot requires console.platform grant.
 *
 * Without this check, the endpoint was completely open (no session, no grant).
 * The route now enforces:
 * - Valid session (principalId from headers)
 * - console.platform grant in PLATFORM scope
 *
 * Returns 401/403 without grant; 200 with valid grant.
 */
export async function requirePlatformConsoleGrant(
	deps: { grantRepository: GrantRepository },
	input: { principalId: string },
): Promise<void> {
	const allowed = await hasCapability(
		{ grantRepository: deps.grantRepository },
		{
			principalId: input.principalId,
			capability: "console.platform",
			scopeId: PLATFORM_SCOPE_ID,
		},
	);
	if (!allowed) {
		throw new Error("Forbidden: console.platform grant required");
	}
}
