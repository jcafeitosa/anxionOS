export interface VenueCalendarRecord {
	venue_id: string;
	iana_timezone: string;
	scope: "stocks" | "crypto" | "both";
	is_24x7: boolean;
	created_at: Date;
	updated_at: Date;
}

export interface TradingSessionRecord {
	venue_calendar_id: string;
	session_date: Date;
	open_at: Date;
	close_at: Date;
	is_holiday: boolean;
	is_24x7: boolean;
	created_at: Date;
	updated_at: Date;
}

export interface MarketCalendarRepository {
	/**
	 * Find a venue calendar by venue_id. Returns null if not found.
	 */
	findVenueCalendar(venueId: string): Promise<VenueCalendarRecord | null>;

	/**
	 * Find a trading session for a venue calendar and date.
	 * Returns null if no session exists for that date.
	 */
	findSession(venueCalendarId: string, date: Date): Promise<TradingSessionRecord | null>;

	/**
	 * Save a venue calendar record (idempotent upsert).
	 */
	saveVenueCalendar(record: VenueCalendarRecord): Promise<VenueCalendarRecord>;

	/**
	 * Save a trading session record (idempotent upsert).
	 */
	saveSession(record: TradingSessionRecord): Promise<TradingSessionRecord>;
}