import { identityPrincipalSuspendedV1PayloadSchema } from "@anxionos/contracts/identity";
import { createSessionRevokedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import {
	type SessionRevocationPort,
	SessionRevocationUnavailableError,
} from "../../domain/ports/session-revoker";

export interface HandlePrincipalSuspendedDeps {
	principalRepository: PrincipalRepository;
	sessionRevoker: SessionRevocationPort;
	/**
	 * When wired, the revoked session references are recorded and
	 * `identity.session.revoked.v1` is published (state + journal + outbox in one
	 * transaction). Without it the consumer still revokes sessions inline.
	 */
	unitOfWork?: IdentityUnitOfWork;
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
	if (!principal.authUserId) {
		// Service principals hold no Better Auth session to revoke.
		return;
	}
	let revokedRefs: Awaited<
		ReturnType<SessionRevocationPort["revokeAllForAuthUser"]>
	>;
	try {
		revokedRefs = await deps.sessionRevoker.revokeAllForAuthUser(
			principal.authUserId,
		);
	} catch (error) {
		throw new SessionRevocationUnavailableError("Failed to revoke sessions", {
			cause: error,
		});
	}
	if (!deps.unitOfWork || revokedRefs.length === 0) {
		return;
	}
	await deps.unitOfWork.runInTransaction(async (context) => {
		const events = [];
		for (const ref of revokedRefs) {
			const recorded = await context.sessionRefRepository.recordRevoked({
				principalId: principal.id,
				externalRefHash: ref.externalRefHash,
				revokedAt: ref.revokedAt,
				reasonCode: parsed.reasonCode,
			});
			events.push(
				createSessionRevokedEvent({
					sessionRefId: recorded.id,
					principalId: principal.id,
					revokedAt: (recorded.revokedAt ?? ref.revokedAt).toISOString(),
					reasonCode: parsed.reasonCode,
				}),
			);
		}
		await context.publishEvents(events);
	});
}
