import { describe, expect, test } from "bun:test";
import { registerVenueCalendar } from "./register-venue-calendar";
import type {
	MarketCalendarRepository,
	TradingSessionRecord,
	VenueCalendarRecord,
} from "../../domain/ports/market-calendar-repository";

// We need a calendar repository mock that uses the in-memory approach.
// Since we're testing the application command, we'll create a simple
// in-memory repository for the test suite.

class InMemoryMarketCalendarRepository implements MarketCalendarRepository {
	private calendars: Map<string, VenueCalendarRecord> = new Map();

	async findVenueCalendar(venueId: string): Promise<VenueCalendarRecord | null> {
		return this.calendars.get(venueId) ?? null;
	}

	async findSession(venueCalendarId: string, date: Date): Promise<TradingSessionRecord | null> {
		// Not used in these tests, but required by interface
		return null;
	}

	async saveVenueCalendar(record: VenueCalendarRecord): Promise<VenueCalendarRecord> {
		this.calendars.set(record.venue_id, record);
		return record;
	}

	async saveSession(record: TradingSessionRecord): Promise<TradingSessionRecord> {
		return record;
	}
}

function makeDeps(repo: MarketCalendarRepository = new InMemoryMarketCalendarRepository()) {
	return {
		calendarRepository: repo,
		unitOfWork: {
			runInTransaction<T>(work: (ctx: any) => Promise<T>): Promise<T> {
				return work({
					calendarRepository: repo,
					instruments: {
						findById: async () => null,
						findActiveByNaturalKey: async () => null,
						save: async () => null,
					},
					observations: {
						findBySourceEventId: async () => null,
						findLatestByInstrument: async () => null,
						saveHeader: async () => null,
						insertTimeseries: async () => {},
					},
					publishEvents: async () => {},
				} as any);
			},
		} as any,
	};
}

describe("registerVenueCalendar (ANX-146 slice B)", () => {
	test("registers a venue calendar idempotently — first call creates the row", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			ianaTimezone: "America/New_York",
			scope: "stocks" as const,
			is24x7: false,
		};

		const result = await registerVenueCalendar(deps, input);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.record.venue_id).toBe("binance");
		expect(result.record.iana_timezone).toBe("America/New_York");
		expect(result.record.scope).toBe("stocks");
		expect(result.record.is_24x7).toBe(false);
	});

	test("registers a venue calendar idempotently — second call with same venueId returns same row", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			ianaTimezone: "Asia/Tokyo",
			scope: "crypto" as const,
			is24x7: true,
		};

		await registerVenueCalendar(deps, input);

		const result = await registerVenueCalendar(deps, input);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.record.venue_id).toBe("binance");
		expect(result.record.scope).toBe("crypto");
		expect(result.record.iana_timezone).toBe("Asia/Tokyo");
		expect(result.record.is_24x7).toBe(true);
	});

	test("registers venue calendars with different venueIds as separate rows", async () => {
		const deps = makeDeps();
		const input1 = {
			venueId: "binance",
			ianaTimezone: "America/New_York",
			scope: "stocks" as const,
			is24x7: false,
		};
		const input2 = {
			venueId: "coinbase",
			ianaTimezone: "Europe/London",
			scope: "both" as const,
			is24x7: false,
		};

		// Register both venues
		await registerVenueCalendar(deps, input1);
		await registerVenueCalendar(deps, input2);

		// Both should be stored separately
		const calendar1 = await deps.calendarRepository.findVenueCalendar("binance");
		const calendar2 = await deps.calendarRepository.findVenueCalendar("coinbase");

		expect(calendar1).not.toBeNull();
		expect(calendar2).not.toBeNull();
		expect(calendar1?.venue_id).toBe("binance");
		expect(calendar2?.venue_id).toBe("coinbase");
		expect(calendar1?.iana_timezone).toBe("America/New_York");
		expect(calendar2?.iana_timezone).toBe("Europe/London");
		expect(calendar1?.scope).toBe("stocks");
		expect(calendar2?.scope).toBe("both");
	});
});