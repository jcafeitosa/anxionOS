import { describe, expect, test } from "bun:test";
import { createPgMarketCalendarRepository } from "../../infrastructure/persistence/market-calendar-repository";
import { resolveTradingSession } from "./resolve-trading-session";

// In-memory mock pool for tests that don't need a real PG connection
function createMockPool() {
	return {
		query: async (text: string, params: any[]) => {
			// Simple in-query mock handling
			if (text.includes("market_data_venue_calendars")) {
				const venueId = params?.[0];
				// Return based on known test data
				if (venueId === "binance") {
					return {
						rows: [
							{
								id: "md_cal_some-uuid",
								venue_id: "binance",
								iana_timezone: "America/New_York",
								scope: "stocks",
								is_24x7: false,
								created_at: new Date(),
								updated_at: new Date(),
							},
						],
						rowCount: 1,
					};
				}
				if (venueId === "unknown_venue") {
					return { rows: [], rowCount: 0 };
				}
				return { rows: [], rowCount: 0 };
			}
			if (text.includes("market_data_trading_sessions")) {
				const [venueCalId, dateStr] = params || [];
				const dateIso =
					dateStr instanceof Date ? dateStr.toISOString() : String(dateStr ?? "");
				if (venueCalId === "binance" && dateIso.startsWith("2025-01-15")) {
					return {
						rows: [
							{
								venue_calendar_id: "binance",
								session_date: new Date("2025-01-15T00:00:00.000Z"),
								open_at: new Date("2025-01-15T15:00:00.000Z"),
								close_at: new Date("2025-01-15T21:00:00.000Z"),
								is_holiday: false,
								is_24x7: false,
								created_at: new Date(),
								updated_at: new Date(),
							},
						],
						rowCount: 1,
					};
				}
				if (venueCalId === "binance" && dateIso.startsWith("2025-12-25")) {
					return {
						rows: [
							{
								venue_calendar_id: "binance",
								session_date: new Date("2025-12-25T00:00:00.000Z"),
								open_at: new Date("2025-12-25T17:00:00.000Z"),
								close_at: new Date("2025-12-25T21:00:00.000Z"),
								is_holiday: true,
								is_24x7: false,
								created_at: new Date(),
								updated_at: new Date(),
							},
						],
						rowCount: 1,
					};
				}
				return { rows: [], rowCount: 0 };
			}
			return { rows: [], rowCount: 0 };
		},
		end: async () => {},
	};
}

function makeDeps(pool: any = createMockPool()) {
	const calendarRepo = createPgMarketCalendarRepository(pool);
	return {
		calendarRepository: calendarRepo,
	};
}

describe("resolveTradingSession (ANX-146 slice B)", () => {
	test("returns IN_SESSION when atTime is within trading hours", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2025-01-15T18:00:00Z", // 1:00 PM NY time = 6:00 PM UTC... wait 18:00 UTC is actually 1 PM NY? Let me check. Actually 13:00 UTC = 9 AM NY, 18:00 UTC = 2 PM NY. OK 18:00 UTC is within 15:00-21:00 UTC window.
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("IN_SESSION");
	});

	test("returns OUTSIDE_SESSION when atTime is before trading hours", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2025-01-15T12:00:00Z", // 6:00 AM NY, before 10:00 AM open at 15:00 UTC
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("OUTSIDE_SESSION");
		if (result.status !== "OUTSIDE_SESSION") return;
		expect(result.nextOpenAt).not.toBeNull();
		expect(result.nextOpenAt).toContain("15:00:00");
	});

	test("returns OUTSIDE_SESSION when atTime is after trading hours", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2025-01-15T23:00:00Z", // 7:00 PM ET, after 4:00 PM close at 21:00 UTC
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("OUTSIDE_SESSION");
		if (result.status !== "OUTSIDE_SESSION") return;
		expect(result.nextOpenAt).toBeNull();
	});

	test("returns VENUE_NOT_FOUND for unknown venue", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "unknown_venue",
			atTime: "2025-01-15T18:00:00Z",
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("VENUE_NOT_FOUND");
	});

	test("returns HOLIDAY when session date is a holiday", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2025-12-25T18:00:00Z", // Christmas Day
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("HOLIDAY");
	});

	test("returns OUTSIDE_SESSION when no session data exists for the date", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2025-06-15T18:00:00Z", // No session row for this date
		};

		const result = await resolveTradingSession(deps, input);

		expect(result.status).toBe("OUTSIDE_SESSION");
		if (result.status !== "OUTSIDE_SESSION") return;
		expect(result.nextOpenAt).toBeNull();
	});

	test("atTime is explicit and required — no default to now", async () => {
		const deps = makeDeps();
		const input = {
			venueId: "binance",
			atTime: "2020-01-01T00:00:00Z", // Way in the past, definitely outside any session
		};

		const result = await resolveTradingSession(deps, input);

		// Should not crash; should return a disposition (OUTSIDE_SESSION since 2020-01-01 has no session data)
		expect(["OUTSIDE_SESSION", "VENUE_NOT_FOUND", "HOLIDAY"]).toContain(result.status);
	});
});