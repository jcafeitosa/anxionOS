export {
	ingestDomainEventTap,
	type IngestDomainEventTapDeps,
} from "./application/commands/ingest-domain-event-tap";
export {
	createDomainEventTapConsumer,
	type DomainEventTapConsumerDeps,
} from "./application/consumers/domain-event-tap-consumer";
export { AuditCommandError, throwAuditError } from "./application/errors";
export { ensureAuditSchema } from "./infrastructure/migrate";
export { createAuditUnitOfWork } from "./infrastructure/audit-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";

export {
	verifyManifestIntegrity,
	type VerifyManifestIntegrityDeps,
} from "./application/commands/verify-manifest-integrity";
export { computePayloadHash } from "./domain/payload-hash";
