import { SessionRevocationUnavailableError } from "../../domain/ports/session-revoker";
import type { HandlePrincipalSuspendedDeps } from "./handle-principal-suspended";

export interface ReconcileSuspendedPrincipalSessionsResult {
	revokedPrincipalCount: number;
	/** Principals with no Better Auth user (service principals) — nothing to revoke. */
	skippedServicePrincipalCount: number;
}

/**
 * ANX-236: bootstrap reconciliation when `DeliverPolicy.New` skips historical
 * events. Covers every principal that is no longer ACTIVE (suspended or
 * revoked), so a missed event cannot leave a live session behind.
 */
export async function reconcileSuspendedPrincipalSessions(
	deps: HandlePrincipalSuspendedDeps,
): Promise<ReconcileSuspendedPrincipalSessionsResult> {
	const principals = await deps.principalRepository.listAll();
	const inactive = principals.filter(
		(principal) => principal.status !== "active",
	);
	let revokedPrincipalCount = 0;
	let skippedServicePrincipalCount = 0;

	for (const principal of inactive) {
		if (!principal.authUserId) {
			skippedServicePrincipalCount += 1;
			continue;
		}
		try {
			await deps.sessionRevoker.revokeAllForAuthUser(principal.authUserId);
			revokedPrincipalCount += 1;
		} catch (error) {
			throw new SessionRevocationUnavailableError(
				`Failed to reconcile sessions for principal ${principal.id}`,
				{ cause: error },
			);
		}
	}

	return { revokedPrincipalCount, skippedServicePrincipalCount };
}
