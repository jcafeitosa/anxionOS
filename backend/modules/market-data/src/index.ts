export {
	registerInstrument,
	type RegisterInstrumentDeps,
} from "./application/commands/register-instrument";
export {
	recordObservation,
	type RecordObservationDeps,
} from "./application/commands/record-observation";
export {
	createMarketDataObservedConsumer,
	type ObservedConsumerDeps,
	type ObservedConsumerRealtimeDeps,
} from "./application/consumers/observed-consumer";
export {
	getPriceAsOf,
	type GetPriceAsOfDeps,
	type GetPriceAsOfInput,
	type GetPriceAsOfResult,
} from "./application/queries/get-price-as-of";
export {
	MarketDataCommandError,
	throwMarketDataError,
} from "./application/errors";
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
	RealtimeIngestBackpressureHandler,
	type BackpressureDecision,
	type BackpressureRejectReason,
	type RealtimeIngestBackpressureHandlerOptions,
} from "./application/realtime/backpressure-handler";
export {
	RealtimeIngestReconnectHandler,
	type RealtimeIngestEventFingerprint,
	type RealtimeIngestReconnectHandlerOptions,
	type ReconnectAdmissionDecision,
	type ReconnectConnectionPhase,
	type ReconnectSkipReason,
} from "./application/realtime/reconnect-handler";
export {
	RealtimeIngestSequenceGuard,
	type RealtimeIngestSequenceEvent,
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
export { ensureMarketDataSchema } from "./infrastructure/migrate";
export { createMarketDataUnitOfWork } from "./infrastructure/market-data-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	createPgInstrumentRepository,
	createPgObservationRepository,
} from "./infrastructure/persistence/repositories";
export {
	createPgCorporateActionRepository,
	createPgFxRateRepository,
} from "./infrastructure/persistence/fx-corporate-actions-repository";
export {
	recordFxRate,
	type RecordFxRateDeps,
} from "./application/commands/record-fx-rate";
export {
	recordCorporateAction,
	type RecordCorporateActionDeps,
} from "./application/commands/record-corporate-action";
export {
	getAdjustedPrice,
	type GetAdjustedPriceDeps,
	type GetAdjustedPriceInput,
	type GetAdjustedPriceResult,
} from "./application/queries/get-adjusted-price";
export {
	startBackfill,
	type StartBackfillDeps,
} from "./application/commands/start-backfill";
export {
	advanceBackfillCursor,
	type AdvanceBackfillCursorDeps,
} from "./application/commands/advance-backfill-cursor";
export {
	registerVenueCalendar,
	type RegisterVenueCalendarDeps,
} from "./application/commands/register-venue-calendar";
export {
	resolveTradingSession,
	type ResolveTradingSessionDeps,
	type ResolveTradingSessionInput,
	type ResolveTradingSessionResult,
} from "./application/queries/resolve-trading-session";
export { createPgBackfillJobRepository } from "./infrastructure/persistence/backfill-repository";
export { createPgMarketCalendarRepository } from "./infrastructure/persistence/market-calendar-repository";