import { describe, expect, test } from "bun:test";
import {
	shouldRunPgIntegrationTests,
	withDecisionsPgHarness,
} from "../test-support";

describe("decisions schema migration (ANX-149 S1)", () => {
	test("core decisions tables exist after ensureDecisionsSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withDecisionsPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'decisions_records',
				     'decisions_proposals',
				     'decisions_trade_intents',
				     'decisions_command_journal',
				     'decisions_approvals',
				     'decisions_dispositions',
				     'decisions_submit_preconditions',
				     'decisions_evidence_manifests',
				     'decisions_evidence_manifest_entries'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"decisions_approvals",
				"decisions_command_journal",
				"decisions_dispositions",
				"decisions_evidence_manifest_entries",
				"decisions_evidence_manifests",
				"decisions_proposals",
				"decisions_records",
				"decisions_submit_preconditions",
				"decisions_trade_intents",
			]);
		});
	});

	test("submitted decision core fields are immutable (G3-DC-S2-02)", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withDecisionsPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO decisions_records (
				   id, organization_id, grant_id, expected_authority_epoch,
				   correlation_id, status, revision
				 ) VALUES (
				   'dc_dec_test', '00000000-0000-4000-8000-000000000002',
				   '00000000-0000-4000-8000-000000000003', 1,
				   '00000000-0000-4000-8000-000000000004', 'SUBMITTED', 2
				 )`,
			);

			await expect(
				pool.query(
					`UPDATE decisions_records
					 SET grant_id = '00000000-0000-4000-8000-000000000099'
					 WHERE id = 'dc_dec_test'`,
				),
			).rejects.toThrow(/DC_INTENT_IMMUTABLE/);
		});
	});

	test("trade intents are append-only after insert (G3-DC-S2-02)", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withDecisionsPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO decisions_records (
				   id, organization_id, grant_id, expected_authority_epoch,
				   correlation_id, status, revision
				 ) VALUES (
				   'dc_dec_intent', '00000000-0000-4000-8000-000000000002',
				   '00000000-0000-4000-8000-000000000003', 1,
				   '00000000-0000-4000-8000-000000000004', 'SUBMITTED', 2
				 )`,
			);
			await pool.query(
				`INSERT INTO decisions_trade_intents (
				   id, decision_id, organization_id, intent_hash, instrument_id,
				   side, quantity, price, execution_mode
				 ) VALUES (
				   'dc_int_test', 'dc_dec_intent', '00000000-0000-4000-8000-000000000002',
				   'hash-001', '00000000-0000-4000-8000-000000000010',
				   'BUY', '1.0', '100.0', 'SIMULATED'
				 )`,
			);

			await expect(
				pool.query(
					`UPDATE decisions_trade_intents
					 SET quantity = '2.0'
					 WHERE id = 'dc_int_test'`,
				),
			).rejects.toThrow(/DC_INTENT_IMMUTABLE/);
		});
	});
});
