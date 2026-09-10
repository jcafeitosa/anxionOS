import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { BackfillJobRepository } from "./backfill-repository";
import type { CommandJournalRepository } from "./command-journal";
import type {
	CorporateActionRepository,
	FxRateRepository,
} from "./fx-corporate-actions-repository";
import type { MarketCalendarRepository } from "./market-calendar-repository";
export interface InstrumentRecord {
	id: string;
	organizationId: string;
	canonicalSymbol: string;
	instrumentKind: string;
	assetId: string;
	venueId: string;
	executionMode: string;
	status: string;
	revision: number;
}
export interface ObservationHeaderRecord {
	id: string;
	organizationId: string;
	instrumentId: string;
	observationKind: string;
	sourceEventId: string;
	eventTime: string;
	receiveTime: string;
	price: string;
	volume: string | null;
	executionMode: string;
	qualityFlag: string;
}
export interface InstrumentRepository {
	findById(
		instrumentId: string,
		organizationId: string,
	): Promise<InstrumentRecord | null>;
	findActiveByNaturalKey(
		organizationId: string,
		canonicalSymbol: string,
		venueId: string,
	): Promise<InstrumentRecord | null>;
	save(record: InstrumentRecord): Promise<InstrumentRecord>;
}
export interface ObservationRepository {
	findBySourceEventId(
		organizationId: string,
		sourceEventId: string,
	): Promise<ObservationHeaderRecord | null>;
	/**
	 * Latest observation header for the instrument, ordered by eventTime desc.
	 * Used by getPriceAsOf (D-MD-005); must never fabricate or interpolate a
	 * result — null means no observation was ever recorded for this scope.
	 */
	findLatestByInstrument(
		organizationId: string,
		instrumentId: string,
	): Promise<ObservationHeaderRecord | null>;
	saveHeader(record: ObservationHeaderRecord): Promise<ObservationHeaderRecord>;
	insertTimeseries(record: {
		eventTime: string;
		receiveTime: string;
		organizationId: string;
		instrumentId: string;
		observationHeaderId: string;
		observationKind: string;
		price: string;
		volume: string | null;
	}): Promise<void>;
}
export interface MarketDataTransactionContext {
	commandJournal: CommandJournalRepository;
	instruments: InstrumentRepository;
	observations: ObservationRepository;
	marketDataFxRates: FxRateRepository;
	corporateActions: CorporateActionRepository;
	backfillJobs: BackfillJobRepository;
	calendarRepository: MarketCalendarRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface MarketDataUnitOfWork {
	runInTransaction<T>(
		work: (ctx: MarketDataTransactionContext) => Promise<T>,
	): Promise<T>;
}
