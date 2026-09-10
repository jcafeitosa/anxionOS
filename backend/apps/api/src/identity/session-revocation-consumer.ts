import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	type InboxConsumer,
	processWithInbox,
} from "@anxionos/eventing/postgres";
import {
	type PrincipalRepository,
	SessionRevocationUnavailableError,
	type SessionRevoker,
	createIdentityDb,
	handlePrincipalSuspended,
} from "@anxionos/identity";
import type { Pool } from "pg";
import { ZodError } from "zod";
import { createBetterAuthSessionRevoker } from "./better-auth-session-revoker";

export type IdentitySessionRevocationFailureClass = "permanent" | "transient";

/** GK-R07: validation/poison failures must not nak-loop; transient infra errors may retry. */
export function classifyIdentitySessionRevocationError(
	error: unknown,
): IdentitySessionRevocationFailureClass {
	if (error instanceof ZodError) {
		return "permanent";
	}
	if (error instanceof SessionRevocationUnavailableError) {
		return "transient";
	}
	if (error instanceof SyntaxError || error instanceof TypeError) {
		return "permanent";
	}
	return "transient";
}

export const IDENTITY_SESSIONS_CONSUMER_NAME = "apps/api:identity-sessions:v1";

export interface SessionRevocationConsumerDeps {
	principalRepository: PrincipalRepository;
	sessionRevoker: SessionRevoker;
}

export function createSessionRevocationConsumerDeps(
	pool: Pool,
): SessionRevocationConsumerDeps {
	const { repository } = createIdentityDb(pool);
	return {
		principalRepository: repository,
		sessionRevoker: createBetterAuthSessionRevoker(pool),
	};
}

export async function consumeIdentitySuspendedEvent(
	deps: SessionRevocationConsumerDeps,
	rawEnvelope: unknown,
): Promise<void> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED) {
		return;
	}
	await handlePrincipalSuspended(deps, envelope.payload);
}

function createIdentitySessionInboxConsumer(
	deps: SessionRevocationConsumerDeps,
): InboxConsumer {
	return {
		name: IDENTITY_SESSIONS_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			await consumeIdentitySuspendedEvent(deps, envelope);
		},
	};
}

export async function processIdentitySessionEvent(
	pool: Pool,
	deps: SessionRevocationConsumerDeps,
	envelope: DomainEventEnvelope,
): Promise<"processed" | "skipped"> {
	return processWithInbox(
		pool,
		createIdentitySessionInboxConsumer(deps),
		envelope,
	);
}
