import { describe, expect, test } from "bun:test";
import type {
	InstrumentRecord,
	InstrumentRepository,
	ObservationHeaderRecord,
	ObservationRepository,
} from "../../domain/ports/market-data-unit-of-work";
import { getPriceAsOf } from "./get-price-as-of";

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

function observation(
	overrides: Partial<ObservationHeaderRecord> = {},
): ObservationHeaderRecord {
	return {
		id: "md_obs_00000000-0000-4000-8000-000000000003",
		organizationId: ORG,
		instrumentId: INSTRUMENT_ID,
		observationKind: "TRADE",
		sourceEventId: "00000000-0000-4000-8000-000000000004",
		eventTime: new Date().toISOString(),
		receiveTime: new Date().toISOString(),
		price: "42000.50",
		volume: null,
		executionMode: "SIMULATED",
		qualityFlag: "OK",
		...overrides,
	};
}

function deps(
	instrument: InstrumentRecord | null,
	latest: ObservationHeaderRecord | null,
) {
	const instruments: InstrumentRepository = {
		async findById() {
			return instrument;
		},
		async findActiveByNaturalKey() {
			return instrument;
		},
		async save(record) {
			return record;
		},
	};
	const observations: ObservationRepository = {
		async findBySourceEventId() {
			return latest;
		},
		async findLatestByInstrument() {
			return latest;
		},
		async saveHeader(record) {
			return record;
		},
		async insertTimeseries() {},
	};
	return { instruments, observations };
}

describe("getPriceAsOf (D-MD-005, ANX-145 slice 1)", () => {
	test("FAIL_CLOSED(NO_OBSERVATION) when nothing was ever recorded — never fabricates a price", async () => {
		const result = await getPriceAsOf(deps(activeInstrument(), null), {
			organizationId: ORG,
			instrumentId: INSTRUMENT_ID,
			maxStalenessMs: 5_000,
		});
		expect(result.status).toBe("FAIL_CLOSED");
		expect(result.status === "FAIL_CLOSED" && result.reason).toBe(
			"NO_OBSERVATION",
		);
	});

	test("FRESH when the latest observation is within the staleness budget", async () => {
		const eventTime = new Date(Date.now() - 1_000).toISOString();
		const result = await getPriceAsOf(
			deps(activeInstrument(), observation({ eventTime })),
			{
				organizationId: ORG,
				instrumentId: INSTRUMENT_ID,
				maxStalenessMs: 5_000,
			},
		);
		expect(result.status).toBe("FRESH");
		if (result.status === "FRESH") {
			expect(result.ageMs).toBeGreaterThanOrEqual(900);
			expect(result.ageMs).toBeLessThan(5_000);
		}
	});

	test("FAIL_CLOSED(STALE) when the latest observation is older than the caller's budget", async () => {
		const eventTime = new Date(Date.now() - 60_000).toISOString();
		const result = await getPriceAsOf(
			deps(activeInstrument(), observation({ eventTime })),
			{
				organizationId: ORG,
				instrumentId: INSTRUMENT_ID,
				maxStalenessMs: 5_000,
			},
		);
		expect(result.status).toBe("FAIL_CLOSED");
		if (result.status === "FAIL_CLOSED" && result.reason === "STALE") {
			expect(result.ageMs).toBeGreaterThanOrEqual(59_000);
			expect(result.observation.price).toBe("42000.50");
		} else {
			throw new Error("expected STALE disposition");
		}
	});

	test("staleness is measured against eventTime, not receiveTime (a late-arriving old tick stays stale)", async () => {
		// The tick happened 60s ago (eventTime) but was only received by
		// market-data 1s ago (receiveTime) — e.g. a delayed feed replay. It must
		// still fail closed: receiveTime recency must not mask price staleness.
		const eventTime = new Date(Date.now() - 60_000).toISOString();
		const receiveTime = new Date(Date.now() - 1_000).toISOString();
		const result = await getPriceAsOf(
			deps(activeInstrument(), observation({ eventTime, receiveTime })),
			{
				organizationId: ORG,
				instrumentId: INSTRUMENT_ID,
				maxStalenessMs: 5_000,
			},
		);
		expect(result.status).toBe("FAIL_CLOSED");
	});

	test("rejects an unknown instrument instead of returning a disposition", async () => {
		await expect(
			getPriceAsOf(deps(null, null), {
				organizationId: ORG,
				instrumentId: "md_ins_00000000-0000-4000-8000-000000000099",
				maxStalenessMs: 5_000,
			}),
		).rejects.toThrow();
	});

	test("rejects a negative maxStalenessMs instead of silently treating everything as fresh", async () => {
		await expect(
			getPriceAsOf(deps(activeInstrument(), observation()), {
				organizationId: ORG,
				instrumentId: INSTRUMENT_ID,
				maxStalenessMs: -1,
			}),
		).rejects.toThrow();
	});

	test("rejects an invalid asOf instead of silently comparing against NaN (would read as FRESH)", async () => {
		await expect(
			getPriceAsOf(deps(activeInstrument(), observation()), {
				organizationId: ORG,
				instrumentId: INSTRUMENT_ID,
				asOf: "not-a-date",
				maxStalenessMs: 5_000,
			}),
		).rejects.toThrow();
	});
});
