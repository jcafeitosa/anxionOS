import type { SessionRefDto } from "@anxionos/contracts/identity";
import type { SessionRefRepository } from "../../domain/ports/session-ref-repository";
import { toSessionRefDto } from "../presenters";

/** Sessions of a principal (active and revoked), newest first. */
export async function listSessions(
	deps: { sessionRefRepository: SessionRefRepository },
	principalId: string,
): Promise<SessionRefDto[]> {
	const sessions =
		await deps.sessionRefRepository.listByPrincipalId(principalId);
	return sessions.map(toSessionRefDto);
}

/**
 * Revocation audit trail across principals, optionally bounded by a window.
 * Backs the `identity.session.list-revoked` capability.
 */
export async function listRevokedSessions(
	deps: { sessionRefRepository: SessionRefRepository },
	since?: Date,
): Promise<SessionRefDto[]> {
	const revoked = await deps.sessionRefRepository.listRevoked(since);
	return revoked.map(toSessionRefDto);
}
