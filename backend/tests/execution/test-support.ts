import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	activateLimitPolicy,
	createPgCommandJournalRepository as createRiskCommandJournal,
	createRiskUnitOfWork,
	runPreTradeCheck,
} from "@anxionos/risk";
import { ensureExecutionSchema } from "../../modules/execution/src/infrastructure/migrate";
import { ensureRiskSchema } from "../../modules/risk/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const RISK_TRUNCATE_SQL =
	"TRUNCATE risk_command_journal, risk_consumer_dedup, risk_kill_switch_state, risk_permits, risk_check_results, risk_limit_policies, risk_epoch_registry CASCADE";

const EXECUTION_TRUNCATE_SQL =
	"TRUNCATE execution_command_journal, execution_reconciliation_cases, execution_order_attempts, execution_fills, execution_orders, execution_sessions, execution_venue_adapter_refs, domain_journal, outbox CASCADE";

export async function withExecutionPgHarness<T>(
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
		await ensureExecutionSchema(pool);
		await pool.query(RISK_TRUNCATE_SQL);
		await pool.query(EXECUTION_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export const EXECUTION_TEST_ORG_ID = "00000000-0000-4000-8000-000000000005";
export const EXECUTION_TEST_ORG_B = "00000000-0000-4000-8000-000000000006";
export const EXECUTION_TEST_PORTFOLIO_ID = "00000000-0000-4000-8000-000000000040";
export const EXECUTION_TEST_INSTRUMENT_ID =
	"00000000-0000-4000-8000-000000000010";
export const EXECUTION_TEST_INTENT_HASH = "e".repeat(64);
export const EXECUTION_TEST_RISK_EPOCH = 1;
export const EXECUTION_TEST_AUTHORITY_EPOCH = 1;

export async function seedActiveLimitPolicy(
	pool: ReturnType<typeof createPgPool>,
	input?: {
		organizationId?: string;
		maxNotional?: string;
		riskEpoch?: number;
	},
) {
	const unitOfWork = createRiskUnitOfWork(pool);
	const commandJournal = createRiskCommandJournal(pool);
	return activateLimitPolicy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: input?.organizationId ?? EXECUTION_TEST_ORG_ID,
			policyVersion: "execution-test-policy-v1",
			maxNotional: input?.maxNotional ?? "1000000.0",
			riskEpoch: input?.riskEpoch ?? EXECUTION_TEST_RISK_EPOCH,
		},
	);
}

export async function seedRiskPermitForTests(
	pool: ReturnType<typeof createPgPool>,
	input?: {
		organizationId?: string;
		intentHash?: string;
		authorityEpoch?: number;
		riskEpoch?: number;
		notionalAmount?: string;
	},
): Promise<string> {
	await seedActiveLimitPolicy(pool, {
		organizationId: input?.organizationId,
		riskEpoch: input?.riskEpoch,
	});
	const riskDeps = {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createRiskCommandJournal(pool),
	};
	const result = await runPreTradeCheck(riskDeps, {
		commandId: randomUUID(),
		organizationId: input?.organizationId ?? EXECUTION_TEST_ORG_ID,
		portfolioId: EXECUTION_TEST_PORTFOLIO_ID,
		intentHash: input?.intentHash ?? EXECUTION_TEST_INTENT_HASH,
		notionalAmount: input?.notionalAmount ?? "100.0",
		authorityEpoch: input?.authorityEpoch ?? EXECUTION_TEST_AUTHORITY_EPOCH,
		riskEpoch: input?.riskEpoch ?? EXECUTION_TEST_RISK_EPOCH,
		executionMode: "SIMULATED",
	});
	if (result.checkResult !== "PASS" || !result.permitId) {
		throw new Error(
			`risk permit seed failed: ${result.checkResult ?? "unknown"}`,
		);
	}
	return result.permitId;
}
