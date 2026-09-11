import { describe, expect, test } from "bun:test";
import {
	PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
	PORTFOLIOS_TEST_INSTRUMENT_ID,
	PORTFOLIOS_TEST_ORG_ID,
	PORTFOLIOS_TEST_OWNER_USER_ID,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

describe("portfolios schema migration (ANX-153 S1)", () => {
	test("core portfolios tables exist after ensurePortfoliosSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'portfolios_portfolios',
				     'portfolios_positions',
				     'portfolios_holdings',
				     'portfolios_command_journal',
				     'portfolios_valuation_snapshots'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"portfolios_command_journal",
				"portfolios_holdings",
				"portfolios_portfolios",
				"portfolios_positions",
				"portfolios_valuation_snapshots",
			]);
		});
	});

	test("portfolios_execution_mode enum exists", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const result = await pool.query<{ typname: string }>(
				`SELECT typname
				 FROM pg_type
				 WHERE typname = 'portfolios_execution_mode'`,
			);
			expect(result.rowCount).toBe(1);
		});
	});

	test("position key is unique per portfolio/instrument/side/book (G3-PF-S2-05)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO portfolios_portfolios (
				   id, organization_id, owner_user_id, capital_account_id, name,
				   base_currency, execution_mode, status, revision
				 ) VALUES (
				   'pf_prt_test_001', $1, $2, $3,
				   'Test Portfolio', 'USD', 'SIMULATED', 'ACTIVE', 1
				 )`,
				[
					PORTFOLIOS_TEST_ORG_ID,
					PORTFOLIOS_TEST_OWNER_USER_ID,
					PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
				],
			);
			await pool.query(
				`INSERT INTO portfolios_positions (
				   id, portfolio_id, organization_id, instrument_id,
				   position_side, book, quantity, revision
				 ) VALUES (
				   'pf_pos_test_001', 'pf_prt_test_001', $1, $2,
				   'LONG', 'TRADING', '10.0', 1
				 )`,
				[PORTFOLIOS_TEST_ORG_ID, PORTFOLIOS_TEST_INSTRUMENT_ID],
			);

			await expect(
				pool.query(
					`INSERT INTO portfolios_positions (
					   id, portfolio_id, organization_id, instrument_id,
					   position_side, book, quantity, revision
					 ) VALUES (
					   'pf_pos_test_002', 'pf_prt_test_001', $1, $2,
					   'LONG', 'TRADING', '5.0', 1
					 )`,
					[PORTFOLIOS_TEST_ORG_ID, PORTFOLIOS_TEST_INSTRUMENT_ID],
				),
			).rejects.toThrow(/duplicate key|unique constraint/i);
		});
	});

	test("holdings are unique per organization and fill id (G3-PF-S2-02)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO portfolios_portfolios (
				   id, organization_id, owner_user_id, capital_account_id, name,
				   base_currency, execution_mode, status, revision
				 ) VALUES (
				   'pf_prt_test_002', $1, $2, $3,
				   'Holdings Portfolio', 'USD', 'SIMULATED', 'ACTIVE', 1
				 )`,
				[
					PORTFOLIOS_TEST_ORG_ID,
					PORTFOLIOS_TEST_OWNER_USER_ID,
					PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
				],
			);
			await pool.query(
				`INSERT INTO portfolios_positions (
				   id, portfolio_id, organization_id, instrument_id,
				   position_side, book, quantity, revision
				 ) VALUES (
				   'pf_pos_test_003', 'pf_prt_test_002', $1, $2,
				   'LONG', 'TRADING', '0', 1
				 )`,
				[PORTFOLIOS_TEST_ORG_ID, PORTFOLIOS_TEST_INSTRUMENT_ID],
			);
			await pool.query(
				`INSERT INTO portfolios_holdings (
				   id, position_id, organization_id, fill_id, quantity, price, revision
				 ) VALUES (
				   'pf_hld_test_001', 'pf_pos_test_003', $1, 'fill_test_001',
				   '1.0', '100.0', 1
				 )`,
				[PORTFOLIOS_TEST_ORG_ID],
			);

			await expect(
				pool.query(
					`INSERT INTO portfolios_holdings (
					   id, position_id, organization_id, fill_id, quantity, price, revision
					 ) VALUES (
					   'pf_hld_test_002', 'pf_pos_test_003', $1, 'fill_test_001',
					   '2.0', '101.0', 1
					 )`,
					[PORTFOLIOS_TEST_ORG_ID],
				),
			).rejects.toThrow(/duplicate key|unique constraint/i);
		});
	});
});
