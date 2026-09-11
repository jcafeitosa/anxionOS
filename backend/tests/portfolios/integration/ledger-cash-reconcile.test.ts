import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { cashInstrumentId, PORTFOLIOS_EVENT_TYPES } from "@anxionos/contracts/portfolios";
import {
	applyTestFill,
	buildLedgerPostedFixture,
	createPortfoliosLedgerConsumer,
	createReconcileCashDeps,
	PORTFOLIOS_TEST_ORG_B_ID,
	PORTFOLIOS_TEST_ORG_ID,
	reconcileCashFromLedger,
	seedSimulatedPortfolio,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

describe("portfolios ledger cash reconcile (ANX-153 S4)", () => {
	test("G3-PF-S4-02: fill before ledger applies provisional cash position", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			const result = await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				fillId,
				quantity: "2.0",
				price: "50.0",
				side: "BUY",
			});

			expect(result.provisionalCash).toBe(true);
			expect(result.cashPositionId).toMatch(/^pf_pos_/);
			expect(result.reconciliationCaseId).toMatch(/^pf_rc_/);

			const cashRows = await pool.query(
				`SELECT quantity FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(cashRows.rowCount).toBe(1);
			expect(String(cashRows.rows[0]?.quantity)).toBe("-100.00000000");

			const provisionalRows = await pool.query(
				`SELECT settled FROM portfolios_provisional_cash WHERE fill_id = $1`,
				[fillId],
			);
			expect(provisionalRows.rowCount).toBe(1);
			expect(provisionalRows.rows[0]?.settled).toBe(false);
		});
	});

	test("G3-PF-S4-01: ledger lag opens PositionReconciliationCase OPEN", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				fillId,
			});

			const caseRows = await pool.query(
				`SELECT case_kind, status FROM portfolios_position_reconciliation_cases
				 WHERE portfolio_id = $1 AND fill_id = $2`,
				[seeded.portfolioId, fillId],
			);
			expect(caseRows.rowCount).toBe(1);
			expect(caseRows.rows[0]?.case_kind).toBe("POSITION_VS_LEDGER");
			expect(caseRows.rows[0]?.status).toBe("OPEN");

			const journalRows = await pool.query(
				`SELECT event_type FROM domain_journal
				 WHERE owner_domain = 'portfolios' AND event_type = $1`,
				[PORTFOLIOS_EVENT_TYPES.RECONCILIATION_OPENED],
			);
			expect(journalRows.rowCount).toBeGreaterThan(0);
		});
	});

	test("G3-PF-S4-03: duplicate ledger entry does not double cash", async () => {
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
			const deps = createReconcileCashDeps(pool);
			const consumer = createPortfoliosLedgerConsumer(pool);

			await consumer.handle(ledger, fillId);
			const cashAfterFirst = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(String(cashAfterFirst.rows[0]?.quantity)).toBe("-100.00000000");
			const revisionAfterFirst = Number(cashAfterFirst.rows[0]?.revision);

			await consumer.handle(ledger, fillId);
			const cashAfterSecond = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(String(cashAfterSecond.rows[0]?.quantity)).toBe("-100.00000000");
			expect(Number(cashAfterSecond.rows[0]?.revision)).toBe(
				revisionAfterFirst,
			);

			const ledgerApps = await pool.query(
				`SELECT COUNT(*)::int AS count FROM portfolios_ledger_applications
				 WHERE journal_entry_id = $1`,
				[entryId],
			);
			expect(ledgerApps.rows[0]?.count).toBe(1);

			const resolvedCase = await pool.query(
				`SELECT status FROM portfolios_position_reconciliation_cases
				 WHERE fill_id = $1`,
				[fillId],
			);
			expect(resolvedCase.rows[0]?.status).toBe("RESOLVED");

			const cashReconciledEvents = await pool.query(
				`SELECT COUNT(*)::int AS count FROM domain_journal
				 WHERE event_type = $1`,
				[PORTFOLIOS_EVENT_TYPES.CASH_RECONCILED],
			);
			expect(cashReconciledEvents.rows[0]?.count).toBe(1);
		});
	});

	test("ledger consumer resolves reconciliation after catch-up", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;
			await applyTestFill(pool, { portfolioId: seeded.portfolioId, fillId });

			const ledger = buildLedgerPostedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
				notionalAmount: "100",
			});
			await createPortfoliosLedgerConsumer(pool).handle(ledger, fillId);

			const provisional = await pool.query(
				`SELECT settled FROM portfolios_provisional_cash WHERE fill_id = $1`,
				[fillId],
			);
			expect(provisional.rows[0]?.settled).toBe(true);
		});
	});

	test("G5-PF-S4-M1: ledger mismatch does not double-apply cash over provisional", async () => {
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

			const cashBeforeLedger = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(String(cashBeforeLedger.rows[0]?.quantity)).toBe("-100.00000000");
			const revisionBeforeLedger = Number(cashBeforeLedger.rows[0]?.revision);

			const ledger = buildLedgerPostedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
				notionalAmount: "90",
			});
			const deps = createReconcileCashDeps(pool);
			const result = await reconcileCashFromLedger(deps, {
				commandId: randomUUID(),
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				journalEntryId: ledger.entryId,
				idempotencyKey: ledger.idempotencyKey,
				entryKind: ledger.entryKind,
				valueDate: ledger.valueDate,
				linesSummary: ledger.linesSummary,
				portfolioId: seeded.portfolioId,
				fillId,
			});

			expect(result.reconciliationCaseId).toMatch(/^pf_rc_/);

			const cashAfterLedger = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions
				 WHERE portfolio_id = $1 AND position_side = 'CASH'`,
				[seeded.portfolioId],
			);
			expect(String(cashAfterLedger.rows[0]?.quantity)).toBe("-100.00000000");
			expect(Number(cashAfterLedger.rows[0]?.revision)).toBe(
				revisionBeforeLedger,
			);

			const provisional = await pool.query(
				`SELECT settled FROM portfolios_provisional_cash WHERE fill_id = $1`,
				[fillId],
			);
			expect(provisional.rows[0]?.settled).toBe(false);

			const openCase = await pool.query(
				`SELECT status FROM portfolios_position_reconciliation_cases
				 WHERE fill_id = $1`,
				[fillId],
			);
			expect(openCase.rowCount).toBe(1);
			expect(openCase.rows[0]?.status).toBe("OPEN");
		});
	});

	test("reconcileCashFromLedger rejects cross-tenant commandId replay", async () => {
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

	test("cash instrument id uses portfolio base currency", () => {
		expect(cashInstrumentId("USD")).toMatch(
			/^00000000-0000-4000-8000-[0-9a-f]{12}$/i,
		);
		expect(cashInstrumentId("USD")).toBe(cashInstrumentId("USD"));
	});
});
