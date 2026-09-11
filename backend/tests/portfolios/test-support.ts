import { randomUUID } from "node:crypto";
import type { PortfoliosExecutionFillConfirmedV1 } from "@anxionos/contracts/portfolios";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createPgCommandJournalRepository as createMarketDataCommandJournal,
	createMarketDataUnitOfWork,
	recordFxRate,
} from "@anxionos/market-data";
import {
	applyFillToPosition,
	type ConfirmValuationDeps,
	confirmValuation,
	createFillConfirmedConsumer,
	createLedgerPostedConsumer,
	createPgCapitalQueryAdapter,
	createPgCommandJournalRepository,
	createPgMarketDataQueryAdapter,
	createPortfolio,
	createPortfoliosUnitOfWork,
	type ReconcileCashFromLedgerDeps,
	reconcileCashFromLedger,
} from "@anxionos/portfolios";
import { ensureMarketDataSchema } from "../../modules/market-data/src/infrastructure/migrate";
import { ensurePortfoliosSchema } from "../../modules/portfolios/src/infrastructure/migrate";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const PORTFOLIOS_TRUNCATE_SQL =
	"TRUNCATE portfolios_command_journal, portfolios_position_reconciliation_cases, portfolios_ledger_applications, portfolios_provisional_cash, portfolios_valuation_snapshots, portfolios_holdings, portfolios_positions, portfolios_portfolios, market_data_observations_ts, market_data_observation_headers, market_data_command_journal, market_data_fx_rates, market_data_instruments, capital_accounts, domain_journal, outbox CASCADE";

