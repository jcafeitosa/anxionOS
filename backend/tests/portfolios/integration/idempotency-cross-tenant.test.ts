import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	applyFillToPosition,
	createPgCommandJournalRepository,
	createPortfolio,
	createPortfoliosUnitOfWork,
} from "@anxionos/portfolios";
import {
	PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
	PORTFOLIOS_TEST_INSTRUMENT_ID,
	PORTFOLIOS_TEST_ORG_B_ID,
	PORTFOLIOS_TEST_ORG_ID,
	PORTFOLIOS_TEST_OWNER_USER_ID,
	seedSimulatedPortfolio,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

describe("portfolios idempotency cross-tenant guard (ANX-153 G3-PF-S2-03)", () => {
	test("createPortfolio rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const orgAResult = await createPortfolio(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: PORTFOLIOS_TEST_ORG_ID,
					ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
					capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
					name: "Org A Portfolio",
					baseCurrency: "USD",
					executionMode: "SIMULATED",
				},
			);

			await expect(
				createPortfolio(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: PORTFOLIOS_TEST_ORG_B_ID,
						ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
						capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
						name: "Org B Portfolio",
						baseCurrency: "USD",
						executionMode: "SIMULATED",
					},
				),
			).rejects.toMatchObject({ code: "PF_CROSS_TENANT" });

			const orgBPortfolios = await pool.query(
				`SELECT id FROM portfolios_portfolios WHERE organization_id = $1`,
				[PORTFOLIOS_TEST_ORG_B_ID],
			);
			expect(orgBPortfolios.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM portfolios_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(PORTFOLIOS_TEST_ORG_ID);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				portfolioId: orgAResult.portfolioId,
			});
		});
	});

	test("applyFillToPosition rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();
			const fillId = `fill_cross_${randomUUID()}`;

			const orgAResult = await applyFillToPosition(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: PORTFOLIOS_TEST_ORG_ID,
					portfolioId: seeded.portfolioId,
					fillId,
					instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
					side: "BUY",
					quantity: "2.0",
					price: "50.0",
					executionMode: "SIMULATED",
					idempotencyKey: `fill:${fillId}`,
				},
			);

			await expect(
				applyFillToPosition(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: PORTFOLIOS_TEST_ORG_B_ID,
						portfolioId: seeded.portfolioId,
						fillId: `fill_other_${randomUUID()}`,
						instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
						side: "BUY",
						quantity: "5.0",
						price: "10.0",
						executionMode: "SIMULATED",
						idempotencyKey: "fill:other",
					},
				),
			).rejects.toMatchObject({ code: "PF_CROSS_TENANT" });

			const orgBHoldings = await pool.query(
				`SELECT id FROM portfolios_holdings WHERE organization_id = $1`,
				[PORTFOLIOS_TEST_ORG_B_ID],
			);
			expect(orgBHoldings.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM portfolios_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(PORTFOLIOS_TEST_ORG_ID);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				holdingId: orgAResult.holdingId,
			});
		});
	});
});
