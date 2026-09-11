import { describe, expect, test } from "bun:test";
import { SIMULATION_ERROR_CODES } from "@anxionos/contracts/simulation";
import { SimulationCommandError } from "@anxionos/simulation";
import { mapSimulationError } from "../../apps/api/src/simulation/error-handler";
import { simulationRunIdParamSchema } from "../../apps/api/src/simulation/handlers/run-queries";
import { createSimulationPlugin } from "../../apps/api/src/simulation/plugin";

describe("simulation API boundary (ANX-159 P08-S4)", () => {
	test("mapSimulationError maps SIM_RUN_NOT_FOUND to 404", () => {
		const error = new SimulationCommandError(
			SIMULATION_ERROR_CODES.RUN_NOT_FOUND,
			"simulation run not found",
		);
		const mapped = mapSimulationError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: SIMULATION_ERROR_CODES.RUN_NOT_FOUND,
		});
	});

	test("mapSimulationError maps SIM_CROSS_TENANT to 403", () => {
		const error = new SimulationCommandError(
			SIMULATION_ERROR_CODES.CROSS_TENANT,
			"organization mismatch",
		);
		const mapped = mapSimulationError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: SIMULATION_ERROR_CODES.CROSS_TENANT,
		});
	});

	test("mapSimulationError maps SIM_SNAPSHOT_NOT_FOUND to 404", () => {
		const error = new SimulationCommandError(
			SIMULATION_ERROR_CODES.SNAPSHOT_NOT_FOUND,
			"snapshot not found",
		);
		const mapped = mapSimulationError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: SIMULATION_ERROR_CODES.SNAPSHOT_NOT_FOUND,
		});
	});

	test("path param schema rejects tampered simulation run ids", () => {
		expect(
			simulationRunIdParamSchema.safeParse({ simulationRunId: "bad" }).success,
		).toBe(false);
		expect(
			simulationRunIdParamSchema.safeParse({
				simulationRunId: "sim_run_11111111-1111-4111-8111-111111111111",
			}).success,
		).toBe(true);
	});
});

describe("simulation plugin routes (ANX-159 P08-S4)", () => {
	test("registers agency-scoped simulation run read routes", () => {
		const plugin = createSimulationPlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			runs: {} as never,
			snapshots: {} as never,
		});
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain("/v1/simulation/agencies/:agencyId/runs");
		expect(routes).toContain(
			"/v1/simulation/agencies/:agencyId/runs/:simulationRunId",
		);
		expect(routes).toContain(
			"/v1/simulation/agencies/:agencyId/runs/:simulationRunId/snapshot",
		);
	});
});
