import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	assertPortfoliosExecutionModeSupported,
	PortfoliosContractError,
} from "@anxionos/contracts/portfolios";
import {
	applyFillToPosition,
	createPgCommandJournalRepository,
	createPortfolio,
	createPortfoliosUnitOfWork,
} from "@anxionos/portfolios";
import {
	applyTestFill,
	buildLedgerPostedFixture,
	createConfirmValuationDeps,
	createPortfoliosLedgerConsumer,
	createReconcileCashDeps,
	PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
	PORTFOLIOS_TEST_INSTRUMENT_ID,
	PORTFOLIOS_TEST_ORG_B_ID,
	PORTFOLIOS_TEST_ORG_ID,
	PORTFOLIOS_TEST_OWNER_USER_ID,
	confirmValuation,
	reconcileCashFromLedger,
	seedCapitalTestAccount,
	seedFreshInstrumentObservation,
	seedFxRateFixture,
	seedSimulatedPortfolio,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

/**
 * G5 Red Team adversarial matrix (ANX-434) for ANX-153 Portfolios S1–S4.
 * Complements G3 oracle tests with explicit adversarial scenarios.
 */
describe("portfolios G5 red team adversarial (ANX-434)", () => {
	test("G5-PF-ADV-01: cross-tenant commandId replay rejected (PF_CROSS_TENANT)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			await applyTestFill(pool, { portfolioId: seeded.portfolioId, fillId });

			const ledger = buildLedgerPostedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
			});
			const commandId = randomUUID();
			const deps = createReconcileCashDeps(pool);

			await reconcileCashFromLedger(deps, {
				commandId,
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				journalEntryId: ledger.entryId,
				idempotencyKey: ledger.idempotencyKey,
				entryKind: ledger.entryKind,
				valueDate: ledger.valueDate,
				linesSummary: ledger.linesSummary,
				portfolioId: seeded.portfolioId,
				fillId,
			});

			await expect(
				reconcileCashFromLedger(deps, {
					commandId,
					organizationId: PORTFOLIOS_TEST_ORG_B_ID,
					journalEntryId: `acc_je_${randomUUID()}`,
					idempotencyKey: `ledger:${randomUUID()}`,
					entryKind: "TRADE_FILL",
					valueDate: ledger.valueDate,
					linesSummary: ledger.linesSummary,
					portfolioId: seeded.portfolioId,
					fillId,
				}),
			).rejects.toMatchObject({ code: "PF_CROSS_TENANT" });
		});
	});

	test("G5-PF-ADV-02: duplicate fill does not double holding quantity", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const fillId = `fill_dup_${randomUUID()}`;
			const command = {
				commandId: randomUUID(),
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				portfolioId: seeded.portfolioId,
				fillId,
				instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
				side: "BUY" as const,
				quantity: "1.0",
				price: "10.0",
				executionMode: "SIMULATED" as const,
				idempotencyKey: `fill:${fillId}`,
			};

			const first = await applyFillToPosition(
				{ unitOfWork, commandJournal },
				command,
			);
			const second = await applyFillToPosition(
				{ unitOfWork, commandJournal },
				{ ...command, commandId: randomUUID() },
			);

			expect(second.idempotentReplay).toBe(true);
			expect(second.revision).toBe(first.revision);

			const holdingCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_holdings WHERE fill_id = $1`,
				[fillId],
			);
			expect(holdingCount.rows[0]?.c).toBe(1);
		});
	});

	test("G5-PF-ADV-03: duplicate ledger entry does not double cash", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				fillId,
				quantity: "2.0",
				price: "50.0",
			});

			const entryId = `acc_je_${randomUUID()}`;
			const ledger = buildLedgerPostedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
				notionalAmount: "100",
				entryId,
			});
			const consumer = createPortfoliosLedgerConsumer(pool);

			await consumer.handle(ledger, fillId);
			const revisionAfterFirst = Number(
				(
					await pool.query(
						`SELECT revision FROM portfolios_positions
						 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
						[seeded.portfolioId],
					)
				).rows[0]?.revision,
			);

			await consumer.handle(ledger, fillId);
			const revisionAfterSecond = Number(
				(
					await pool.query(
						`SELECT revision FROM portfolios_positions
						 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
						[seeded.portfolioId],
					)
				).rows[0]?.revision,
			);
			expect(revisionAfterSecond).toBe(revisionAfterFirst);
		});
	});

	test("G5-PF-ADV-04: stale valuation rejected (PF_VALUATION_STALE)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await seedCapitalTestAccount(pool);
			const staleEventTime = new Date(Date.now() - 120_000).toISOString();
			const asOf = new Date().toISOString();
			const { instrumentId } = await seedFreshInstrumentObservation(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				price: "50.0",
				eventTime: staleEventTime,
			});
			await seedFxRateFixture(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				baseCurrency: "USD",
				quoteCurrency: "USD",
				rate: "1",
				asOf,
			});

			const seeded = await seedSimulatedPortfolio(pool);
			await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				instrumentId,
				quantity: "1.0",
			});

			const deps = createConfirmValuationDeps(pool);
			await expect(
				confirmValuation(deps, {
					commandId: randomUUID(),
					organizationId: PORTFOLIOS_TEST_ORG_ID,
					portfolioId: seeded.portfolioId,
					asOf,
					maxStalenessMs: 5_000,
					quoteCurrency: "USD",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "PF_VALUATION_STALE" });
		});
	});

	test("G5-PF-ADV-05: missing FX rejected (PF_INVALID_PRICE_REF)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await seedCapitalTestAccount(pool);
			const asOf = new Date().toISOString();
			const { instrumentId } = await seedFreshInstrumentObservation(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				price: "75.0",
				eventTime: asOf,
			});

			const seeded = await seedSimulatedPortfolio(pool, "EUR Portfolio");
			await pool.query(
				`UPDATE portfolios_portfolios SET base_currency = 'EUR' WHERE id = $1`,
				[seeded.portfolioId],
			);
			await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				instrumentId,
				quantity: "1.0",
			});

			const deps = createConfirmValuationDeps(pool);
			await expect(
				confirmValuation(deps, {
					commandId: randomUUID(),
					organizationId: PORTFOLIOS_TEST_ORG_ID,
					portfolioId: seeded.portfolioId,
					asOf,
					maxStalenessMs: 60_000,
					quoteCurrency: "USD",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "PF_INVALID_PRICE_REF" });
		});
	});

	test("G5-PF-ADV-06: ledger lag then cash mismatch keeps provisional only (M1 regression)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				fillId,
				quantity: "2.0",
				price: "50.0",
			});

			const lagCase = await pool.query(
				`SELECT status FROM portfolios_position_reconciliation_cases WHERE fill_id = $1`,
				[fillId],
			);
			expect(lagCase.rows[0]?.status).toBe("OPEN");

			const ledger = buildLedgerPostedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
				notionalAmount: "80",
			});
			await createPortfoliosLedgerConsumer(pool).handle(ledger, fillId);

			const cash = await pool.query(
				`SELECT quantity FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(String(cash.rows[0]?.quantity)).toBe("-100.00000000");

			const provisional = await pool.query(
				`SELECT settled FROM portfolios_provisional_cash WHERE fill_id = $1`,
				[fillId],
			);
			expect(provisional.rows[0]?.settled).toBe(false);

			const caseStatus = await pool.query(
				`SELECT status FROM portfolios_position_reconciliation_cases WHERE fill_id = $1`,
				[fillId],
			);
			expect(caseStatus.rows[0]?.status).toBe("OPEN");
		});
	});

	test("G5-PF-ADV-07: REAL execution mode rejected at contract boundary", async () => {
		expect(() => assertPortfoliosExecutionModeSupported("REAL")).toThrow(
			PortfoliosContractError,
		);

		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);

			await expect(
				createPortfolio(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: PORTFOLIOS_TEST_ORG_ID,
						ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
						capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
						name: "REAL Portfolio",
						baseCurrency: "USD",
						executionMode: "REAL" as "SIMULATED",
					},
				),
			).rejects.toThrow();
		});
	});
});
