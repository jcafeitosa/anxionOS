import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	STRATEGIES_EVENT_TYPES,
	emitSignalCommandSchema,
} from "@anxionos/contracts/strategies";
import {
	activateDeployment,
	completeBacktest,
	createPgCommandJournalRepository,
	createSandboxBacktestRunnerAdapter,
	createStrategiesUnitOfWork,
	createStrategyVersion,
	emitSignal,
	registerStrategy,
	requestBacktest,
	StrategiesCommandError,
} from "@anxionos/strategies";
import {
	certifyStrategyVersionViaEvent,
	promoteVersionToEvaluated,
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
const PORTFOLIO_ID = "pf_paper_sandbox_001";
const BINDING_SNAPSHOT = {
	instrumentRefs: ["inst_btc_usd", "inst_eth_usd"],
	parametersHash: HASH_C,
	rulesHash: HASH_B,
};

async function seedBacktestedVersion(pool: import("pg").Pool) {
	const unitOfWork = createStrategiesUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const registered = await registerStrategy(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			displayName: `Deploy ${randomUUID()}`,
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
	const requested = await requestBacktest(
		{ unitOfWork, commandJournal },
		{
			commandId: randomUUID(),
			organizationId: ORG_ID,
			strategyId: registered.strategyId!,
			strategyVersionId: created.strategyVersionId!,
			datasetId: DATASET_ID,
			datasetRevision: DATASET_REVISION,
			seed: SEED,
		},
	);
	await completeBacktest(
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
	return {
		unitOfWork,
		commandJournal,
		strategyId: registered.strategyId!,
		strategyVersionId: created.strategyVersionId!,
	};
}

async function seedPaperReadyVersion(pool: import("pg").Pool) {
	const seeded = await seedBacktestedVersion(pool);
	await promoteVersionToEvaluated(pool, seeded.strategyVersionId);
	await certifyStrategyVersionViaEvent(pool, seeded);
	return seeded;
}

describe("strategies deployment + signals (ANX-147 S4)", () => {
	test("activateDeployment stores binding snapshot and emits deployment.activated.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedPaperReadyVersion(pool);

			const activated = await activateDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					executionMode: "PAPER",
					portfolioId: PORTFOLIO_ID,
					bindingSnapshot: BINDING_SNAPSHOT,
				},
			);

			expect(activated.deploymentId).toMatch(/^st_dep_/);

			const row = await pool.query(
				`SELECT execution_mode, portfolio_id, binding_snapshot, status
				 FROM strategies_deployments WHERE id = $1`,
				[activated.deploymentId],
			);
			expect(row.rows[0]?.execution_mode).toBe("PAPER");
			expect(row.rows[0]?.portfolio_id).toBe(PORTFOLIO_ID);
			expect(row.rows[0]?.binding_snapshot).toMatchObject(BINDING_SNAPSHOT);
			expect(row.rows[0]?.status).toBe("ACTIVE");

			const events = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'strategies' AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.DEPLOYMENT_ACTIVATED],
			);
			expect(events.rowCount).toBe(1);
			expect(events.rows[0]?.payload).toMatchObject({
				deploymentId: activated.deploymentId,
				executionMode: "PAPER",
				portfolioId: PORTFOLIO_ID,
			});
		});
	});

	test("binding snapshot is immutable after activation (G3-ST-S4-01)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedBacktestedVersion(pool);
			const activated = await activateDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					executionMode: "SIMULATED",
					bindingSnapshot: BINDING_SNAPSHOT,
				},
			);

			await expect(
				pool.query(
					`UPDATE strategies_deployments
					 SET binding_snapshot = $2::jsonb
					 WHERE id = $1`,
					[
						activated.deploymentId,
						JSON.stringify({
							...BINDING_SNAPSHOT,
							instrumentRefs: ["inst_mutated"],
						}),
					],
				),
			).rejects.toMatchObject({ message: expect.stringContaining("ST_BINDING_IMMUTABLE") });
		});
	});

	test("activateDeployment rejects REAL execution mode (G3-ST-03)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedBacktestedVersion(pool);

			await expect(
				activateDeployment(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						strategyId,
						strategyVersionId,
						executionMode: "REAL" as "PAPER",
						bindingSnapshot: BINDING_SNAPSHOT,
					},
				),
			).rejects.toThrow();
		});
	});

	test("emitSignal requires expiresAt and emits signal.emitted.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedPaperReadyVersion(pool);
			const activated = await activateDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					executionMode: "PAPER",
					bindingSnapshot: BINDING_SNAPSHOT,
				},
			);

			const expiresAt = new Date(Date.now() + 60_000).toISOString();
			const emitted = await emitSignal(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					deploymentId: activated.deploymentId,
					instrumentRefs: BINDING_SNAPSHOT.instrumentRefs,
					valueRef: "sandbox://signal/momentum-long",
					expiresAt,
				},
			);

			expect(emitted.signalId).toMatch(/^st_sig_/);

			const row = await pool.query(
				`SELECT instrument_refs, value_ref, expires_at, deployment_id
				 FROM strategies_signals WHERE id = $1`,
				[emitted.signalId],
			);
			expect(row.rows[0]?.instrument_refs).toEqual(BINDING_SNAPSHOT.instrumentRefs);
			expect(row.rows[0]?.value_ref).toBe("sandbox://signal/momentum-long");
			expect(row.rows[0]?.deployment_id).toBe(activated.deploymentId);

			const events = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'strategies' AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.SIGNAL_EMITTED],
			);
			expect(events.rowCount).toBe(1);
			expect(events.rows[0]?.payload).toMatchObject({
				signalId: emitted.signalId,
				expiresAt,
				valueRef: "sandbox://signal/momentum-long",
			});
		});
	});

	test("emitSignal without expiresAt fails schema validation (G3-ST-02)", () => {
		const parsed = emitSignalCommandSchema.safeParse({
			commandId: randomUUID(),
			organizationId: ORG_ID,
			strategyId: "st_str_00000000-0000-4000-8000-000000000001",
			instrumentRefs: ["inst_btc_usd"],
			valueRef: "sandbox://signal/missing-expiry",
		});
		expect(parsed.success).toBe(false);
	});

	test("emitSignal rejects past expiresAt with ST_SIGNAL_EXPIRED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId } =
				await seedBacktestedVersion(pool);

			await expect(
				emitSignal(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						strategyId,
						instrumentRefs: ["inst_btc_usd"],
						valueRef: "sandbox://signal/expired",
						expiresAt: new Date(Date.now() - 60_000).toISOString(),
					},
				),
			).rejects.toBeInstanceOf(StrategiesCommandError);

			await expect(
				emitSignal(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						strategyId,
						instrumentRefs: ["inst_btc_usd"],
						valueRef: "sandbox://signal/expired",
						expiresAt: new Date(Date.now() - 60_000).toISOString(),
					},
				),
			).rejects.toMatchObject({ code: "ST_SIGNAL_EXPIRED" });
		});
	});
});
