/**
 * ANX-163 P06 integration fixtures — test scope only.
 * Seeds grantId/correlationId and composes PG harness for the full pipeline.
 */
import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createDecisionsUnitOfWork,
	createPgCapitalReservationQueryAdapter,
	createPgCommandJournalRepository as createDecisionsCommandJournal,
	createCapitalReservationCreatedConsumer,
	createRiskCheckCompletedConsumer,
} from "@anxionos/decisions";
import { ensureDecisionsSchema } from "../../modules/decisions/src/infrastructure/migrate";
import {
	activateLimitPolicy,
	createRiskUnitOfWork,
	createPgCommandJournalRepository as createRiskCommandJournal,
	runPreTradeCheck,
} from "@anxionos/risk";
import { ensureRiskSchema } from "../../modules/risk/src/infrastructure/migrate";
import {
	createCapitalUnitOfWork,
	createDefaultGrantValidationPort,
	createPgCommandJournalRepository as createCapitalCommandJournal,
	registerCapitalAccount,
	reserveForIntent,
} from "@anxionos/capital";
import { ensureCapitalSchema } from "../../modules/capital/src/infrastructure/migrate";
import { ensureExecutionSchema } from "../../modules/execution/src/infrastructure/migrate";
import { ensureAccountingSchema } from "../../modules/accounting/src/infrastructure/migrate";
import { ensurePerformanceSchema } from "../../modules/performance/src/infrastructure/migrate";

export const P06_TEST_ORG_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
export const P06_TEST_GRANT_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
export const P06_TEST_CORRELATION_ID = "cccccccc-dddd-4eee-8fff-000000000001";
export const P06_TEST_PORTFOLIO_ID = "cccccccc-dddd-4eee-8fff-000000000000";
export const P06_TEST_OWNER_USER_ID = "dddddddd-eeee-4fff-8000-000000000001";
export const P06_TEST_AUTHORITY_EPOCH = 1;
export const P06_TEST_RISK_EPOCH = 1;

export const P06_STOCK_INTENT_HASH = "sha256:intent-stock-buy-p06-multi";
export const P06_CRYPTO_INTENT_HASH = "sha256:intent-crypto-buy-p06-multi";
export const P06_STOCK_INSTRUMENT_ID = "c1234567-89ab-4def-8123-456789abcdef";
export const P06_CRYPTO_INSTRUMENT_ID = "b1234567-89ab-4def-8123-456789abcdef";

export type P06ExecutionMode = "SIMULATED" | "PAPER";

const P06_TRUNCATE_SQL = `
TRUNCATE
	performance_pnl_series,
	performance_metric_points,
	performance_metric_series,
	performance_position_exposure_snapshots,
	performance_outcome_snapshots,
	performance_command_journal,
	accounting_ledger_postings,
	accounting_journal_entries,
	accounting_chart_accounts,
	accounting_command_journal,
	execution_command_journal,
	execution_reconciliation_cases,
	execution_order_attempts,
	execution_fills,
	execution_orders,
	execution_sessions,
	execution_venue_adapter_refs,
	capital_command_journal,
	capital_reservations,
	capital_allocations,
	capital_balance_lines,
	capital_accounts,
	risk_command_journal,
	risk_consumer_dedup,
	risk_kill_switch_state,
	risk_permits,
	risk_check_results,
	risk_limit_policies,
	risk_epoch_registry,
	decisions_consumer_dedup,
	decisions_evidence_manifest_entries,
	decisions_evidence_manifests,
	decisions_submit_preconditions,
	decisions_dispositions,
	decisions_approvals,
	decisions_trade_intents,
	decisions_proposals,
	decisions_command_journal,
	decisions_records,
	domain_journal,
	outbox
CASCADE`;

export function shouldRunP06PgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" &&
		Boolean(process.env.DATABASE_URL?.trim())
	);
}

export async function withP06PgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = process.env.DATABASE_URL?.trim();
	if (!shouldRunP06PgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureDecisionsSchema(pool);
		await ensureRiskSchema(pool);
		await ensureCapitalSchema(pool);
		await ensureExecutionSchema(pool);
		await ensureAccountingSchema(pool);
		await ensurePerformanceSchema(pool);
		await pool.query(P06_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export async function seedP06CapitalAccount(
	pool: ReturnType<typeof createPgPool>,
	executionMode: P06ExecutionMode = "PAPER",
) {
	const unitOfWork = createCapitalUnitOfWork(pool);
	const commandJournal = createCapitalCommandJournal(pool);
	const registered = await registerCapitalAccount(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: P06_TEST_ORG_ID,
			ownerUserId: P06_TEST_OWNER_USER_ID,
			baseCurrency: "USD",
			initialSettledAmount: "1000000.0",
			executionMode,
		},
	);
	if (!registered.accountId) {
		throw new Error("capital account seed failed");
	}
	return registered.accountId;
}

export async function seedP06RiskPolicy(
	pool: ReturnType<typeof createPgPool>,
	executionMode: P06ExecutionMode = "PAPER",
) {
	const unitOfWork = createRiskUnitOfWork(pool);
	const commandJournal = createRiskCommandJournal(pool);
	await activateLimitPolicy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: P06_TEST_ORG_ID,
			policyVersion: `p06-${executionMode.toLowerCase()}`,
			maxNotional: "10000000.0",
			riskEpoch: P06_TEST_RISK_EPOCH,
		},
	);
}

