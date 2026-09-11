import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { identityCommandResultSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import {
	createPrincipalRevokedEvent,
	createPrincipalSuspendedEvent,
	createServiceCredentialRevokedEvent,
	createServiceIdentityRevokedEvent,
	createSessionRevokedEvent,
} from "../../domain/events/identity-events";
import {
	canTransition,
	revisionMatches,
} from "../../domain/policies/principal-lifecycle";
import type { IdentityTransactionContext } from "../../domain/ports/identity-unit-of-work";
import {
	type RevokedSessionRef,
	type SessionRevocationPort,
	SessionRevocationUnavailableError,
} from "../../domain/ports/session-revoker";
import { parseCommandResultSnapshot, throwIdentityError } from "../errors";
import { findIdempotentCommand, recordIdempotentCommand } from "../idempotency";

export type PrincipalTransitionTarget = "suspended" | "revoked";

export interface PrincipalTransitionParams {
	principalId: string;
	target: PrincipalTransitionTarget;
	reasonCode: string;
	at: Date;
	expectedRevision?: number;
	/**
	 * Idempotency key of the calling command plus its name. Passed in so that
	 * (a) a concurrent execution of the SAME command is classified as a replay
	 * instead of a lost-update conflict, and (b) reuse of the same key by a
	 * DIFFERENT command is rejected rather than silently replayed.
	 */
	commandId?: string;
	commandName: string;
	/**
	 * ANX-235: when provided, sessions are revoked inline so a disabled NATS
	 * consumer cannot leave an authenticated window open. A failure aborts the
	 * transaction (fail-closed): the principal keeps its previous status and the
	 * caller sees `SessionRevocationUnavailableError`.
	 */
	sessionRevocation?: SessionRevocationPort;
}

/**
 * Shared lifecycle transition used by suspend and revoke so the rules exist in
 * one place: revision guard, terminal REVOKED, cascade to service identities,
 * their credentials and session references.
 */
export async function transitionPrincipalState(
	context: IdentityTransactionContext,
	params: PrincipalTransitionParams,
): Promise<Principal> {
	const current = await context.principalRepository.findById(
		params.principalId,
	);
	if (!current) {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	// Idempotent: repeating the same transition is a no-op with no second event.
	if (current.status === params.target) {
		return current;
	}
	if (!revisionMatches(current.revision, params.expectedRevision)) {
		throwIdentityError(
			"IDN_REVISION_CONFLICT",
			`Principal revision ${current.revision} does not match expected ${params.expectedRevision}`,
		);
	}
	if (!canTransition(current.status, params.target)) {
		throwIdentityError(
			current.status === "revoked"
				? "IDN_PRINCIPAL_REVOKED"
				: "IDN_PRINCIPAL_NOT_SUSPENDED",
			`Principal in status ${current.status} cannot transition to ${params.target}`,
		);
	}
	const transitioned =
		params.target === "suspended"
			? await context.principalRepository.markSuspended(
					current.id,
					params.reasonCode,
					params.at,
					params.expectedRevision,
				)
			: await context.principalRepository.revoke(
					current.id,
					params.reasonCode,
					params.at,
					params.expectedRevision,
				);
	if (!transitioned) {
		// The UPDATE matched no row. Two very different causes:
		//   (a) a concurrent execution of the SAME commandId already applied —
		//       in that case the winner has committed (otherwise this UPDATE
		//       would still block on its row lock), so the journal entry is
		//       visible and the correct outcome is a replay, not a conflict;
		//   (b) a different command changed the principal — a real conflict.
		if (params.commandId) {
			const journaled = await findIdempotentCommand(context.commandJournal, {
				commandId: params.commandId,
				commandName: params.commandName,
				aggregateId: current.id,
			});
			if (journaled) {
				const applied = await context.principalRepository.findById(current.id);
				if (applied) {
					return applied;
				}
			}
		}
		throwIdentityError(
			"IDN_REVISION_CONFLICT",
			"Principal changed concurrently during transition",
		);
	}

	const events: DomainEventEnvelope[] = [
		params.target === "suspended"
			? createPrincipalSuspendedEvent({
					principalId: transitioned.id,
					reasonCode: params.reasonCode,
					suspendedAt: params.at.toISOString(),
					revision: transitioned.revision,
				})
			: createPrincipalRevokedEvent({
					principalId: transitioned.id,
					reasonCode: params.reasonCode,
					revokedAt: params.at.toISOString(),
					revision: transitioned.revision,
				}),
	];

	const activeServiceIdentities =
		await context.serviceIdentityRepository.findActiveByPrincipalId(
			transitioned.id,
		);

	// SUSPENDED is reversible (R03); REVOKED is terminal. The cascade differs:
	//   suspend → every active credential is revoked (a secret must not outlive
	//             the suspension) but the service identity survives, so the
	//             principal can issue new credentials after reactivation.
	//   revoke  → the service identity is revoked too, and with it the credentials.
	for (const serviceIdentity of activeServiceIdentities) {
		if (params.target === "revoked") {
			const revokedIdentity = await context.serviceIdentityRepository.revoke(
				serviceIdentity.id,
				params.at,
			);
			if (!revokedIdentity) {
				continue;
			}
			events.push(
				createServiceIdentityRevokedEvent({
					serviceIdentityId: revokedIdentity.id,
					principalId: revokedIdentity.principalId,
					revokedAt: params.at.toISOString(),
				}),
			);
		}
		const revokedCredentials =
			await context.serviceCredentialRepository.revokeActiveByServiceIdentityId(
				serviceIdentity.id,
				params.at,
			);
		for (const credential of revokedCredentials) {
			events.push(
				createServiceCredentialRevokedEvent({
					credentialId: credential.id,
					serviceIdentityId: credential.serviceIdentityId,
					revokedAt: params.at.toISOString(),
				}),
			);
		}
	}

	if (params.sessionRevocation && transitioned.authUserId) {
		let revokedRefs: Awaited<
			ReturnType<SessionRevocationPort["revokeAllForAuthUser"]>
		>;
		try {
			// NOTE: this deletes sessions in the authentication layer, on a
			// different connection, inside this transaction. That is deliberate
			// (ANX-235 fail-closed: a disabled consumer must not leave an open
			// session) and has a known consequence: if this transaction rolls
			// back afterwards, the sessions are already gone and no SessionRef or
			// event records it. Documented in
			// docs/orchestration/modules/identity/R11-lifecycle-decisions.md.
			revokedRefs = await params.sessionRevocation.revokeAllForAuthUser(
				transitioned.authUserId,
			);
		} catch (error) {
			throw new SessionRevocationUnavailableError(
				"Failed to revoke sessions during principal transition",
				{ cause: error },
			);
		}
		events.push(
			...(await recordRevokedSessionRefs(context, {
				principalId: transitioned.id,
				revokedRefs,
				reasonCode: params.reasonCode,
			})),
		);
	}

	await context.publishEvents(events);
	return transitioned;
}

/**
 * Records revoked session references and builds their events. Shared by the
 * inline transition path and the bootstrap reconciliation so both leave the
 * same audit trail.
 */
export async function recordRevokedSessionRefs(
	context: IdentityTransactionContext,
	input: {
		principalId: string;
		revokedRefs: RevokedSessionRef[];
		reasonCode?: string;
	},
): Promise<DomainEventEnvelope[]> {
	const events: DomainEventEnvelope[] = [];
	for (const ref of input.revokedRefs) {
		const recorded = await context.sessionRefRepository.recordRevoked({
			principalId: input.principalId,
			externalRefHash: ref.externalRefHash,
			revokedAt: ref.revokedAt,
			reasonCode: input.reasonCode ?? null,
		});
		events.push(
			createSessionRevokedEvent({
				sessionRefId: recorded.id,
				principalId: input.principalId,
				revokedAt: (recorded.revokedAt ?? ref.revokedAt).toISOString(),
				reasonCode: input.reasonCode,
			}),
		);
	}
	return events;
}

export async function recordTransitionJournal(
	context: IdentityTransactionContext,
	input: {
		commandId: string | undefined;
		commandName: string;
		principal: Principal;
	},
): Promise<void> {
	if (!input.commandId) {
		return;
	}
	const result = identityCommandResultSchema.parse({
		aggregateId: input.principal.id,
		revision: input.principal.revision,
		status: input.principal.status,
	});
	await recordIdempotentCommand(context, {
		commandId: input.commandId,
		commandName: input.commandName,
		aggregateId: result.aggregateId,
		aggregateType: "Principal",
		revision: result.revision,
		responseSnapshot: { ...result },
	});
}

/**
 * Idempotency pre-check: a repeated `commandId` returns the current principal
 * (the applied state) instead of running the transition again. Reuse of the key
 * by another command or another principal is rejected by `findIdempotentCommand`.
 */
export async function loadTransitionReplay(
	context: IdentityTransactionContext,
	commandId: string | undefined,
	commandName: string,
	principalId: string,
): Promise<Principal | null> {
	if (!commandId) {
		return null;
	}
	const journaled = await findIdempotentCommand(context.commandJournal, {
		commandId,
		commandName,
		aggregateId: principalId,
	});
	if (!journaled) {
		return null;
	}
	parseCommandResultSnapshot(journaled.responseSnapshot);
	return context.principalRepository.findById(principalId);
}
