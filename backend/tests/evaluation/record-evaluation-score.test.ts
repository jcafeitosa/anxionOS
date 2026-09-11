import { describe, expect, test } from "bun:test";
import {
	EVALUATION_EVENT_TYPES,
	computeOutcomeNotionalScore,
} from "@anxionos/contracts/evaluation";
import {
	EvaluationCommandError,
	recordEvaluationScore,
} from "@anxionos/evaluation";
import {
	createInMemoryCommandJournalRepository,
	createRecordingEvaluationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
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

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published, evaluationRecords, evaluationScores } =
		createRecordingEvaluationUnitOfWork({ commandJournal });
	return {
		deps: { unitOfWork, commandJournal },
		published,
		evaluationRecords,
		evaluationScores,
	};
}

describe("recordEvaluationScore (ANX-160 S1)", () => {
	test("computes outcome notional score and emits score.computed event", async () => {
		const { deps, published, evaluationRecords, evaluationScores } =
			createDeps();
		const result = await recordEvaluationScore(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			outcomeSnapshotId,
			valueDate: "2026-09-10",
			linesSummary,
		});

		expect(result.aggregateId).toMatch(/^evl_rec_/);
		expect(result.evaluationRecordId).toMatch(/^evl_rec_/);
		expect(result.evaluationScoreId).toMatch(/^evl_scr_/);
		expect(result.revision).toBe(1);
		expect(result.idempotentReplay).toBeUndefined();

		const storedRecord = await evaluationRecords.findByOutcomeSnapshotId(
			outcomeSnapshotId,
		);
		expect(storedRecord?.organizationId).toBe(organizationId);

		const storedScore = await evaluationScores.findByEvaluationRecordId(
			result.evaluationRecordId!,
		);
		expect(storedScore?.scoreMetric).toBe("outcome_notional");
		expect(storedScore?.scoreValue).toBe(
			computeOutcomeNotionalScore(linesSummary),
		);

		const scoreEvent = published.find(
			(event) => event.eventType === EVALUATION_EVENT_TYPES.SCORE_COMPUTED,
		);
		expect(scoreEvent?.payload).toMatchObject({
			evaluationRecordId: result.evaluationRecordId,
			evaluationScoreId: result.evaluationScoreId,
			organizationId,
			outcomeSnapshotId,
			scoreMetric: "outcome_notional",
			scoreValue: computeOutcomeNotionalScore(linesSummary),
		});
	});

	test("idempotent replay by commandId", async () => {
		const { deps } = createDeps();
		const commandId = "33333333-3333-4333-8333-333333333333";
		const first = await recordEvaluationScore(deps, {
			commandId,
			organizationId,
			outcomeSnapshotId,
			valueDate: "2026-09-10",
			linesSummary,
		});
		const replay = await recordEvaluationScore(deps, {
			commandId,
			organizationId,
			outcomeSnapshotId: "perf_out_99999999-9999-4999-8999-999999999999",
			valueDate: "2026-09-11",
			linesSummary,
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(replay.evaluationRecordId).toBe(first.evaluationRecordId);
	});

	test("idempotent replay by outcomeSnapshotId", async () => {
		const { deps } = createDeps();
		const first = await recordEvaluationScore(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			organizationId,
			outcomeSnapshotId,
			valueDate: "2026-09-10",
			linesSummary,
		});
		const replay = await recordEvaluationScore(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			organizationId,
			outcomeSnapshotId,
			valueDate: "2026-09-11",
			linesSummary,
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(replay.aggregateId).toBe(first.aggregateId);
	});

	test("rejects cross-tenant command journal replay", async () => {
		const commandJournal = createInMemoryCommandJournalRepository([
			{
				commandId: "66666666-6666-4666-8666-666666666666",
				organizationId: otherOrganizationId,
				commandName: "recordEvaluationScore",
				outcomeSnapshotId,
				responseSnapshot: {
					aggregateId: "evl_rec_77777777-7777-4777-8777-777777777777",
					revision: 1,
					evaluationRecordId:
						"evl_rec_77777777-7777-4777-8777-777777777777",
					evaluationScoreId:
						"evl_scr_88888888-8888-4888-8888-888888888888",
				},
			},
		]);
		const { unitOfWork } = createRecordingEvaluationUnitOfWork({
			commandJournal,
		});

		await expect(
			recordEvaluationScore(
				{ unitOfWork, commandJournal },
				{
					commandId: "66666666-6666-4666-8666-666666666666",
					organizationId,
					outcomeSnapshotId,
					valueDate: "2026-09-10",
					linesSummary,
				},
			),
		).rejects.toMatchObject({
			code: "EVL_CROSS_TENANT",
		} satisfies Partial<EvaluationCommandError>);
	});

	test("rejects cross-tenant outcome snapshot journal replay", async () => {
		const commandJournal = createInMemoryCommandJournalRepository([
			{
				commandId: "77777777-7777-4777-8777-777777777777",
				organizationId: otherOrganizationId,
				commandName: "recordEvaluationScore",
				outcomeSnapshotId,
				responseSnapshot: {
					aggregateId: "evl_rec_88888888-8888-4888-8888-888888888888",
					revision: 1,
				},
			},
		]);
		const { unitOfWork } = createRecordingEvaluationUnitOfWork({
			commandJournal,
		});

		await expect(
			recordEvaluationScore(
				{ unitOfWork, commandJournal },
				{
					commandId: "99999999-9999-4999-8999-999999999999",
					organizationId,
					outcomeSnapshotId,
					valueDate: "2026-09-10",
					linesSummary,
				},
			),
		).rejects.toMatchObject({
			code: "EVL_CROSS_TENANT",
		} satisfies Partial<EvaluationCommandError>);
	});
});
