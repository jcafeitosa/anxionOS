import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import { randomUUID } from "node:crypto";
import {
	createPgCommandJournalRepository as createCapitalCommandJournal,
	createCapitalUnitOfWork,
	createDefaultGrantValidationPort,
	ensureCapitalSchema,
	registerCapitalAccount,
	reserveForIntent,
} from "@anxionos/capital";
import {
	createCapitalReservationCreatedConsumer,
	createDecisionsUnitOfWork,
	createPgCapitalReservationQueryAdapter,
	createRiskCheckCompletedConsumer,
} from "@anxionos/decisions";
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

import { ensureDecisionsSchema } from "../../modules/decisions/src/infrastructure/migrate";
import { ensureRiskSchema } from "../../modules/risk/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

const RISK_TRUNCATE_SQL =
	"TRUNCATE risk_command_journal, risk_permits, risk_check_results, risk_limit_policies, risk_epoch_registry CASCADE";
const CAPITAL_TRUNCATE_SQL =
	"TRUNCATE capital_command_journal, capital_reservations, capital_allocations, capital_balance_lines, capital_accounts CASCADE";

const DECISIONS_TRUNCATE_SQL =
	"TRUNCATE decisions_consumer_dedup, decisions_evidence_manifest_entries, decisions_evidence_manifests, decisions_submit_preconditions, decisions_dispositions, decisions_approvals, decisions_trade_intents, decisions_proposals, decisions_command_journal, decisions_records, domain_journal, outbox CASCADE";

export async function withDecisionsPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureDecisionsSchema(pool);
		await ensureRiskSchema(pool);
		// ANX-463: apply the module's own versioned migration instead of a duplicated
		// fixture — the copy had drifted to TEXT money columns and broke SUM(amount).
		await ensureCapitalSchema(pool);
		await truncateDomainTables(pool, RISK_TRUNCATE_SQL);
		await truncateDomainTables(pool, CAPITAL_TRUNCATE_SQL);
		await truncateDomainTables(pool, DECISIONS_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export const DECISIONS_TEST_ORG_ID = "00000000-0000-4000-8000-000000000002";
export const DECISIONS_TEST_GRANT_ID = "00000000-0000-4000-8000-000000000003";
export const DECISIONS_TEST_CORRELATION_ID =
	"00000000-0000-4000-8000-000000000004";

export const DECISIONS_TEST_PORTFOLIO_ID =
	"00000000-0000-4000-8000-000000000040";
export const DECISIONS_TEST_OWNER_USER_ID =
	"00000000-0000-4000-8000-000000000030";
export const DECISIONS_TEST_RISK_EPOCH = 1;

export async function seedRiskPolicyForTests(
	pool: ReturnType<typeof createPgPool>,
	organizationId = DECISIONS_TEST_ORG_ID,
) {
	const unitOfWork = createRiskUnitOfWork(pool);
	const commandJournal = createRiskCommandJournal(pool);
	await activateLimitPolicy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId,
			policyVersion: "s4-test",
			maxNotional: "1000000.0",
			riskEpoch: DECISIONS_TEST_RISK_EPOCH,
		},
	);
}

export async function seedCapitalAccountForTests(
	pool: ReturnType<typeof createPgPool>,
	organizationId = DECISIONS_TEST_ORG_ID,
) {
	const unitOfWork = createCapitalUnitOfWork(pool);
	const commandJournal = createCapitalCommandJournal(pool);
	const grantValidation = createDefaultGrantValidationPort();
	const registered = await registerCapitalAccount(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId,
			ownerUserId: DECISIONS_TEST_OWNER_USER_ID,
			baseCurrency: "USD",
			initialSettledAmount: "100000.0",
			executionMode: "SIMULATED",
		},
	);
	return registered.accountId!;
}

export async function fulfillSubmitPreconditions(
	pool: ReturnType<typeof createPgPool>,
	input: {
		organizationId: string;
		grantId: string;
		intentHash: string;
		authorityEpoch: number;
		accountId: string;
	},
) {
	await seedRiskPolicyForTests(pool, input.organizationId);
	const riskDeps = {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createRiskCommandJournal(pool),
	};
	const riskResult = await runPreTradeCheck(riskDeps, {
		commandId: randomUUID(),
		organizationId: input.organizationId,
		portfolioId: DECISIONS_TEST_PORTFOLIO_ID,
		intentHash: input.intentHash,
		notionalAmount: "100.0",
		authorityEpoch: input.authorityEpoch,
		riskEpoch: DECISIONS_TEST_RISK_EPOCH,
		executionMode: "SIMULATED",
	});
	const riskEventId = randomUUID();
	const riskConsumer = createRiskCheckCompletedConsumer({
		unitOfWork: createDecisionsUnitOfWork(pool),
	});
	await riskConsumer.handle(
		{
			checkId: riskResult.checkId!,
			organizationId: input.organizationId,
			portfolioId: DECISIONS_TEST_PORTFOLIO_ID,
			intentHash: input.intentHash,
			checkResult: riskResult.checkResult!,
			notionalAmount: "100.0",
			authorityEpoch: input.authorityEpoch,
			riskEpoch: DECISIONS_TEST_RISK_EPOCH,
			executionMode: "SIMULATED",
		},
		riskEventId,
	);
	const capitalDeps = {
		unitOfWork: createCapitalUnitOfWork(pool),
		commandJournal: createCapitalCommandJournal(pool),
		grantValidation: createDefaultGrantValidationPort(),
	};
	const reserved = await reserveForIntent(capitalDeps, {
		commandId: randomUUID(),
		organizationId: input.organizationId,
		accountId: input.accountId,
		portfolioId: DECISIONS_TEST_PORTFOLIO_ID,
		grantId: input.grantId,
		intentHash: input.intentHash,
		asset: "USD",
		amount: "100.0",
		reservationKind: "ORDER",
		executionMode: "SIMULATED",
	});
	const capitalConsumer = createCapitalReservationCreatedConsumer({
		unitOfWork: createDecisionsUnitOfWork(pool),
	});
	await capitalConsumer.handle(
		{
			reservationId: reserved.reservationId!,
			accountId: input.accountId,
			intentHash: input.intentHash,
			amount: "100.0",
			asset: "USD",
			organizationId: input.organizationId,
		},
		randomUUID(),
	);
	return {
		riskEventId,
		reservationId: reserved.reservationId!,
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}
