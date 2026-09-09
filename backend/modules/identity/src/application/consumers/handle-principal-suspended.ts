import { identityPrincipalSuspendedV1PayloadSchema } from "@anxionos/contracts/identity";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { SessionRevoker } from "../../domain/ports/session-revoker";
import { SessionRevocationUnavailableError } from "../../domain/ports/session-revoker";

export interface HandlePrincipalSuspendedDeps {
	principalRepository: PrincipalRepository;
	sessionRevoker: SessionRevoker;
}

export async function handlePrincipalSuspended(
	deps: HandlePrincipalSuspendedDeps,
	payload: unknown,
): Promise<void> {
	const parsed = identityPrincipalSuspendedV1PayloadSchema.parse(payload);
	const principal = await deps.principalRepository.findById(parsed.principalId);
	if (!principal) {
		return;
	}
	if (principal.status !== "suspended") {
		return;
	}
	try {
		await deps.sessionRevoker.revokeAllForAuthUser(principal.authUserId);
	} catch (error) {
		throw new SessionRevocationUnavailableError("Failed to revoke sessions", {
			cause: error,
		});
	}
}
