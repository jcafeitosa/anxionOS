import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	deploymentStatusSchema,
	STRATEGIES_EVENT_TYPES,
} from "@anxionos/contracts/strategies";
import {
	activateDeployment,
	createPgCommandJournalRepository,
	createStrategiesUnitOfWork,
	rollbackDeployment,
	StrategiesCommandError,
} from "@anxionos/strategies";
import {
	seedBacktestedStrategyVersion,
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ROLLBACK_BY = "00000000-0000-4000-8000-000000000099";
const BINDING_SNAPSHOT = {
	instrumentRefs: ["inst_btc_usd"],
	parametersHash: "c".repeat(64),
	rulesHash: "b".repeat(64),
};

describe("deploymentStatusSchema (ANX-171)", () => {
	test("includes CANARY lifecycle state", () => {
		expect(deploymentStatusSchema.parse("CANARY")).toBe("CANARY");
	});
});

describe("strategies rollback deployment (ANX-171 G1)", () => {
	test("activateDeployment with canary=true stores CANARY status", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedBacktestedStrategyVersion(pool);

			const activated = await activateDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					executionMode: "SIMULATED",
					bindingSnapshot: BINDING_SNAPSHOT,
					canary: true,
				},
			);

			const row = await pool.query(
				`SELECT status FROM strategies_deployments WHERE id = $1`,
				[activated.deploymentId],
			);
			expect(row.rows[0]?.status).toBe("CANARY");
		});
	});

	test("rollbackDeployment marks CANARY deployment ROLLED_BACK and emits event", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedBacktestedStrategyVersion(pool);
			const activated = await activateDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					strategyId,
					strategyVersionId,
					executionMode: "SIMULATED",
					bindingSnapshot: BINDING_SNAPSHOT,
					canary: true,
				},
			);

			const result = await rollbackDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					deploymentId: activated.deploymentId!,
					reason: "regression detected in canary metrics",
					rolledBackBy: ROLLBACK_BY,
				},
			);
			expect(result.revision).toBe(2);

			const row = await pool.query(
				`SELECT status, revision FROM strategies_deployments WHERE id = $1`,
				[activated.deploymentId],
			);
			expect(row.rows[0]?.status).toBe("ROLLED_BACK");
			expect(row.rows[0]?.revision).toBe(2);

			const events = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'strategies' AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.DEPLOYMENT_ROLLED_BACK],
			);
			expect(events.rowCount).toBe(1);
			expect(events.rows[0]?.payload).toMatchObject({
				deploymentId: activated.deploymentId,
				reason: "regression detected in canary metrics",
				rolledBackBy: ROLLBACK_BY,
			});
		});
	});

	test("rollbackDeployment rejects ROLLED_BACK deployment", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal, strategyId, strategyVersionId } =
				await seedBacktestedStrategyVersion(pool);
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
			await rollbackDeployment(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG_ID,
					deploymentId: activated.deploymentId!,
					reason: "first rollback",
					rolledBackBy: ROLLBACK_BY,
				},
			);

			await expect(
				rollbackDeployment(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: ORG_ID,
						deploymentId: activated.deploymentId!,
						reason: "duplicate rollback",
						rolledBackBy: ROLLBACK_BY,
					},
				),
			).rejects.toBeInstanceOf(StrategiesCommandError);
		});
	});
});
