import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureMarketDataSchema } from "../../modules/market-data/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const MARKET_DATA_TRUNCATE_SQL =
	"TRUNCATE market_data_observations_ts, market_data_observation_headers, market_data_command_journal, market_data_backfill_jobs, market_data_corporate_actions, market_data_trading_sessions, market_data_venue_calendars, market_data_fx_rates, market_data_instruments, domain_journal, outbox CASCADE";

export async function withMarketDataPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureMarketDataSchema(pool);
		await pool.query(MARKET_DATA_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
