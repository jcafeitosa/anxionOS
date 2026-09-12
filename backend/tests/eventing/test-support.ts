import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import { createPgPool } from "@anxionos/eventing/postgres";
import { EVENTING_DDL } from "@anxionos/eventing/schema";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function getNatsUrl(): string | undefined {
	return process.env.NATS_URL?.trim() || undefined;
}

export function shouldRunNatsIntegrationTests(): boolean {
	return (
		process.env.RUN_NATS_INTEGRATION_TESTS === "true" &&
		Boolean(getNatsUrl()) &&
		shouldRunPgIntegrationTests()
	);
}

export async function withEventingPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await pool.query(EVENTING_DDL);
		await truncateDomainTables(
			pool,
			"TRUNCATE domain_journal, outbox, inbox, dead_letter_queue RESTART IDENTITY",
		);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
