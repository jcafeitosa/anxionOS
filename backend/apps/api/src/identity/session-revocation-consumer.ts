import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	createIdentityDb,
	handlePrincipalSuspended,
	type PrincipalRepository,
	type SessionRevoker,
} from "@anxionos/identity";
import { processWithInbox, type InboxConsumer } from "@anxionos/eventing/postgres";
import type { Pool } from "pg";
import { createBetterAuthSessionRevoker } from "./better-auth-session-revoker";

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
	return processWithInbox(pool, createIdentitySessionInboxConsumer(deps), envelope);
}
