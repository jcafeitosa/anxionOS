import type { Pool, PoolClient } from "pg";
import type {
	MarketCalendarRepository,
	TradingSessionRecord,
	VenueCalendarRecord,
} from "../../domain/ports/market-calendar-repository";

export function createPgMarketCalendarRepository(
	client: Pool | PoolClient,
): MarketCalendarRepository {
	return {
		async findVenueCalendar(venueId: string) {
			const result = await client.query(
				"SELECT venue_id, iana_timezone, scope, is_24x7, created_at, updated_at FROM market_data_venue_calendars WHERE venue_id = $1",
				[venueId],
			);
			if (result.rows.length === 0) return null;
			const row = result.rows[0];
			return {
				venue_id: String(row.venue_id),
				iana_timezone: String(row.iana_timezone),
				scope: String(row.scope) as "stocks" | "crypto" | "both",
				is_24x7: Boolean(row.is_24x7),
				created_at:
					row.created_at instanceof Date
						? row.created_at
						: new Date(String(row.created_at)),
				updated_at:
					row.updated_at instanceof Date
						? row.updated_at
						: new Date(String(row.updated_at)),
			};
		},

		async findSession(venueCalendarId: string, date: Date) {
			const result = await client.query(
				"SELECT venue_calendar_id, session_date, open_at, close_at, is_holiday, is_24x7, created_at, updated_at FROM market_data_trading_sessions WHERE venue_calendar_id = $1 AND session_date = $2",
				[venueCalendarId, date],
			);
			if (result.rows.length === 0) return null;
			const row = result.rows[0];
			return {
				venue_calendar_id: String(row.venue_calendar_id),
				session_date:
					row.session_date instanceof Date
						? row.session_date
						: new Date(String(row.session_date)),
				open_at:
					row.open_at instanceof Date
						? row.open_at
						: new Date(String(row.open_at)),
				close_at:
					row.close_at instanceof Date
						? row.close_at
						: new Date(String(row.close_at)),
				is_holiday: Boolean(row.is_holiday),
				is_24x7: Boolean(row.is_24x7),
				created_at:
					row.created_at instanceof Date
						? row.created_at
						: new Date(String(row.created_at)),
				updated_at:
					row.updated_at instanceof Date
						? row.updated_at
						: new Date(String(row.updated_at)),
			};
		},

		async saveVenueCalendar(record: VenueCalendarRecord) {
			const result = await client.query(
				`INSERT INTO market_data_venue_calendars (venue_id, iana_timezone, scope, is_24x7, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6)
				 ON CONFLICT (venue_id) DO UPDATE SET
					 iana_timezone = EXCLUDED.iana_timezone,
					 scope = EXCLUDED.scope,
					 is_24x7 = EXCLUDED.is_24x7,
					 updated_at = NOW()
				 RETURNING venue_id, iana_timezone, scope, is_24x7, created_at, updated_at`,
				[
					record.venue_id,
					record.iana_timezone,
					record.scope,
					record.is_24x7,
					record.created_at instanceof Date
						? record.created_at
						: new Date(String(record.created_at)),
					record.updated_at instanceof Date
						? record.updated_at
						: new Date(String(record.updated_at)),
				],
			);
			const row = result.rows[0];
			return {
				venue_id: String(row.venue_id),
				iana_timezone: String(row.iana_timezone),
				scope: String(row.scope) as "stocks" | "crypto" | "both",
				is_24x7: Boolean(row.is_24x7),
				created_at:
					row.created_at instanceof Date
						? row.created_at
						: new Date(String(row.created_at)),
				updated_at:
					row.updated_at instanceof Date
						? row.updated_at
						: new Date(String(row.updated_at)),
			};
		},

		async saveSession(record: TradingSessionRecord) {
			const result = await client.query(
				`INSERT INTO market_data_trading_sessions (venue_calendar_id, session_date, open_at, close_at, is_holiday, is_24x7, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
				 ON CONFLICT (venue_calendar_id, session_date) DO UPDATE SET
					 open_at = EXCLUDED.open_at,
					 close_at = EXCLUDED.close_at,
					 is_holiday = EXCLUDED.is_holiday,
					 is_24x7 = EXCLUDED.is_24x7,
					 updated_at = NOW()
				 RETURNING venue_calendar_id, session_date, open_at, close_at, is_holiday, is_24x7, created_at, updated_at`,
				[
					record.venue_calendar_id,
					record.session_date instanceof Date
						? record.session_date
						: new Date(String(record.session_date)),
					record.open_at instanceof Date
						? record.open_at
						: new Date(String(record.open_at)),
					record.close_at instanceof Date
						? record.close_at
						: new Date(String(record.close_at)),
					record.is_holiday,
					record.is_24x7,
					record.created_at instanceof Date
						? record.created_at
						: new Date(String(record.created_at)),
					record.updated_at instanceof Date
						? record.updated_at
						: new Date(String(record.updated_at)),
				],
			);
			const row = result.rows[0];
			return {
				venue_calendar_id: String(row.venue_calendar_id),
				session_date:
					row.session_date instanceof Date
						? row.session_date
						: new Date(String(row.session_date)),
				open_at:
					row.open_at instanceof Date
						? row.open_at
						: new Date(String(row.open_at)),
				close_at:
					row.close_at instanceof Date
						? row.close_at
						: new Date(String(row.close_at)),
				is_holiday: Boolean(row.is_holiday),
				is_24x7: Boolean(row.is_24x7),
				created_at:
					row.created_at instanceof Date
						? row.created_at
						: new Date(String(row.created_at)),
				updated_at:
					row.updated_at instanceof Date
						? row.updated_at
						: new Date(String(row.updated_at)),
			};
		},
	};
}
