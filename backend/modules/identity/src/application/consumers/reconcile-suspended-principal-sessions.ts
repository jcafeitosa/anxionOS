import type { HandlePrincipalSuspendedDeps } from "./handle-principal-suspended";
import { SessionRevocationUnavailableError } from "../../domain/ports/session-revoker";

export interface ReconcileSuspendedPrincipalSessionsResult {
	revokedPrincipalCount: number;
}

/** ANX-236: bootstrap reconciliation when DeliverPolicy.New skips historical events. */
export async function reconcileSuspendedPrincipalSessions(
	deps: HandlePrincipalSuspendedDeps,
): Promise<ReconcileSuspendedPrincipalSessionsResult> {
	const suspended = await deps.principalRepository.listSuspended();
	let revokedPrincipalCount = 0;

	for (const principal of suspended) {
		try {
			await deps.sessionRevoker.revokeAllForAuthUser(principal.authUserId);
			revokedPrincipalCount += 1;
		} catch (error) {
			throw new SessionRevocationUnavailableError(
				`Failed to reconcile sessions for suspended principal ${principal.id}`,
				{ cause: error },
			);
		}
	}

	return { revokedPrincipalCount };
}
