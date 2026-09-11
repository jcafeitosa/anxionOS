import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
	type SessionRevocationPort,
	SessionRevocationUnavailableError,
} from "../../domain/ports/session-revoker";
import { throwIdentityError } from "../errors";

export type PrincipalTransitionTarget = "suspended" | "revoked";

export interface PrincipalTransitionParams {
	principalId: string;
	target: PrincipalTransitionTarget;
	reasonCode: string;
	at: Date;
	expectedRevision?: number;
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
		// Lost the optimistic race between read and write.
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
	for (const serviceIdentity of activeServiceIdentities) {
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
		const revokedCredentials =
			await context.serviceCredentialRepository.revokeActiveByServiceIdentityId(
				revokedIdentity.id,
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
			revokedRefs = await params.sessionRevocation.revokeAllForAuthUser(
				transitioned.authUserId,
			);
		} catch (error) {
			throw new SessionRevocationUnavailableError(
				"Failed to revoke sessions during principal transition",
				{ cause: error },
			);
		}
		for (const ref of revokedRefs) {
			const recorded = await context.sessionRefRepository.recordRevoked({
				principalId: transitioned.id,
				externalRefHash: ref.externalRefHash,
				revokedAt: ref.revokedAt,
				reasonCode: params.reasonCode,
			});
			events.push(
				createSessionRevokedEvent({
					sessionRefId: recorded.id,
					principalId: transitioned.id,
					revokedAt: (recorded.revokedAt ?? ref.revokedAt).toISOString(),
					reasonCode: params.reasonCode,
				}),
			);
		}
	}

	await context.publishEvents(events);
	return transitioned;
}

/**
 * Idempotency pre-check: a repeated `commandId` returns the current principal
 * (the applied state) instead of running the transition again, which also keeps
 * the journal insert from colliding on its primary key.
 */
export async function loadTransitionReplay(
	context: IdentityTransactionContext,
	commandId: string | undefined,
	principalId: string,
): Promise<Principal | null> {
	if (!commandId) {
		return null;
	}
	const journaled = await context.commandJournal.findByCommandId(commandId);
	if (!journaled) {
		return null;
	}
	return context.principalRepository.findById(principalId);
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
	await context.commandJournal.record({
		commandId: input.commandId,
		commandName: input.commandName,
		aggregateId: input.principal.id,
		aggregateType: "Principal",
		revision: input.principal.revision,
		responseSnapshot: {
			aggregateId: input.principal.id,
			revision: input.principal.revision,
			status: input.principal.status,
		},
	});
}
