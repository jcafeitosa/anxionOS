import { describe, expect, test } from "bun:test";
import {
	EVALUATION_EVENT_TYPES,
	computeOutcomeNotionalScore,
} from "@anxionos/contracts/evaluation";
import { createOutcomeRecordedConsumer } from "@anxionos/evaluation";
import {
	createInMemoryCommandJournalRepository,
	createRecordingEvaluationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const outcomeSnapshotId = "perf_out_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const linesSummary = [
	{
		accountCode: "CAPITAL",
		debit: "50.00000000",
		credit: "0",
		asset: "USD",
		amount: "50.00000000",
	},
	{
		accountCode: "PNL",
		debit: "0",
		credit: "50.00000000",
		asset: "USD",
		amount: "50.00000000",
	},
];

describe("outcome recorded consumer (ANX-160 S1)", () => {
	test("maps performance outcome bridge to recordEvaluationScore", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork, published } = createRecordingEvaluationUnitOfWork({
			commandJournal,
		});
		const consumer = createOutcomeRecordedConsumer({
			unitOfWork,
			commandJournal,
		});

		const result = await consumer.handle({
			outcomeSnapshotId,
			organizationId,
			valueDate: "2026-09-10",
			linesSummary,
		});

		expect(result.evaluationRecordId).toMatch(/^evl_rec_/);
		expect(result.evaluationScoreId).toMatch(/^evl_scr_/);

		const scoreEvent = published.find(
			(event) => event.eventType === EVALUATION_EVENT_TYPES.SCORE_COMPUTED,
		);
		expect(scoreEvent?.payload).toMatchObject({
			outcomeSnapshotId,
			organizationId,
			scoreValue: computeOutcomeNotionalScore(linesSummary),
		});
	});

	test("consumer is idempotent for duplicate outcome events", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingEvaluationUnitOfWork({
			commandJournal,
		});
		const consumer = createOutcomeRecordedConsumer({
			unitOfWork,
			commandJournal,
		});
		const bridge = {
			outcomeSnapshotId,
			organizationId,
			valueDate: "2026-09-10",
			linesSummary,
		};

		const first = await consumer.handle(bridge);
		const second = await consumer.handle(bridge);

		expect(second.idempotentReplay).toBe(true);
		expect(second.aggregateId).toBe(first.aggregateId);
	});
});
