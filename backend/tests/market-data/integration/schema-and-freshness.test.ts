import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createMarketDataUnitOfWork,
	createPgCommandJournalRepository,
	createPgInstrumentRepository,
	createPgObservationRepository,
	getPriceAsOf,
	recordObservation,
	registerInstrument,
} from "@anxionos/market-data";
import {
	shouldRunPgIntegrationTests,
	withMarketDataPgHarness,
} from "../test-support";

describe("market-data schema + freshness against real Postgres/Timescale (ANX-145 slice 1)", () => {
	test("market_data_observations_ts is a real TimescaleDB hypertable", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const result = await pool.query(
				"SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'market_data_observations_ts'",
			);
			expect(result.rowCount).toBe(1);
		});
	});

	test("recordObservation dedupes the same sourceEventId under real concurrent writers (reconexão não duplica)", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
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
			const eventTime = new Date().toISOString();
			const makeInput = () => ({
				commandId: randomUUID(),
				organizationId,
				instrumentId,
				observationKind: "TRADE" as const,
				sourceEventId,
				eventTime,
				price: "42000.50",
				executionMode: "SIMULATED" as const,
				qualityFlag: "OK" as const,
			});

			// Two concurrent "reconnect replay" deliveries of the exact same
			// tick, racing genuinely in parallel against real Postgres.
			const [first, second] = await Promise.all([
				recordObservation({ unitOfWork, commandJournal }, makeInput()),
				recordObservation({ unitOfWork, commandJournal }, makeInput()),
			]);

			expect(first.observationHeaderId).toBe(second.observationHeaderId);
			expect([first.idempotentReplay, second.idempotentReplay]).toContain(true);

			const headerRows = await pool.query(
				"SELECT count(*)::int AS count FROM market_data_observation_headers WHERE organization_id = $1 AND source_event_id = $2",
				[organizationId, sourceEventId],
			);
			expect(headerRows.rows[0]?.count).toBe(1);

			const tsRows = await pool.query(
				"SELECT count(*)::int AS count FROM market_data_observations_ts WHERE organization_id = $1 AND instrument_id = $2",
				[organizationId, instrumentId],
			);
			expect(tsRows.rows[0]?.count).toBe(1);
		});
	});

	test("registerInstrument dedupes concurrent registrations for the same natural key (D-MD-001)", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationId = randomUUID();
			const makeInput = () => ({
				commandId: randomUUID(),
				organizationId,
				canonicalSymbol: "ETH-USD",
				instrumentKind: "SPOT" as const,
				assetId: "eth",
				venueId: "binance",
				executionMode: "SIMULATED" as const,
			});

			const [a, b] = await Promise.all([
				registerInstrument({ unitOfWork, commandJournal }, makeInput()),
				registerInstrument({ unitOfWork, commandJournal }, makeInput()),
			]);
			expect(a.instrumentId).toBe(b.instrumentId);

			const rows = await pool.query(
				`SELECT count(*)::int AS count FROM market_data_instruments
				 WHERE organization_id = $1 AND canonical_symbol = $2 AND venue_id = $3 AND status = 'ACTIVE'`,
				[organizationId, "ETH-USD", "binance"],
			);
			expect(rows.rows[0]?.count).toBe(1);
		});
	});

	test("getPriceAsOf FRESH/STALE/NO_OBSERVATION against real stored observations", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const instruments = createPgInstrumentRepository(pool);
			const observations = createPgObservationRepository(pool);
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

			const neverObserved = await getPriceAsOf(
				{ instruments, observations },
				{ organizationId, instrumentId, maxStalenessMs: 5_000 },
			);
			expect(neverObserved.status).toBe("FAIL_CLOSED");
			expect(
				neverObserved.status === "FAIL_CLOSED" && neverObserved.reason,
			).toBe("NO_OBSERVATION");

			await recordObservation(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					instrumentId,
					observationKind: "TRADE",
					sourceEventId: randomUUID(),
					eventTime: new Date().toISOString(),
					price: "150.25",
					executionMode: "SIMULATED",
					qualityFlag: "OK",
				},
			);

			const fresh = await getPriceAsOf(
				{ instruments, observations },
				{ organizationId, instrumentId, maxStalenessMs: 5_000 },
			);
			expect(fresh.status).toBe("FRESH");
			if (fresh.status === "FRESH") {
				// price is NUMERIC(24,8): Postgres returns a fixed-scale string
				// ("150.25000000"), not the caller's original literal — compare
				// numerically, matching how any real consumer must treat it.
				expect(Number(fresh.observation.price)).toBe(150.25);
			}

			const stale = await getPriceAsOf(
				{ instruments, observations },
				{ organizationId, instrumentId, maxStalenessMs: 0 },
			);
			expect(stale.status).toBe("FAIL_CLOSED");
			expect(stale.status === "FAIL_CLOSED" && stale.reason).toBe("STALE");
		});
	});

	test("organization isolation: org B cannot read org A's instrument via getPriceAsOf", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withMarketDataPgHarness(async ({ pool }) => {
			const unitOfWork = createMarketDataUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const instruments = createPgInstrumentRepository(pool);
			const observations = createPgObservationRepository(pool);
			const orgA = randomUUID();
			const orgB = randomUUID();

			const registered = await registerInstrument(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: orgA,
					canonicalSymbol: "ADA-USD",
					instrumentKind: "SPOT",
					assetId: "ada",
					venueId: "binance",
					executionMode: "SIMULATED",
				},
			);
			const instrumentId = registered.instrumentId;
			if (!instrumentId) throw new Error("expected instrumentId");

			await expect(
				getPriceAsOf(
					{ instruments, observations },
					{ organizationId: orgB, instrumentId, maxStalenessMs: 5_000 },
				),
			).rejects.toThrow();
		});
	});
});
