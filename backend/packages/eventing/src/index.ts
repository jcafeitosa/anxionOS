import type { schemaVersion } from "@anxionos/contracts";

export interface EventEnvelope<TPayload = unknown> {
    eventId: string;
    schemaVersion: typeof schemaVersion;
    ownerDomain: string;
    eventType: string;
    occurredAt: string;
    payload: TPayload;
}

export interface DomainJournal {
    append(envelope: EventEnvelope): Promise<void>;
}

export interface Outbox {
    enqueue(envelope: EventEnvelope): Promise<void>;
    markDispatched(eventId: string): Promise<void>;
}
