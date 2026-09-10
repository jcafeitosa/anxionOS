import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { MARKET_DATA_EVENT_TYPES } from "@anxionos/contracts/market-data";
import type {
	InstrumentRecord,
	MarketDataTransactionContext,
	MarketDataUnitOfWork,
	ObservationHeaderRecord,
} from "../../domain/ports/market-data-unit-of-work";
import { createMarketDataObservedConsumer } from "./observed-consumer";

const ORG = "00000000-0000-4000-8000-000000000001";
const INSTRUMENT_ID = "md_ins_00000000-0000-4000-8000-000000000002";

function activeInstrument(): InstrumentRecord {
	return {
		id: INSTRUMENT_ID,
		organizationId: ORG,
		canonicalSymbol: "BTC-USD",
		instrumentKind: "SPOT",
		assetId: "btc",
		venueId: "binance",
		executionMode: "SIMULATED",
		status: "ACTIVE",
		revision: 1,
	};
}

function createInMemoryUow(instrument: InstrumentRecord) {
	const headersBySourceEvent = new Map<string, ObservationHeaderRecord>();
	const headersById = new Map<string, ObservationHeaderRecord>();
	const commandJournal = new Map<string, Record<string, unknown>>();
	let published: DomainEventEnvelope[] = [];
	let timeseriesInserts = 0;

	const ctx: MarketDataTransactionContext = {
		commandJournal: {
			async findByCommandId(commandId) {
				const snapshot = commandJournal.get(commandId);
				if (!snapshot) return null;
				return {
					commandId,
					organizationId: ORG,
					commandName: "recordObservation",
					responseSnapshot: snapshot,
				};
			},
			async save(entry) {
				commandJournal.set(entry.commandId, entry.responseSnapshot);
			},
		},
		instruments: {
			async findById(instrumentId, organizationId) {
				if (
					instrumentId !== instrument.id ||
					organizationId !== instrument.organizationId
				) {
					return null;
				}
				return instrument;
			},
			async findActiveByNaturalKey() {
				return null;
			},
			async save(record) {
				return record;
			},
		},
		observations: {
			async findBySourceEventId(organizationId, sourceEventId) {
				return (
					headersBySourceEvent.get(`${organizationId}:${sourceEventId}`) ?? null
				);
			},
			async findLatestByInstrument(organizationId, instrumentId) {
				const all = [...headersById.values()].filter(
					(h) =>
						h.organizationId === organizationId &&
						h.instrumentId === instrumentId,
				);
				if (all.length === 0) return null;
				return (
					all.sort((a, b) => (a.eventTime < b.eventTime ? 1 : -1))[0] ?? null
				);
			},
			async saveHeader(record) {
				const key = `${record.organizationId}:${record.sourceEventId}`;
				const existing = headersBySourceEvent.get(key);
				if (existing) return existing;
				headersBySourceEvent.set(key, record);
				headersById.set(record.id, record);
				return record;
			},
			async insertTimeseries() {
				timeseriesInserts += 1;
			},
		},
		async publishEvents(envelopes) {
			published = [...published, ...envelopes];
		},
	};
	const unitOfWork: MarketDataUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		unitOfWork,
		commandJournal: ctx.commandJournal,
		getPublished: () => published,
		getTimeseriesInsertCount: () => timeseriesInserts,
		getHeaderCount: () => headersById.size,
	};
}

function observedEvent(
	overrides: Partial<{
		eventId: string;
		organizationId: string;
		instrumentId: string | undefined;
		sourceEventId: string;
		eventTime: string;
		price: string;
	}> = {},
) {
	return {
		eventId: randomUUID(),
		organizationId: ORG,
		instrumentId: INSTRUMENT_ID,
		observationKind: "TRADE" as const,
		sourceEventId: randomUUID(),
		eventTime: new Date().toISOString(),
		price: "42000.50",
		executionMode: "SIMULATED" as const,
		...overrides,
	};
}

describe("createMarketDataObservedConsumer (ANX-145 slice 2)", () => {
	test("G3-MD-S3-01: returns null when instrument mapping fails (no instrumentId)", async () => {
		const { unitOfWork, commandJournal, getPublished, getHeaderCount } =
			createInMemoryUow(activeInstrument());
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
		});

		const result = await consumer.handle(
			observedEvent({ instrumentId: undefined }),
		);

		expect(result).toBeNull();
		expect(getHeaderCount()).toBe(0);
		expect(getPublished()).toHaveLength(0);
	});

	test("records observation when mapping succeeds", async () => {
		const { unitOfWork, commandJournal, getPublished, getHeaderCount } =
			createInMemoryUow(activeInstrument());
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
		});
		const event = observedEvent();

		const result = await consumer.handle(event);

		expect(result).not.toBeNull();
		expect(result?.observationHeaderId).toMatch(/^md_obs_/);
		expect(getHeaderCount()).toBe(1);
		expect(
			getPublished().filter(
				(e) => e.eventType === MARKET_DATA_EVENT_TYPES.OBSERVATION_RECORDED,
			).length,
		).toBe(1);
	});

	test("dedupes by sourceEventId when the same observed event is handled twice", async () => {
		const {
			unitOfWork,
			commandJournal,
			getPublished,
			getTimeseriesInsertCount,
			getHeaderCount,
		} = createInMemoryUow(activeInstrument());
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
		});
		const sourceEventId = randomUUID();
		const event = observedEvent({ sourceEventId });

		const first = await consumer.handle(event);
		const second = await consumer.handle({
			...event,
			eventId: randomUUID(),
		});

		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		expect(second?.idempotentReplay).toBe(true);
		expect(second?.observationHeaderId).toBe(first?.observationHeaderId);
		expect(getHeaderCount()).toBe(1);
		expect(getTimeseriesInsertCount()).toBe(1);
		expect(
			getPublished().filter(
				(e) => e.eventType === MARKET_DATA_EVENT_TYPES.OBSERVATION_RECORDED,
			).length,
		).toBe(1);
	});
});
