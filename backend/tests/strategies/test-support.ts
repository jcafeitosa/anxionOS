import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	completeBacktest,
	createCertificationIssuedConsumer,
	createPgCommandJournalRepository,
	createSandboxBacktestRunnerAdapter,
	createStrategiesUnitOfWork,
	createStrategyVersion,
	registerStrategy,
	requestBacktest,
} from "@anxionos/strategies";
import type { Pool } from "pg";
import { ensureStrategiesSchema } from "../../modules/strategies/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const STRATEGIES_TRUNCATE_SQL =
	"TRUNCATE strategies_signals, strategies_deployments, strategies_backtest_runs, strategies_command_journal, strategy_versions, strategies, domain_journal, outbox CASCADE";

export async function withStrategiesPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureStrategiesSchema(pool);
		await pool.query(STRATEGIES_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const DATASET_ID = "ds_momentum_v1";
const DATASET_REVISION = "rev-2026-09-10";
const SEED = "seed-deterministic-001";

export const STRATEGIES_TEST_ORG_ID = ORG_ID;
export const STRATEGIES_TEST_BINDING = {
	instrumentRefs: ["inst_btc_usd", "inst_eth_usd"],
	parametersHash: HASH_C,
	rulesHash: HASH_B,
};

export async function seedBacktestedStrategyVersion(pool: Pool) {
	const unitOfWork = createStrategiesUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const registered = await registerStrategy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			displayName: `Strategies ${randomUUID()}`,
			executionMode: "SIMULATED",
		},
	);
	const created = await createStrategyVersion(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			strategyId: registered.strategyId!,
			sourceHash: HASH_A,
			rulesHash: HASH_B,
			parametersHash: HASH_C,
			executionMode: "SIMULATED",
		},
	);
	const requested = await requestBacktest(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			strategyId: registered.strategyId!,
			strategyVersionId: created.strategyVersionId!,
			datasetId: DATASET_ID,
			datasetRevision: DATASET_REVISION,
			seed: SEED,
		},
	);
	await completeBacktest(
		{
			unitOfWork,
			commandJournal,
			backtestRunner: createSandboxBacktestRunnerAdapter(),
		},
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			backtestRunId: requested.backtestRunId!,
		},
	);
	return {
		unitOfWork,
		commandJournal,
		strategyId: registered.strategyId!,
		strategyVersionId: created.strategyVersionId!,
	};
}

export async function promoteVersionToEvaluated(
	pool: Pool,
	strategyVersionId: string,
) {
	await pool.query(
		`UPDATE strategy_versions
		 SET lifecycle_state = 'EVALUATED'
		 WHERE id = $1`,
		[strategyVersionId],
	);
}

export async function certifyStrategyVersionViaEvent(
	pool: Pool,
	input: {
		strategyId: string;
		strategyVersionId: string;
		eventId?: string;
		certificationId?: string;
	},
) {
	const unitOfWork = createStrategiesUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const consumer = createCertificationIssuedConsumer({
		unitOfWork,
		commandJournal,
	});
	const issuedAt = new Date().toISOString();
	return consumer.handle(
		{
			certificationId: input.certificationId ?? `evl_crt_${randomUUID()}`,
			organizationId: ORG_ID,
			subjectType: "strategy_version",
			strategyId: input.strategyId,
			strategyVersionId: input.strategyVersionId,
			issuedAt,
		},
		input.eventId ?? randomUUID(),
	);
}
