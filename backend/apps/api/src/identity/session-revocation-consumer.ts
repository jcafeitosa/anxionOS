import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	handlePrincipalSuspended,
	type PrincipalRepository,
	type SessionRevoker,
} from "@anxionos/identity";

export const IDENTITY_SESSIONS_CONSUMER_NAME = "apps/api:identity-sessions:v1";

export interface SessionRevocationConsumerDeps {
	principalRepository: PrincipalRepository;
	sessionRevoker: SessionRevoker;
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
