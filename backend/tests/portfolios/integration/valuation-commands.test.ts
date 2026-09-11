import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { PORTFOLIOS_EVENT_TYPES } from "@anxionos/contracts/portfolios";
import {
	applyTestFill,
	confirmValuation,
	createConfirmValuationDeps,
	PORTFOLIOS_TEST_ORG_B_ID,
	PORTFOLIOS_TEST_ORG_ID,
	seedCapitalTestAccount,
	seedFreshInstrumentObservation,
	seedFxRateFixture,
	seedSimulatedPortfolio,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

describe("portfolios valuation commands (ANX-153 S3)", () => {
	test("G3-PF-S3-01: confirmValuation marks positions with fresh price and FX and emits valuation.confirmed", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await seedCapitalTestAccount(pool);
			const asOf = new Date().toISOString();
			const { instrumentId } = await seedFreshInstrumentObservation(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				price: "100.0",
				eventTime: asOf,
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
				quantity: "2.5",
				price: "100.0",
			});

			const deps = createConfirmValuationDeps(pool);
			const result = await confirmValuation(deps, {
				commandId: randomUUID(),
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				portfolioId: seeded.portfolioId,
				asOf,
				maxStalenessMs: 60_000,
				quoteCurrency: "USD",
				executionMode: "SIMULATED",
			});

			expect(result.valuationSnapshotId).toMatch(/^pf_val_/);
			expect(Number(result.revision)).toBe(1);

			const snapshotRow = await pool.query(
				`SELECT nav_base, status, price_refs_json, fx_refs_json
				 FROM portfolios_valuation_snapshots
				 WHERE id = $1`,
				[result.valuationSnapshotId],
			);
			expect(snapshotRow.rows[0]?.status).toBe("CONFIRMED");
			expect(Number(snapshotRow.rows[0]?.nav_base)).toBe(250);
			expect(snapshotRow.rows[0]?.price_refs_json).toHaveLength(1);
			expect(snapshotRow.rows[0]?.fx_refs_json).toHaveLength(1);

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'portfolios'
				   AND event_type = $1`,
				[PORTFOLIOS_EVENT_TYPES.VALUATION_CONFIRMED],
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				snapshotId: result.valuationSnapshotId,
				portfolioId: seeded.portfolioId,
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				baseCurrency: "USD",
			});
			expect(Number(journalRows.rows[0]?.payload.navBase)).toBe(250);
		});
	});

	test("G3-PF-S3-02: stale price rejects with PF_VALUATION_STALE", async () => {
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

			const snapshotCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_valuation_snapshots`,
			);
			expect(snapshotCount.rows[0]?.c).toBe(0);
		});
	});

	test("G3-PF-S3-03: missing FX rejects with PF_INVALID_PRICE_REF", async () => {
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

	test("G3-PF-S3-04: confirmValuation rejects cross-tenant commandId replay", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await seedCapitalTestAccount(pool);
			const asOf = new Date().toISOString();
			const { instrumentId } = await seedFreshInstrumentObservation(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				price: "10.0",
				eventTime: asOf,
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
			const commandId = randomUUID();
			const orgAResult = await confirmValuation(deps, {
				commandId,
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				portfolioId: seeded.portfolioId,
				asOf,
				maxStalenessMs: 60_000,
				quoteCurrency: "USD",
				executionMode: "SIMULATED",
			});

			await expect(
				confirmValuation(deps, {
					commandId,
					organizationId: PORTFOLIOS_TEST_ORG_B_ID,
					portfolioId: seeded.portfolioId,
					asOf,
					maxStalenessMs: 60_000,
					quoteCurrency: "USD",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "PF_CROSS_TENANT" });

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM portfolios_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(PORTFOLIOS_TEST_ORG_ID);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				valuationSnapshotId: orgAResult.valuationSnapshotId,
			});
		});
	});

	test("G3-PF-S3-05: duplicate commandId returns idempotent replay", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await seedCapitalTestAccount(pool);
			const asOf = new Date().toISOString();
			const { instrumentId } = await seedFreshInstrumentObservation(pool, {
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				price: "20.0",
				eventTime: asOf,
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
				quantity: "3.0",
			});

			const deps = createConfirmValuationDeps(pool);
			const commandId = randomUUID();
			const command = {
				commandId,
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				portfolioId: seeded.portfolioId,
				asOf,
				maxStalenessMs: 60_000,
				quoteCurrency: "USD",
				executionMode: "SIMULATED" as const,
			};

			const first = await confirmValuation(deps, command);
			const second = await confirmValuation(deps, command);

			expect(second.idempotentReplay).toBe(true);
			expect(second.valuationSnapshotId).toBe(first.valuationSnapshotId);

			const snapshotCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_valuation_snapshots WHERE portfolio_id = $1`,
				[seeded.portfolioId],
			);
			expect(snapshotCount.rows[0]?.c).toBe(1);
		});
	});
});
