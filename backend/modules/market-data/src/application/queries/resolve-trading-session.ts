import type {
	MarketCalendarRepository,
	TradingSessionRecord,
	VenueCalendarRecord,
} from "../../domain/ports/market-calendar-repository";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";

export interface ResolveTradingSessionDeps {
	calendarRepository: MarketCalendarRepository;
}

export interface ResolveTradingSessionInput {
	venueId: string;
	atTime: string; // ISO-8601 datetime string, required, no default
}

export type ResolveTradingSessionResult =
	| { status: "IN_SESSION"; session: TradingSessionRecord }
	| { status: "OUTSIDE_SESSION"; nextOpenAt: string | null }
	| { status: "VENUE_NOT_FOUND" }
	| { status: "HOLIDAY"; session: TradingSessionRecord };

/**
 * D-MD-018 / ANX-146-SLICE-B: resolveTradingSession
 *
 * Point-in-time correctness:
 * - atTime must be explicit (no internal default to "now").
 * - "sem lookahead": never use session data timestamped AFTER atTime.
 *   Calendars are known in advance (pre-materialized), so materializing
 *   rows ahead of time is fine, but the disposition for a given atTime must
 *   be reproducible regardless of when the function is called.
 * - FAIL_CLOSED philosophy (mirrors get-price-as-of): never silently assume
 *   a venue is open when no calendar/session data exists for that date.
 *
 * Dispositions:
 *   - IN_SESSION: atTime falls within [open_at, close_at] for the date,
 *     and !is_holiday.
 *   - OUTSIDE_SESSION: atTime is outside the trading window;
 *     nextOpenAt is the next open_at timestamp after atTime (or null if
 *     no future session exists for this venue).
 *   - VENUE_NOT_FOUND: no venue calendar exists for the given venueId.
 *   - HOLIDAY: the session date has is_holiday=true.
 *
 * Important: open_at/close_at are stored in UTC (TIMESTAMPTZ). The function
 * must compare atTime (also ISO-8601, interpreted as UTC unless otherwise
 * qualified) against these UTC boundaries. Application callers should
 * convert local/zone-aware times to UTC before passing in atTime.
 */
export async function resolveTradingSession(
	deps: ResolveTradingSessionDeps,
	input: ResolveTradingSessionInput,
): Promise<ResolveTradingSessionResult> {
	// Step 1: Look up the venue calendar
	const venueCalendar = await deps.calendarRepository.findVenueCalendar(
		input.venueId,
	);
	if (!venueCalendar) {
		return { status: "VENUE_NOT_FOUND" };
	}

	// Step 2: Look up the trading session for the date portion of atTime
	// Parse atTime to extract the date. We treat atTime as UTC for date extraction.
	// "sem lookahead": we only use session data whose session_date <= the date
	// extracted from atTime, and we never consider sessions whose data was
	// materialized after atTime (calendars are pre-materialized, so this is
	// about the session_date comparison, not the data timestamp).
	const atDate = new Date(input.atTime).toISOString().split("T")[0];

	const session = await deps.calendarRepository.findSession(
		venueCalendar.venue_id,
		new Date(atDate),
	);
	if (!session) {
		// No session row exists for this date.
		// Determine nextOpenAt: we need to find the next session after atTime.
		// Since no session row exists, we cannot determine a next open_at from
		// the DB — return OUTSIDE_SESSION with null nextOpenAt.
		// This is the FAIL_CLOSED behavior: no data = not-open disposition.
		return { status: "OUTSIDE_SESSION", nextOpenAt: null };
	}

	// Step 3: Check if it's a holiday
	if (session.is_holiday) {
		return { status: "HOLIDAY", session };
	}

	// Step 4: Check if atTime falls within the trading window
	// open_at and close_at are stored in UTC (TIMESTAMPTZ).
	// atTime is an ISO-8601 string; we interpret it as UTC.
	const atTimeMs = new Date(input.atTime).getTime();
	const openAtMs = session.open_at.getTime();
	const closeAtMs = session.close_at.getTime();

	let withinWindow = false;
	if (atTimeMs >= openAtMs && atTimeMs <= closeAtMs) {
		withinWindow = true;
	}

	if (withinWindow && !session.is_holiday) {
		return { status: "IN_SESSION", session };
	}

	// Step 5: atTime is outside the window — compute nextOpenAt
	// If atTime is before open_at, nextOpenAt is open_at.
	// If atTime is after close_at, we need to find the next session's open_at.
	// Since we only have one session row per date, and the caller asked about
	// a specific atTime, we compute nextOpenAt based on what we know:
	// - If atTime < open_at: nextOpenAt = open_at (same session, later today)
	// - If atTime > close_at: nextOpenAt depends on whether there's another
	//   session after this date. Without materializing future sessions, we
	//   return null for nextOpenAt when atTime > close_at, as we cannot
	//   determine the next session without additional data.

	let nextOpenAt: string | null = null;
	if (atTimeMs < openAtMs) {
		nextOpenAt = new Date(openAtMs).toISOString();
	} else {
		// atTime is after close_at; no future session data available,
		// return null for nextOpenAt (FAIL_CLOSED: don't fabricate).
		nextOpenAt = null;
	}

	return { status: "OUTSIDE_SESSION", nextOpenAt };
}
