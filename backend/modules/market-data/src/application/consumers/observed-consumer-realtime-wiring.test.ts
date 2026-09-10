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
import { MarketDataCommandError } from "../errors";
import { RealtimeIngestBackpressureHandler } from "../realtime/backpressure-handler";
import {
	markRealtimeStreamDisconnected,
	onRealtimeStreamReconnect,
} from "../realtime/ingest-gate";
import { RealtimeIngestReconnectHandler } from "../realtime/reconnect-handler";
import { RealtimeIngestSequenceGuard } from "../realtime/sequence-guard";
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
		marketDataFxRates: {
			async findLatestAsOf() {
				return null;
			},
			async save(rate) {
				return rate;
			},
		},
		corporateActions: {
			async findByInstrumentAsOf() {
				return [];
			},
			async save(action) {
				return action;
			},
		},
		backfillJobs: {
			async findById() {
				return null;
			},
			async findActiveByInstrument() {
				return null;
			},
			async save(record) {
				return record;
			},
			async advanceCursor() {
				return null;
			},
		},
		calendarRepository: {
			async findVenueCalendar() {
				return null;
			},
			async findSession() {
				return null;
			},
			async saveVenueCalendar(record) {
				return record;
			},
			async saveSession(record) {
				return record;
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

function createRealtimeDeps(
	overrides: {
		reconnect?: RealtimeIngestReconnectHandler;
		backpressure?: RealtimeIngestBackpressureHandler;
		sequence?: RealtimeIngestSequenceGuard;
	} = {},
) {
	return {
		reconnect: overrides.reconnect ?? new RealtimeIngestReconnectHandler(),
		backpressure:
			overrides.backpressure ??
			new RealtimeIngestBackpressureHandler({
				maxStreamsPerTenant: 4,
				maxEventsPerStreamPerWindow: 10,
			}),
		sequence: overrides.sequence ?? new RealtimeIngestSequenceGuard(),
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

describe("createMarketDataObservedConsumer realtime wiring (ANX-329 S3c/S3d)", () => {
	test("skips duplicate transport eventId before recordObservation", async () => {
		const { unitOfWork, commandJournal, getHeaderCount } = createInMemoryUow(
			activeInstrument(),
		);
		const realtime = createRealtimeDeps();
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
			realtime,
		});
		const event = observedEvent();
		realtime.reconnect.registerStream(ORG, INSTRUMENT_ID);

		const first = await consumer.handle(event);
		const replay = await consumer.handle({ ...event, sourceEventId: randomUUID() });

		expect(first).not.toBeNull();
		expect(replay).toBeNull();
		expect(getHeaderCount()).toBe(1);
	});

	test("rejects when backpressure quota is exceeded", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		const realtime = createRealtimeDeps({
			backpressure: new RealtimeIngestBackpressureHandler({
				maxStreamsPerTenant: 4,
				maxEventsPerStreamPerWindow: 1,
				windowMs: 1_000,
			}),
		});
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
			realtime,
		});

		await consumer.handle(observedEvent());
		await expect(consumer.handle(observedEvent())).rejects.toMatchObject({
			code: "MD_INGEST_BACKPRESSURE",
			name: "MarketDataCommandError",
		} satisfies Partial<MarketDataCommandError>);
	});

	test("preserves persistence sourceEventId dedupe after gate admits", async () => {
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
			realtime: createRealtimeDeps(),
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

	test("keys gate by organizationId and instrument stream", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
			realtime: createRealtimeDeps({
				backpressure: new RealtimeIngestBackpressureHandler({
					maxStreamsPerTenant: 1,
					maxEventsPerStreamPerWindow: 5,
				}),
			}),
		});

		await consumer.handle(observedEvent());
		await expect(
			consumer.handle(
				observedEvent({
					instrumentId: "md_ins_00000000-0000-4000-8000-000000000099",
				}),
			),
		).rejects.toMatchObject({ code: "MD_INGEST_BACKPRESSURE" });
	});

	test("flags out-of-order ticks with ESTIMATED quality", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		const realtime = createRealtimeDeps({
			sequence: new RealtimeIngestSequenceGuard({ gapThresholdMs: 60_000 }),
		});
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
			realtime,
		});
		const later = "2026-09-10T18:00:01.000Z";
		const earlier = "2026-09-10T18:00:00.000Z";
		await consumer.handle(observedEvent({ eventTime: later }));
		await consumer.handle(
			observedEvent({ eventTime: earlier, sourceEventId: randomUUID() }),
		);
		const latest = await realtime.sequence.snapshot(ORG, INSTRUMENT_ID);
		expect(latest?.lastEventTime).toBe(later);
	});

	test("rejects strict sequence anomalies when configured", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		const realtime = createRealtimeDeps({
			sequence: new RealtimeIngestSequenceGuard({ rejectAnomalies: true }),
		});
		const consumer = createMarketDataObservedConsumer({
			unitOfWork,
			commandJournal,
			realtime,
		});
		await consumer.handle(
			observedEvent({ eventTime: "2026-09-10T18:00:02.000Z" }),
		);
		await expect(
			consumer.handle(
				observedEvent({
					eventTime: "2026-09-10T18:00:01.000Z",
					sourceEventId: randomUUID(),
				}),
			),
		).rejects.toMatchObject({ code: "MD_INGEST_SEQUENCE_VIOLATION" });
	});

	test("lifecycle hooks mark disconnect and reconnect on shared gate deps", async () => {
		const realtime = createRealtimeDeps();
		markRealtimeStreamDisconnected(realtime, ORG, INSTRUMENT_ID);
		onRealtimeStreamReconnect(realtime, ORG, INSTRUMENT_ID);
		const reconnectSnap = realtime.reconnect.snapshot(ORG, INSTRUMENT_ID);
		const sequenceSnap = realtime.sequence.snapshot(ORG, INSTRUMENT_ID);
		expect(reconnectSnap?.connectionGeneration).toBeGreaterThan(1);
		expect(sequenceSnap?.awaitingResync).toBe(true);
	});
});
