import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface AuditManifestRecord {
    id: string;
    organizationId: string;
    sourceEventId: string;
    ownerDomain: string;
    eventType: string;
    occurredAt: string;
    payloadHash: string;
    recordedAt: string;
}
export interface AuditFlightRecorderEntryRecord {
    id: string;
    organizationId: string;
    manifestId: string;
    sourceEventId: string;
    ownerDomain: string;
    eventType: string;
    occurredAt: string;
    payloadHash: string;
    recordedAt: string;
}
export interface AuditManifestRepository {
    findById(id: string): Promise<AuditManifestRecord | null>;
    findBySourceEventId(sourceEventId: string): Promise<AuditManifestRecord | null>;
    save(record: AuditManifestRecord): Promise<AuditManifestRecord>;
}
export interface AuditFlightRecorderRepository {
    save(record: AuditFlightRecorderEntryRecord): Promise<AuditFlightRecorderEntryRecord>;
}
export interface AuditTransactionContext {
    commandJournal: CommandJournalRepository;
    manifests: AuditManifestRepository;
    flightRecorderEntries: AuditFlightRecorderRepository;
    publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface AuditUnitOfWork {
    runInTransaction<T>(work: (ctx: AuditTransactionContext) => Promise<T>): Promise<T>;
}
