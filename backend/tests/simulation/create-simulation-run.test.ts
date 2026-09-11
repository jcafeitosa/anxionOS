import { describe, expect, test } from "bun:test";
import {
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
} from "@anxionos/contracts/simulation";
import {
	createSimulationRun,
	SimulationCommandError,
} from "@anxionos/simulation";
import {
	createInMemoryCommandJournalRepository,
	createRecordingSimulationUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const backtestRequestId = "st_btr_11111111-1111-4111-8111-111111111111";

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingSimulationUnitOfWork({
		commandJournal,
	});
	return {
		deps: { unitOfWork, commandJournal },
		published,
	};
}

describe("createSimulationRun (ANX-159 P08-S1)", () => {
	test("starts simulation run at revision 1 with sim_run_ id", async () => {
		const { deps } = createDeps();
		const result = await createSimulationRun(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			strategyId: "strategy-alpha",
			strategyVersionId: "st_ver_33333333-3333-4333-8333-333333333333",
			backtestRequestId,
			scenarioLabel: "baseline-deterministic",
		});
		expect(result.revision).toBe(1);
		expect(result.simulationRunId).toMatch(/^sim_run_/);
		expect(result.aggregateId).toBe(result.simulationRunId);
	});

	test("emits simulation.run.started.v1 with isolation flags", async () => {
		const { deps, published } = createDeps();
		await createSimulationRun(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			organizationId,
			scenarioLabel: "isolated-twin",
		});
		expect(published).toHaveLength(1);
		const [event] = published;
		expect(event.eventType).toBe(SIMULATION_EVENT_TYPES.RUN_STARTED);
		expect(event.ownerDomain).toBe(SIMULATION_OWNER_DOMAIN);
		expect(event.payload).toMatchObject({
			organizationId,
			status: "STARTED",
			executionMode: "SIMULATED",
			isolationFlags: {
				sandboxIsolated: true,
				promotionBlocked: true,
				syntheticCredentialsOnly: true,
				isolatedSubgraph: true,
			},
		});
	});

	test("does not emit certification or execution events (G3-SIM-03 partial)", async () => {
		const { deps, published } = createDeps();
		await createSimulationRun(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			organizationId,
		});
		for (const event of published) {
			expect(event.eventType).not.toMatch(/^evaluation\.certification\./);
			expect(event.eventType).not.toMatch(/^execution\.order\./);
		}
	});

	test("persists manifest metadata when manifest payload is provided", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const manifests = new Map<string, unknown>();
		const { unitOfWork, published: _published } =
			createRecordingSimulationUnitOfWork({
				commandJournal,
				manifests: {
					async save(record) {
						manifests.set(record.id, record);
						return record;
					},
					async findByOrganizationAndId(organizationId, id) {
						const record = manifests.get(id) as
							| { organizationId: string }
							| undefined;
						if (!record || record.organizationId !== organizationId) {
							return null;
						}
						return record as never;
					},
				},
			});
		await createSimulationRun(
			{ unitOfWork, commandJournal },
			{
				commandId: "55555555-5555-4555-8555-555555555555",
				organizationId,
				manifest: {
					datasetHash: "sha256:fixture-btc-usd-v1",
					seed: 42,
				},
			},
		);
		expect([...manifests.values()]).toHaveLength(1);
		expect([...manifests.values()][0]).toMatchObject({
			fidelityTier: "TIER_SIMULATED",
			datasetHash: "sha256:fixture-btc-usd-v1",
		});
	});

	test("idempotent replay returns same simulationRunId", async () => {
		const { deps } = createDeps();
		const commandId = "66666666-6666-4666-8666-666666666666";
		const first = await createSimulationRun(deps, {
			commandId,
			organizationId,
		});
		const second = await createSimulationRun(deps, {
			commandId,
			organizationId,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects cross-tenant idempotent replay", async () => {
		const { deps } = createDeps();
		const commandId = "77777777-7777-4777-8777-777777777777";
		await createSimulationRun(deps, {
			commandId,
			organizationId,
		});
		await expect(
			createSimulationRun(deps, {
				commandId,
				organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			}),
		).rejects.toMatchObject({
			code: "SIM_CROSS_TENANT",
		} satisfies Partial<SimulationCommandError>);
	});

	test("rejects duplicate backtestRequestId for same organization", async () => {
		const { deps } = createDeps();
		await createSimulationRun(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			organizationId,
			backtestRequestId,
		});
		await expect(
			createSimulationRun(deps, {
				commandId: "99999999-9999-4999-8999-999999999999",
				organizationId,
				backtestRequestId,
			}),
		).rejects.toMatchObject({
			code: "SIM_DUPLICATE_IDEMPOTENCY",
		} satisfies Partial<SimulationCommandError>);
	});
});
