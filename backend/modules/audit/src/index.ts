export {
	type IngestDomainEventTapDeps,
	ingestDomainEventTap,
} from "./application/commands/ingest-domain-event-tap";
export {
	type VerifyManifestIntegrityDeps,
	verifyManifestIntegrity,
} from "./application/commands/verify-manifest-integrity";
export {
	createDomainEventTapConsumer,
	type DomainEventTapConsumerDeps,
} from "./application/consumers/domain-event-tap-consumer";
export { AuditCommandError, throwAuditError } from "./application/errors";
export { computePayloadHash } from "./domain/payload-hash";
export { createAuditUnitOfWork } from "./infrastructure/audit-unit-of-work";
export { ensureAuditSchema } from "./infrastructure/migrate";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
