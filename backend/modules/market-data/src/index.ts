export {
	type AdvanceBackfillCursorDeps,
	advanceBackfillCursor,
} from "./application/commands/advance-backfill-cursor";
export {
	type RecordCorporateActionDeps,
	recordCorporateAction,
} from "./application/commands/record-corporate-action";
export {
	type RecordFxRateDeps,
	recordFxRate,
} from "./application/commands/record-fx-rate";
export {
	type RecordObservationDeps,
	recordObservation,
} from "./application/commands/record-observation";
export {
	type RegisterInstrumentDeps,
	registerInstrument,
} from "./application/commands/register-instrument";
export {
	type RegisterVenueCalendarDeps,
	registerVenueCalendar,
} from "./application/commands/register-venue-calendar";
export {
	type StartBackfillDeps,
	startBackfill,
} from "./application/commands/start-backfill";
export {
	createMarketDataObservedConsumer,
	type ObservedConsumerDeps,
	type ObservedConsumerRealtimeDeps,
} from "./application/consumers/observed-consumer";
export {
	MarketDataCommandError,
	throwMarketDataError,
} from "./application/errors";
export {
	type GetAdjustedPriceDeps,
	type GetAdjustedPriceInput,
	type GetAdjustedPriceResult,
	getAdjustedPrice,
} from "./application/queries/get-adjusted-price";
export {
	type GetPriceAsOfDeps,
	type GetPriceAsOfInput,
	type GetPriceAsOfResult,
	getPriceAsOf,
} from "./application/queries/get-price-as-of";
export {
	type ResolveTradingSessionDeps,
	type ResolveTradingSessionInput,
	type ResolveTradingSessionResult,
	resolveTradingSession,
} from "./application/queries/resolve-trading-session";
export {
	type BackpressureDecision,
	type BackpressureRejectReason,
	RealtimeIngestBackpressureHandler,
	type RealtimeIngestBackpressureHandlerOptions,
} from "./application/realtime/backpressure-handler";
export {
	createDefaultRealtimeIngestGate,
	evaluateRealtimeIngestGate,
	markRealtimeStreamDisconnected,
	onRealtimeStreamReconnect,
	type RealtimeIngestGateDecision,
	type RealtimeIngestGateDeps,
	type RealtimeIngestGateInput,
	type RealtimeIngestRejectReason,
} from "./application/realtime/ingest-gate";
export {
	type RealtimeIngestEventFingerprint,
	RealtimeIngestReconnectHandler,
	type RealtimeIngestReconnectHandlerOptions,
	type ReconnectAdmissionDecision,
	type ReconnectConnectionPhase,
	type ReconnectSkipReason,
} from "./application/realtime/reconnect-handler";
export {
	type RealtimeIngestSequenceEvent,
	RealtimeIngestSequenceGuard,
	type RealtimeIngestSequenceGuardOptions,
	type RealtimeIngestSequenceStreamSnapshot,
	type SequenceAdmissionDecision,
	type SequenceAnomalyReason,
	type SequenceConnectionPhase,
	type SequenceQualityFlag,
} from "./application/realtime/sequence-guard";
export {
	MARKET_DATA_REALTIME_LIMIT_DEFAULTS,
	resolveBackpressureWindowMs,
	resolveMaxEventsPerStreamPerWindow,
	resolveMaxStreamsPerTenant,
	resolveReconnectDedupeWindow,
	resolveSequenceGapThresholdMs,
	resolveSequenceRejectAnomalies,
} from "./domain/realtime-ingest-limits";
export { createMarketDataUnitOfWork } from "./infrastructure/market-data-unit-of-work";
export { ensureMarketDataSchema } from "./infrastructure/migrate";
export { createPgBackfillJobRepository } from "./infrastructure/persistence/backfill-repository";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	createPgCorporateActionRepository,
	createPgFxRateRepository,
} from "./infrastructure/persistence/fx-corporate-actions-repository";
export { createPgMarketCalendarRepository } from "./infrastructure/persistence/market-calendar-repository";
export {
	createPgInstrumentRepository,
	createPgObservationRepository,
} from "./infrastructure/persistence/repositories";
