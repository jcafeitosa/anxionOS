import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	activateLimitPolicy,
	createPgCommandJournalRepository,
	createRiskUnitOfWork,
} from "@anxionos/risk";
import { ensureRiskSchema } from "../../modules/risk/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

const RISK_TRUNCATE_SQL =
	"TRUNCATE risk_command_journal, risk_consumer_dedup, risk_kill_switch_state, risk_permits, risk_check_results, risk_limit_policies, risk_epoch_registry, domain_journal, outbox CASCADE";

export async function withRiskPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureRiskSchema(pool);
		await truncateDomainTables(pool, RISK_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export const RISK_TEST_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const RISK_TEST_ORG_B = "00000000-0000-4000-8000-000000000002";
export const RISK_TEST_PORTFOLIO_ID = "00000000-0000-4000-8000-000000000040";
export const RISK_TEST_PORTFOLIO_B_ID = "00000000-0000-4000-8000-000000000041";
export const RISK_TEST_RISK_EPOCH = 1;
export const RISK_TEST_INTENT_HASH = "d".repeat(64);

export async function seedActiveLimitPolicy(
	pool: ReturnType<typeof createPgPool>,
	input?: {
		organizationId?: string;
		maxNotional?: string;
		riskEpoch?: number;
	},
) {
	const unitOfWork = createRiskUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	return activateLimitPolicy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: input?.organizationId ?? RISK_TEST_ORG_ID,
			policyVersion: "test-policy-v1",
			maxNotional: input?.maxNotional ?? "1000000.0",
			riskEpoch: input?.riskEpoch ?? RISK_TEST_RISK_EPOCH,
		},
	);
}
