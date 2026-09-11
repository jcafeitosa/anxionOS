import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	computeOutcomeNotionalScore,
	EVALUATION_EVENT_TYPES,
} from "@anxionos/contracts/evaluation";
import { recordEvaluationScore } from "@anxionos/evaluation";
import {
	EVALUATION_TEST_ORG_ID,
	shouldRunPgIntegrationTests,
	withEvaluationPgHarness,
} from "../test-support";

const outcomeSnapshotId = "perf_out_11111111-1111-4111-8111-111111111111";

const linesSummary = [
	{
		accountCode: "CAPITAL",
		debit: "100.00000000",
		credit: "0",
		asset: "USD",
		amount: "100.00000000",
	},
	{
		accountCode: "PNL",
		debit: "0",
		credit: "100.00000000",
		asset: "USD",
		amount: "100.00000000",
	},
];

describe("recordEvaluationScore PG integration (ANX-160 S2)", () => {
	// C2: evaluation_scores_record_uidx enforces one score row per evaluation_record_id.
	test("G3-EVL-01: persists record, score, journal and outbox atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const commandId = randomUUID();
				const result = await recordEvaluationScore(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: EVALUATION_TEST_ORG_ID,
						outcomeSnapshotId,
						valueDate: "2026-09-10",
						linesSummary,
					},
				);

				expect(result.evaluationRecordId).toMatch(/^evl_rec_/);
				expect(result.evaluationScoreId).toMatch(/^evl_scr_/);

				const record = await pool.query(
					`SELECT organization_id, outcome_snapshot_id
				 FROM evaluation_records
				 WHERE id = $1`,
					[result.evaluationRecordId],
				);
				expect(record.rowCount).toBe(1);
				expect(record.rows[0]?.organization_id).toBe(EVALUATION_TEST_ORG_ID);
				expect(record.rows[0]?.outcome_snapshot_id).toBe(outcomeSnapshotId);

				const score = await pool.query(
					`SELECT score_metric, score_value
				 FROM evaluation_scores
				 WHERE evaluation_record_id = $1`,
					[result.evaluationRecordId],
				);
				expect(score.rowCount).toBe(1);
				expect(score.rows[0]?.score_metric).toBe("outcome_notional");
				expect(score.rows[0]?.score_value).toBe(
					computeOutcomeNotionalScore(linesSummary),
				);

				const journal = await pool.query(
					`SELECT command_name, outcome_snapshot_id
				 FROM evaluation_command_journal
				 WHERE command_id = $1`,
					[commandId],
				);
				expect(journal.rowCount).toBe(1);
				expect(journal.rows[0]?.command_name).toBe("recordEvaluationScore");

				const domainJournal = await pool.query(
					`SELECT event_type
				 FROM domain_journal
				 WHERE event_type = $1`,
					[EVALUATION_EVENT_TYPES.SCORE_COMPUTED],
				);
				expect(domainJournal.rowCount).toBe(1);

				const outbox = await pool.query(
					`SELECT status
				 FROM outbox
				 WHERE event_type = $1`,
					[EVALUATION_EVENT_TYPES.SCORE_COMPUTED],
				);
				expect(outbox.rowCount).toBe(1);
				expect(outbox.rows[0]?.status).toBe("pending");
			},
		);
	});

	test("G3-EVL-01 replay: duplicate commandId does not duplicate rows", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const commandId = randomUUID();
				const first = await recordEvaluationScore(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: EVALUATION_TEST_ORG_ID,
						outcomeSnapshotId,
						valueDate: "2026-09-10",
						linesSummary,
					},
				);
				const second = await recordEvaluationScore(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: EVALUATION_TEST_ORG_ID,
						outcomeSnapshotId: "perf_out_99999999-9999-4999-8999-999999999999",
						valueDate: "2026-09-11",
						linesSummary,
					},
				);

				expect(second.idempotentReplay).toBe(true);
				expect(second.aggregateId).toBe(first.aggregateId);

				const records = await pool.query(
					`SELECT COUNT(*)::int AS count FROM evaluation_records`,
				);
				expect(records.rows[0]?.count).toBe(1);

				const scores = await pool.query(
					`SELECT COUNT(*)::int AS count FROM evaluation_scores`,
				);
				expect(scores.rows[0]?.count).toBe(1);
			},
		);
	});
});
