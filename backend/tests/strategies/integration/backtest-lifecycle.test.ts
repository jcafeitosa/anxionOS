import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	completeBacktest,
	createPgCommandJournalRepository,
	createSandboxBacktestRunnerAdapter,
	createStrategiesUnitOfWork,
	createStrategyVersion,
	registerStrategy,
	requestBacktest,
} from "@anxionos/strategies";
import {
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const DATASET_ID = "ds_momentum_v1";
const DATASET_REVISION = "rev-2026-09-10";
const SEED = "seed-deterministic-001";

async function seedDraftVersion(pool: ReturnType<typeof createStrategiesUnitOfWork> extends never ? never : import("pg").Pool) {
	const unitOfWork = createStrategiesUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const registered = await registerStrategy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			displayName: `Backtest ${randomUUID()}`,
			executionMode: "SIMULATED",
		},
	);
	const created = await createStrategyVersion(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			strategyId: registered.strategyId!,
			sourceHash: HASH_A,
			rulesHash: HASH_B,
			parametersHash: HASH_C,
			executionMode: "SIMULATED",
		},
	);
	return {
		unitOfWork,
		commandJournal,
		strategyId: registered.strategyId!,
		strategyVersionId: created.strategyVersionId!,
	};
}

describe("strategies backtest lifecycle (ANX-147 S3)", () => {
	test("requestBacktest is idempotent via command journal", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedDraftVersion(pool);
			const commandId = randomUUID();

			const first = await requestBacktest(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					datasetId: DATASET_ID,
					datasetRevision: DATASET_REVISION,
					seed: SEED,
				},
			);
			const second = await requestBacktest(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					datasetId: DATASET_ID,
					datasetRevision: DATASET_REVISION,
					seed: SEED,
				},
			);

			expect(second.idempotentReplay).toBe(true);
			expect(second.backtestRunId).toBe(first.backtestRunId);

			const runCount = await pool.query(
				"SELECT count(*)::int AS c FROM strategies_backtest_runs",
			);
			expect(runCount.rows[0]?.c).toBe(1);
		});
	});

	test("failed backtest run does not promote lifecycle from DRAFT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedDraftVersion(pool);
			const requested = await requestBacktest(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					datasetId: DATASET_ID,
					datasetRevision: DATASET_REVISION,
					seed: SEED,
				},
			);

			await completeBacktest(
				{
					unitOfWork,
					commandJournal,
					backtestRunner: createSandboxBacktestRunnerAdapter({
						forceFailure: true,
					}),
				},
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					backtestRunId: requested.backtestRunId!,
				},
			);

			const versionRow = await pool.query(
				`SELECT lifecycle_state FROM strategy_versions WHERE id = $1`,
				[strategyVersionId],
			);
			expect(versionRow.rows[0]?.lifecycle_state).toBe("DRAFT");

			const runRow = await pool.query(
				`SELECT status, result_ref, metrics_hash FROM strategies_backtest_runs WHERE id = $1`,
				[requested.backtestRunId],
			);
			expect(runRow.rows[0]?.status).toBe("FAILED");
			expect(runRow.rows[0]?.result_ref).toBeNull();
			expect(runRow.rows[0]?.metrics_hash).toBeNull();
		});
	});

	test("completed backtest promotes DRAFT to BACKTESTED and emits events", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedDraftVersion(pool);
			const requested = await requestBacktest(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					datasetId: DATASET_ID,
					datasetRevision: DATASET_REVISION,
					seed: SEED,
				},
			);

			const completed = await completeBacktest(
				{
					unitOfWork,
					commandJournal,
					backtestRunner: createSandboxBacktestRunnerAdapter(),
				},
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					backtestRunId: requested.backtestRunId!,
				},
			);

			expect(completed.backtestRunId).toBe(requested.backtestRunId);

			const versionRow = await pool.query(
				`SELECT lifecycle_state FROM strategy_versions WHERE id = $1`,
				[strategyVersionId],
			);
			expect(versionRow.rows[0]?.lifecycle_state).toBe("BACKTESTED");

			const runRow = await pool.query(
				`SELECT status, result_ref, metrics_hash FROM strategies_backtest_runs WHERE id = $1`,
				[requested.backtestRunId],
			);
			expect(runRow.rows[0]?.status).toBe("COMPLETED");
			expect(runRow.rows[0]?.result_ref).toMatch(/^sandbox:\/\/backtest\//);
			expect(runRow.rows[0]?.metrics_hash).toMatch(/^[a-f0-9]{64}$/i);

			const requestedEvents = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'strategies'
				   AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED],
			);
			expect(requestedEvents.rowCount).toBe(1);
			expect(requestedEvents.rows[0]?.payload).toMatchObject({
				backtestRequestId: requested.backtestRunId,
				datasetId: DATASET_ID,
				datasetRevision: DATASET_REVISION,
				seed: SEED,
			});

			const completedEvents = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'strategies'
				   AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.BACKTEST_COMPLETED],
			);
			expect(completedEvents.rowCount).toBe(1);
			expect(completedEvents.rows[0]?.payload).toMatchObject({
				backtestRequestId: requested.backtestRunId,
				status: "COMPLETED",
			});
		});
	});
});