export async function fulfillP06SubmitPreconditions(
	pool: ReturnType<typeof createPgPool>,
	input: {
		grantId: string;
		intentHash: string;
		accountId: string;
		notionalAmount: string;
		executionMode?: P06ExecutionMode;
	},
) {
	const executionMode = input.executionMode ?? "PAPER";
	await seedP06RiskPolicy(pool, executionMode);
	const riskDeps = {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createRiskCommandJournal(pool),
	};
	const riskResult = await runPreTradeCheck(riskDeps, {
		commandId: randomUUID(),
		organizationId: P06_TEST_ORG_ID,
		portfolioId: P06_TEST_PORTFOLIO_ID,
		intentHash: input.intentHash,
		notionalAmount: input.notionalAmount,
		authorityEpoch: P06_TEST_AUTHORITY_EPOCH,
		riskEpoch: P06_TEST_RISK_EPOCH,
		executionMode,
	});
	const riskConsumer = createRiskCheckCompletedConsumer({
		unitOfWork: createDecisionsUnitOfWork(pool),
	});
	await riskConsumer.handle(
		{
			checkId: riskResult.checkId!,
			organizationId: P06_TEST_ORG_ID,
			portfolioId: P06_TEST_PORTFOLIO_ID,
			intentHash: input.intentHash,
			checkResult: riskResult.checkResult!,
			notionalAmount: input.notionalAmount,
			authorityEpoch: P06_TEST_AUTHORITY_EPOCH,
			riskEpoch: P06_TEST_RISK_EPOCH,
			executionMode,
		},
		randomUUID(),
	);
	const capitalDeps = {
		unitOfWork: createCapitalUnitOfWork(pool),
		commandJournal: createCapitalCommandJournal(pool),
		grantValidation: createDefaultGrantValidationPort(),
	};
	const reserved = await reserveForIntent(capitalDeps, {
		commandId: randomUUID(),
		organizationId: P06_TEST_ORG_ID,
		accountId: input.accountId,
		portfolioId: P06_TEST_PORTFOLIO_ID,
		grantId: input.grantId,
		intentHash: input.intentHash,
		asset: "USD",
		amount: input.notionalAmount,
		reservationKind: "ORDER",
		executionMode,
	});
	const capitalConsumer = createCapitalReservationCreatedConsumer({
		unitOfWork: createDecisionsUnitOfWork(pool),
	});
	await capitalConsumer.handle(
		{
			reservationId: reserved.reservationId!,
			accountId: input.accountId,
			intentHash: input.intentHash,
			amount: input.notionalAmount,
			asset: "USD",
			organizationId: P06_TEST_ORG_ID,
		},
		randomUUID(),
	);
	return {
		reservationId: reserved.reservationId!,
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

export async function seedP06RiskPermit(
	pool: ReturnType<typeof createPgPool>,
	input: {
		intentHash: string;
		notionalAmount: string;
		executionMode?: P06ExecutionMode;
	},
): Promise<string> {
	const executionMode = input.executionMode ?? "PAPER";
	await seedP06RiskPolicy(pool, executionMode);
	const riskDeps = {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createRiskCommandJournal(pool),
	};
	const result = await runPreTradeCheck(riskDeps, {
		commandId: randomUUID(),
		organizationId: P06_TEST_ORG_ID,
		portfolioId: P06_TEST_PORTFOLIO_ID,
		intentHash: input.intentHash,
		notionalAmount: input.notionalAmount,
		authorityEpoch: P06_TEST_AUTHORITY_EPOCH,
		riskEpoch: P06_TEST_RISK_EPOCH,
		executionMode,
	});
	if (result.checkResult !== "PASS" || !result.permitId) {
		throw new Error(
			`P06 risk permit seed failed: ${result.checkResult ?? "unknown"}`,
		);
	}
	return result.permitId;
}

export function createP06DecisionsDeps(pool: ReturnType<typeof createPgPool>) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createDecisionsCommandJournal(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}
