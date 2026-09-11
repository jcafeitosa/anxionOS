import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createMarketDataObservedConsumer,
	createMarketDataUnitOfWork,
	createPgCommandJournalRepository,
	markRealtimeStreamDisconnected,
	onRealtimeStreamReconnect,
	RealtimeIngestBackpressureHandler,
	RealtimeIngestReconnectHandler,
	RealtimeIngestSequenceGuard,
	registerInstrument,
} from "@anxionos/market-data";
import {
	shouldRunPgIntegrationTests,
	withMarketDataPgHarness,
} from "../test-support";

function createRealtimeGateDeps() {
	const reconnect = new RealtimeIngestReconnectHandler();
	const backpressure = new RealtimeIngestBackpressureHandler({
		maxStreamsPerTenant: 8,
		maxEventsPerStreamPerWindow: 100,
	});
	const sequence = new RealtimeIngestSequenceGuard({ gapThresholdMs: 60_000 });
	return { reconnect, backpressure, sequence };
}

function observedPayload(input: {
	organizationId: string;
	instrumentId: string;
	sourceEventId: string;
	eventId?: string;
	eventTime: string;
	price?: string;
}) {
	return {
		eventId: input.eventId ?? randomUUID(),
		organizationId: input.organizationId,
		instrumentId: input.instrumentId,
		observationKind: "TRADE" as const,
		sourceEventId: input.sourceEventId,
		eventTime: input.eventTime,
		price: input.price ?? "42000.50",
		executionMode: "SIMULATED" as const,
	};
}

