import { SessionRevocationUnavailableError } from "../../domain/ports/session-revoker";
import { recordRevokedSessionRefs } from "../commands/principal-transition";
import type { HandlePrincipalSuspendedDeps } from "./handle-principal-suspended";

export interface ReconcileSuspendedPrincipalSessionsResult {
	/** Principals that had at least one live session revoked in this pass. */
	revokedPrincipalCount: number;
	/** Principals with no Better Auth user (service principals) — nothing to revoke. */
	skippedServicePrincipalCount: number;
}

/**
 * ANX-236: bootstrap reconciliation when `DeliverPolicy.New` skips historical
 * events. Covers every principal that is no longer ACTIVE (suspended or
 * revoked), so a missed event cannot leave a live session behind.
 *
 * Sessions are revoked in the authentication layer and then recorded here in
 * the same shape as the inline path, so reconciliation leaves the same audit
 * trail (`SessionRef` rows + `identity.session.revoked.v1`).
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
		let revokedRefs: Awaited<
			ReturnType<
				HandlePrincipalSuspendedDeps["sessionRevoker"]["revokeAllForAuthUser"]
			>
		>;
		try {
			revokedRefs = await deps.sessionRevoker.revokeAllForAuthUser(
				principal.authUserId,
			);
		} catch (error) {
			throw new SessionRevocationUnavailableError(
				`Failed to reconcile sessions for principal ${principal.id}`,
				{ cause: error },
			);
		}
		if (revokedRefs.length === 0) {
			continue;
		}
		revokedPrincipalCount += 1;
		if (!deps.unitOfWork) {
			continue;
		}
		const reasonCode =
			principal.status === "revoked"
				? (principal.revocationReason ?? undefined)
				: (principal.suspensionReason ?? undefined);
		await deps.unitOfWork.runInTransaction(async (context) => {
			const events = await recordRevokedSessionRefs(context, {
				principalId: principal.id,
				revokedRefs,
				reasonCode,
			});
			await context.publishEvents(events);
		});
	}

	return { revokedPrincipalCount, skippedServicePrincipalCount };
}
