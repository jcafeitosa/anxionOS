import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SANDBOX_ISOLATION_FLAGS,
	mapBacktestRequestedToSimulationInput,
	SimulationContractError,
} from "@anxionos/contracts/simulation";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const backtestRequestId = "st_btr_11111111-1111-4111-8111-111111111111";
const strategyId = "st_str_22222222-2222-4222-8222-222222222222";
const strategyVersionId = "st_ver_33333333-3333-4333-8333-333333333333";
const commandId = "44444444-4444-4444-8444-444444444444";

describe("mapBacktestRequestedToSimulationInput (ANX-159 P08-S2)", () => {
	test("maps strategies.backtest.requested.v1 payload to createSimulationRun input", () => {
		const mapped = mapBacktestRequestedToSimulationInput(
			{
				backtestRequestId,
				organizationId,
				strategyId,
				strategyVersionId,
				datasetId: "ds_momentum_v1",
				datasetRevision: "rev-2026-09-10",
				seed: "seed-deterministic-001",
				executionMode: "SIMULATED",
				requestedAt: "2026-09-10T12:00:00.000Z",
			},
			commandId,
		);
		expect(mapped).toEqual({
			commandId,
			organizationId,
			strategyId,
			strategyVersionId,
			backtestRequestId,
			executionMode: "SIMULATED",
			isolationFlags: DEFAULT_SANDBOX_ISOLATION_FLAGS,
			manifest: {
				datasetId: "ds_momentum_v1",
				datasetRevision: "rev-2026-09-10",
				seed: "seed-deterministic-001",
				requestedAt: "2026-09-10T12:00:00.000Z",
			},
		});
	});

	test("rejects PAPER executionMode with SIM_EXECUTION_MODE_NOT_SUPPORTED", () => {
		expect(() =>
			mapBacktestRequestedToSimulationInput(
				{
					backtestRequestId,
					organizationId,
					strategyId,
					strategyVersionId,
					datasetId: "ds_momentum_v1",
					datasetRevision: "rev-2026-09-10",
					seed: "seed-deterministic-001",
					executionMode: "PAPER",
					requestedAt: "2026-09-10T12:00:00.000Z",
				},
				commandId,
			),
		).toThrow(SimulationContractError);
		try {
			mapBacktestRequestedToSimulationInput(
				{
					backtestRequestId,
					organizationId,
					strategyId,
					strategyVersionId,
					datasetId: "ds_momentum_v1",
					datasetRevision: "rev-2026-09-10",
					seed: "seed-deterministic-001",
					executionMode: "PAPER",
					requestedAt: "2026-09-10T12:00:00.000Z",
				},
				commandId,
			);
		} catch (error) {
			expect(error).toBeInstanceOf(SimulationContractError);
			expect((error as SimulationContractError).message).toBe(
				"SIM_EXECUTION_MODE_NOT_SUPPORTED",
			);
		}
	});
});
