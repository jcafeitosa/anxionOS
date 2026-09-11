export {
	proposeDecision,
	type ProposeDecisionDeps,
} from "./application/commands/propose-decision";
export {
	checkAuthority,
	type CheckAuthorityDeps,
} from "./application/commands/check-authority";
export {
	submitIntent,
	type SubmitIntentDeps,
} from "./application/commands/submit-intent";
export {
	requestHumanApproval,
	type RequestHumanApprovalDeps,
} from "./application/commands/request-human-approval";
export {
	recordApproval,
	type RecordApprovalDeps,
} from "./application/commands/record-approval";
export {
	recordDisposition,
	type RecordDispositionDeps,
} from "./application/commands/record-disposition";
export {
	recordEvidenceManifest,
	type RecordEvidenceManifestDeps,
} from "./application/commands/record-evidence-manifest";
export {
	DecisionsCommandError,
	throwDecisionsError,
} from "./application/errors";
export { ensureDecisionsSchema } from "./infrastructure/migrate";
export { createDecisionsUnitOfWork } from "./infrastructure/decisions-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";

export {
	createRiskCheckCompletedConsumer,
	type RiskCheckCompletedConsumerDeps,
} from "./application/consumers/risk-check-completed-consumer";
export {
	createCapitalReservationCreatedConsumer,
	type CapitalReservationCreatedConsumerDeps,
} from "./application/consumers/capital-reservation-created-consumer";
export {
	createKnowledgeEvidenceRecordedConsumer,
	type KnowledgeEvidenceRecordedConsumerDeps,
} from "./application/consumers/knowledge-evidence-recorded-consumer";
export {
	createRiskEpochBumpedConsumer as createDecisionsRiskEpochBumpedConsumer,
	DECISIONS_RISK_EPOCH_BUMPED_CONSUMER_NAME,
	type RiskEpochBumpedConsumerDeps as DecisionsRiskEpochBumpedConsumerDeps,
} from "./application/consumers/risk-epoch-bumped-consumer";
export { createPgCapitalReservationQueryAdapter } from "./infrastructure/adapters/pg-capital-reservation-query-adapter";
export { createPgDecisionsConsumerDedupRepository } from "./infrastructure/persistence/consumer-dedup-repository";

