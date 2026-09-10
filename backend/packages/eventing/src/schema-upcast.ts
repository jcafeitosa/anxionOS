import {
	type DomainEventEnvelopeV02,
	type InstitutionalChannel,
	upgradeDomainEventEnvelopeToV02,
} from "@anxionos/contracts/envelope-v02";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export class UnknownSchemaVersionError extends Error {
	constructor(version: string) {
		super(`Unknown schema version for publish: ${version}`);
		this.name = "UnknownSchemaVersionError";
	}
}

export interface UpcastContext {
	correlationId: string;
	actorPrincipalId: string;
	channel: InstitutionalChannel;
	causationId?: string;
	agencyId?: string;
	tenantId?: string;
	aggregateId?: string;
	aggregateRevision?: number;
	idempotencyKey?: string;
}

/** Pass-through for the current P02 baseline wire format (0.1.0). */
export function upcastEnvelopeForPublish(
	envelope: DomainEventEnvelope,
): DomainEventEnvelope {
	if (envelope.schemaVersion === "0.1.0") {
		return envelope;
	}
	throw new UnknownSchemaVersionError(envelope.schemaVersion);
}

/** Upgrade 0.1.0 envelopes to institutional 0.2.0 when a downstream requires it. */
export function upcastEnvelopeToV02(
	envelope: DomainEventEnvelope,
	context: UpcastContext,
): DomainEventEnvelopeV02 {
	if (envelope.schemaVersion !== "0.1.0") {
		throw new UnknownSchemaVersionError(envelope.schemaVersion);
	}
	if (envelope.payload === undefined) {
		throw new Error("Cannot upcast envelope without payload");
	}
	return upgradeDomainEventEnvelopeToV02(
		{ ...envelope, payload: envelope.payload },
		context,
	);
}