describe("market-data realtime Timescale homologation (ANX-329 S3e)", () => {
	test("concurrent observed ingest persists one hypertable row per sourceEventId", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const realtime = createRealtimeGateDeps();
			const consumer = createMarketDataObservedConsumer({
				unitOfWork,
				commandJournal,
				realtime,
			});
			const organizationId = randomUUID();
			const registered = await registerInstrument(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					canonicalSymbol: "BTC-USD",
					instrumentKind: "SPOT",
					assetId: "btc",
					venueId: "binance",
					executionMode: "SIMULATED",
				},
			);
			const instrumentId = registered.instrumentId;
			if (!instrumentId) throw new Error("expected instrumentId");

			const sourceEventId = randomUUID();
			const eventTime = "2026-09-10T18:00:01.000Z";
			realtime.reconnect.registerStream(organizationId, instrumentId);

			const deliveries = await Promise.all(
				Array.from({ length: 6 }, () =>
					consumer.handle(
						observedPayload({
							organizationId,
							instrumentId,
							sourceEventId,
							eventTime,
						}),
					),
				),
			);

			const persisted = deliveries.filter((result) => result !== null);
			expect(persisted.length).toBeGreaterThan(0);
			const headerIds = new Set(
				persisted.map((result) => result?.observationHeaderId),
			);
			expect(headerIds.size).toBe(1);
			expect(
				persisted.some((result) => result?.idempotentReplay === true),
			).toBe(true);

			const headerRows = await pool.query(
				`SELECT count(*)::int AS count FROM market_data_observation_headers
				 WHERE organization_id = $1 AND source_event_id = $2`,
				[organizationId, sourceEventId],
			);
			expect(headerRows.rows[0]?.count).toBe(1);

			const tsRows = await pool.query(
				`SELECT count(*)::int AS count FROM market_data_observations_ts
				 WHERE organization_id = $1 AND instrument_id = $2`,
				[organizationId, instrumentId],
			);
			expect(tsRows.rows[0]?.count).toBe(1);
		});
	});

	test("reconnect replay skips transport duplicates and persistence dedupes sourceEventId", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const realtime = createRealtimeGateDeps();
			const consumer = createMarketDataObservedConsumer({
				unitOfWork,
				commandJournal,
				realtime,
			});
			const organizationId = randomUUID();
			const registered = await registerInstrument(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					canonicalSymbol: "ETH-USD",
					instrumentKind: "SPOT",
					assetId: "eth",
					venueId: "binance",
					executionMode: "SIMULATED",
				},
			);
			const instrumentId = registered.instrumentId;
			if (!instrumentId) throw new Error("expected instrumentId");

			const sourceEventId = randomUUID();
			const transportEventId = randomUUID();
			const eventTime = "2026-09-10T19:00:00.000Z";
			realtime.reconnect.registerStream(organizationId, instrumentId);

			const first = await consumer.handle(
				observedPayload({
					organizationId,
					instrumentId,
					sourceEventId,
					eventId: transportEventId,
					eventTime,
				}),
			);
			expect(first).not.toBeNull();

			markRealtimeStreamDisconnected(realtime, organizationId, instrumentId);
			onRealtimeStreamReconnect(realtime, organizationId, instrumentId);

			const transportReplay = await consumer.handle(
				observedPayload({
					organizationId,
					instrumentId,
					sourceEventId: randomUUID(),
					eventId: transportEventId,
					eventTime,
				}),
			);
			expect(transportReplay).toBeNull();

			const sourceReplay = await consumer.handle(
				observedPayload({
					organizationId,
					instrumentId,
					sourceEventId,
					eventTime,
				}),
			);
			expect(sourceReplay).not.toBeNull();
			expect(sourceReplay?.idempotentReplay).toBe(true);
			expect(sourceReplay?.observationHeaderId).toBe(
				first?.observationHeaderId,
			);

			const counts = await pool.query(
				`SELECT
					(SELECT count(*)::int FROM market_data_observation_headers
					 WHERE organization_id = $1 AND source_event_id = $2) AS headers,
					(SELECT count(*)::int FROM market_data_observations_ts
					 WHERE organization_id = $1 AND instrument_id = $3) AS ts_rows`,
				[organizationId, sourceEventId, instrumentId],
			);
			expect(counts.rows[0]?.headers).toBe(1);
			expect(counts.rows[0]?.ts_rows).toBe(1);
		});
	});

	test("persists eventTime, receiveTime and qualityFlag end-to-end in Postgres/Timescale", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const realtime = createRealtimeGateDeps();
			const consumer = createMarketDataObservedConsumer({
				unitOfWork,
				commandJournal,
				realtime,
			});
			const organizationId = randomUUID();
			const registered = await registerInstrument(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					canonicalSymbol: "SOL-USD",
					instrumentKind: "SPOT",
					assetId: "sol",
					venueId: "binance",
					executionMode: "SIMULATED",
				},
			);
			const instrumentId = registered.instrumentId;
			if (!instrumentId) throw new Error("expected instrumentId");

			const later = "2026-09-10T20:00:01.000Z";
			const earlier = "2026-09-10T20:00:00.000Z";
			realtime.reconnect.registerStream(organizationId, instrumentId);

			await consumer.handle(
				observedPayload({
					organizationId,
					instrumentId,
					sourceEventId: randomUUID(),
					eventTime: later,
				}),
			);
			await consumer.handle(
				observedPayload({
					organizationId,
					instrumentId,
					sourceEventId: randomUUID(),
					eventTime: earlier,
				}),
			);

			const headerRows = await pool.query(
				`SELECT event_time, receive_time, quality_flag
				 FROM market_data_observation_headers
				 WHERE organization_id = $1 AND instrument_id = $2
				 ORDER BY event_time ASC`,
				[organizationId, instrumentId],
			);
			expect(headerRows.rowCount).toBe(2);
			expect((headerRows.rows[0]?.event_time as Date).toISOString()).toBe(
				earlier,
			);
			expect((headerRows.rows[1]?.event_time as Date).toISOString()).toBe(
				later,
			);
			expect(headerRows.rows[0]?.quality_flag).toBe("ESTIMATED");
			expect(headerRows.rows[1]?.quality_flag).toBe("OK");
			for (const row of headerRows.rows) {
				const receiveTime = (row.receive_time as Date).getTime();
				expect(Number.isFinite(receiveTime)).toBe(true);
				expect(receiveTime).toBeGreaterThan(0);
			}

			const tsRows = await pool.query(
				`SELECT event_time, receive_time
				 FROM market_data_observations_ts
				 WHERE organization_id = $1 AND instrument_id = $2
				 ORDER BY event_time ASC`,
				[organizationId, instrumentId],
			);
			expect(tsRows.rowCount).toBe(2);
			expect((tsRows.rows[0]?.event_time as Date).toISOString()).toBe(earlier);
			expect((tsRows.rows[1]?.event_time as Date).toISOString()).toBe(later);
			for (const row of tsRows.rows) {
				expect((row.receive_time as Date).getTime()).toBeGreaterThan(0);
			}

			const hypertable = await pool.query(
				"SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'market_data_observations_ts'",
			);
			expect(hypertable.rowCount).toBe(1);
		});
	});
});
