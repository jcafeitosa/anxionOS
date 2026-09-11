import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	createPgCommandJournalRepository,
	createStrategiesUnitOfWork,
	createStrategyVersion,
	publishStrategyVersion,
	registerStrategy,
} from "@anxionos/strategies";
import {
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

describe("strategies lifecycle commands (ANX-147 S2)", () => {
	test("registerStrategy emits strategies.strategy.registered.v1 atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const result = await registerStrategy(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: ORG_ID,
					displayName: "Momentum Alpha",
					executionMode: "SIMULATED",
				},
			);

			expect(result.strategyId).toMatch(/^st_str_/);

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'strategies'
				 ORDER BY occurred_at`,
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.event_type).toBe(
				STRATEGIES_EVENT_TYPES.STRATEGY_REGISTERED,
			);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				strategyId: result.strategyId,
				organizationId: ORG_ID,
				revision: 1,
			});

			const outboxRows = await pool.query(
				`SELECT event_id, status
				 FROM outbox
				 WHERE owner_domain = 'strategies'`,
			);
			expect(outboxRows.rowCount).toBe(1);
			expect(outboxRows.rows[0]?.status).toBe("pending");
		});
	});

	test("publishStrategyVersion sets publishedAt, stays DRAFT, emits version.published", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);

			const registered = await registerStrategy(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					displayName: "Publish Flow",
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

			const published = await publishStrategyVersion(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId: registered.strategyId!,
					strategyVersionId: created.strategyVersionId!,
				},
			);

			expect(published.strategyVersionId).toBe(created.strategyVersionId);

			const versionRow = await pool.query(
				`SELECT lifecycle_state, published_at
				 FROM strategy_versions
				 WHERE id = $1`,
				[created.strategyVersionId],
			);
			expect(versionRow.rows[0]?.lifecycle_state).toBe("DRAFT");
			expect(versionRow.rows[0]?.published_at).not.toBeNull();

			const publishedEvents = await pool.query(
				`SELECT event_type
				 FROM domain_journal
				 WHERE owner_domain = 'strategies'
				   AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.VERSION_PUBLISHED],
			);
			expect(publishedEvents.rowCount).toBe(1);
		});
	});

	test("publishStrategyVersion rejects non-DRAFT lifecycle (G3-ST-S2-01)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);

			const registered = await registerStrategy(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					displayName: "Invalid Lifecycle",
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

			await pool.query(
				`UPDATE strategy_versions
				 SET lifecycle_state = 'BACKTESTED'
				 WHERE id = $1`,
				[created.strategyVersionId],
			);

			await expect(
				publishStrategyVersion(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						strategyId: registered.strategyId!,
						strategyVersionId: created.strategyVersionId!,
					},
				),
			).rejects.toMatchObject({
				code: "ST_INVALID_LIFECYCLE_TRANSITION",
			});
		});
	});

	test("publishStrategyVersion rejects double publish with ST_VERSION_IMMUTABLE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);

			const registered = await registerStrategy(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					displayName: "Double Publish",
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

			await publishStrategyVersion(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId: registered.strategyId!,
					strategyVersionId: created.strategyVersionId!,
				},
			);

			await expect(
				publishStrategyVersion(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						strategyId: registered.strategyId!,
						strategyVersionId: created.strategyVersionId!,
					},
				),
			).rejects.toMatchObject({ code: "ST_VERSION_IMMUTABLE" });
		});
	});
});