const CAPITAL_ACCOUNTS_DDL = `
CREATE TABLE IF NOT EXISTS capital_accounts (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	owner_user_id UUID NOT NULL,
	base_currency TEXT NOT NULL,
	execution_mode TEXT NOT NULL,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

export async function withPortfoliosPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensurePortfoliosSchema(pool);
		await ensureMarketDataSchema(pool);
		await pool.query(CAPITAL_ACCOUNTS_DDL);
		await pool.query(PORTFOLIOS_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export const PORTFOLIOS_TEST_ORG_ID = "00000000-0000-4000-8000-000000000007";
export const PORTFOLIOS_TEST_OWNER_USER_ID =
	"00000000-0000-4000-8000-000000000030";
export const PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID = "cap_acc_test_001";
export const PORTFOLIOS_TEST_INSTRUMENT_ID =
	"00000000-0000-4000-8000-000000000010";
export const PORTFOLIOS_TEST_ORG_B_ID = "00000000-0000-4000-8000-000000000008";

export function buildPortfoliosFillConfirmedFixture(input: {
	portfolioId: string;
	fillId?: string;
	orderId?: string;
	quantity?: string;
	price?: string;
	side?: "BUY" | "SELL";
}): PortfoliosExecutionFillConfirmedV1 {
	const quantity = input.quantity ?? "2.0";
	const price = input.price ?? "50.0";
	const notional = String(Number(quantity) * Number(price));
	return {
		eventId: randomUUID(),
		organizationId: PORTFOLIOS_TEST_ORG_ID,
		fillId: input.fillId ?? `fill_${randomUUID()}`,
		orderId: input.orderId ?? randomUUID(),
		side: input.side ?? "BUY",
		instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
		quantity,
		price,
		notionalAmount: notional,
		asset: "USD",
		filledAt: new Date().toISOString(),
		executionMode: "SIMULATED",
		capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
		portfolioId: input.portfolioId,
	};
}

export async function seedSimulatedPortfolio(
	pool: ReturnType<typeof createPgPool>,
	name = "Test Portfolio",
) {
	const unitOfWork = createPortfoliosUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const created = await createPortfolio(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: PORTFOLIOS_TEST_ORG_ID,
			ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
			capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
			name,
			baseCurrency: "USD",
			executionMode: "SIMULATED",
		},
	);
	return {
		unitOfWork,
		commandJournal,
		portfolioId: created.portfolioId!,
	};
}

export function createPortfoliosFillConsumer(
	pool: ReturnType<typeof createPgPool>,
) {
	const unitOfWork = createPortfoliosUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	return createFillConfirmedConsumer({ unitOfWork, commandJournal });
}

export function createPortfoliosLedgerConsumer(
	pool: ReturnType<typeof createPgPool>,
) {
	const unitOfWork = createPortfoliosUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	return createLedgerPostedConsumer({ unitOfWork, commandJournal });
}

export function createReconcileCashDeps(
	pool: ReturnType<typeof createPgPool>,
): ReconcileCashFromLedgerDeps {
	return {
		unitOfWork: createPortfoliosUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
	};
}

export function buildLedgerPostedFixture(input: {
	portfolioId: string;
	fillId: string;
	notionalAmount?: string;
	asset?: string;
	entryId?: string;
	idempotencyKey?: string;
}) {
	const amount = input.notionalAmount ?? "100";
	const asset = input.asset ?? "USD";
	return {
		entryId: input.entryId ?? `acc_je_${randomUUID()}`,
		organizationId: PORTFOLIOS_TEST_ORG_ID,
		idempotencyKey: input.idempotencyKey ?? `ledger:${input.fillId}`,
		entryKind: "TRADE_FILL",
		valueDate: new Date().toISOString(),
		capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
		portfolioId: input.portfolioId,
		linesSummary: [
			{
				accountCode: "trading.cash",
				debit: amount,
				credit: "0",
				asset,
				amount,
			},
			{
				accountCode: "trading.clearing",
				debit: "0",
				credit: amount,
				asset,
				amount,
			},
		],
	};
}

export async function seedCapitalTestAccount(
	pool: ReturnType<typeof createPgPool>,
	input?: {
		accountId?: string;
		organizationId?: string;
		ownerUserId?: string;
		baseCurrency?: string;
	},
) {
	await pool.query(
		`INSERT INTO capital_accounts (
		   id, organization_id, owner_user_id, base_currency, execution_mode, status, revision
		 ) VALUES ($1,$2,$3,$4,'SIMULATED','ACTIVE',1)
		 ON CONFLICT (id) DO NOTHING`,
		[
			input?.accountId ?? PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
			input?.organizationId ?? PORTFOLIOS_TEST_ORG_ID,
			input?.ownerUserId ?? PORTFOLIOS_TEST_OWNER_USER_ID,
			input?.baseCurrency ?? "USD",
		],
	);
}

export async function seedFreshInstrumentObservation(
	pool: ReturnType<typeof createPgPool>,
	input: {
		organizationId: string;
		instrumentId?: string;
		price?: string;
		eventTime?: string;
	},
) {
	const instrumentId = input.instrumentId ?? PORTFOLIOS_TEST_INSTRUMENT_ID;
	const eventTime = input.eventTime ?? new Date().toISOString();
	const observationId = `md_obs_${randomUUID()}`;
	await pool.query(
		`INSERT INTO market_data_instruments (
		   id, organization_id, canonical_symbol, instrument_kind, asset_id,
		   venue_id, execution_mode, status, revision
		 ) VALUES ($1,$2,'TEST-USD','SPOT','test','fixture','SIMULATED','ACTIVE',1)
		 ON CONFLICT (id) DO NOTHING`,
		[instrumentId, input.organizationId],
	);
	await pool.query(
		`INSERT INTO market_data_observation_headers (
		   id, organization_id, instrument_id, observation_kind, source_event_id,
		   event_time, price, execution_mode, quality_flag
		 ) VALUES ($1,$2,$3,'TRADE',$4,$5,$6,'SIMULATED','OK')`,
		[
			observationId,
			input.organizationId,
			instrumentId,
			randomUUID(),
			eventTime,
			input.price ?? "100.0",
		],
	);
	return { instrumentId, eventTime };
}

export async function seedFxRateFixture(
	pool: ReturnType<typeof createPgPool>,
	input: {
		organizationId: string;
		baseCurrency: string;
		quoteCurrency: string;
		rate: string;
		asOf: string;
	},
) {
	const unitOfWork = createMarketDataUnitOfWork(pool);
	const commandJournal = createMarketDataCommandJournal(pool);
	await recordFxRate(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: input.organizationId,
			baseCurrency: input.baseCurrency,
			quoteCurrency: input.quoteCurrency,
			rate: input.rate,
			asOf: input.asOf,
			source: "CURRENCY_API",
		},
	);
}

export function createConfirmValuationDeps(
	pool: ReturnType<typeof createPgPool>,
): ConfirmValuationDeps {
	return {
		unitOfWork: createPortfoliosUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		marketData: createPgMarketDataQueryAdapter(pool),
		capitalQuery: createPgCapitalQueryAdapter(pool),
	};
}

export async function applyTestFill(
	pool: ReturnType<typeof createPgPool>,
	input: {
		portfolioId: string;
		fillId?: string;
		commandId?: string;
		instrumentId?: string;
		quantity?: string;
		price?: string;
		side?: "BUY" | "SELL";
	},
) {
	const unitOfWork = createPortfoliosUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const fillId = input.fillId ?? `fill_${randomUUID()}`;
	return applyFillToPosition(
		{ unitOfWork, commandJournal },
		{
			commandId: input.commandId ?? randomUUID(),
			organizationId: PORTFOLIOS_TEST_ORG_ID,
			portfolioId: input.portfolioId,
			fillId,
			instrumentId: input.instrumentId ?? PORTFOLIOS_TEST_INSTRUMENT_ID,
			side: input.side ?? "BUY",
			quantity: input.quantity ?? "2.0",
			price: input.price ?? "50.0",
			executionMode: "SIMULATED",
			idempotencyKey: `fill:${fillId}`,
		},
	);
}

export { confirmValuation, reconcileCashFromLedger };
