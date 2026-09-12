import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureMarketDataSchema } from "../../modules/market-data/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
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
		await truncateDomainTables(pool, MARKET_DATA_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
