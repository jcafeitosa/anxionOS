import { z } from "zod";
export const SIMULATION_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "SIM_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "SIM_CROSS_TENANT",
	GRANT_INVALID: "SIM_GRANT_INVALID",
	RUN_NOT_FOUND: "SIM_RUN_NOT_FOUND",
};
export const simulationErrorCodeSchema = z.enum(
	Object.values(SIMULATION_ERROR_CODES) as [string, ...string[]],
);
export const SIMULATION_ERROR_STATUS_MAP = {
	SIM_DUPLICATE_IDEMPOTENCY: 409,
	SIM_CROSS_TENANT: 403,
	SIM_GRANT_INVALID: 403,
	SIM_RUN_NOT_FOUND: 404,
};
export type SimulationErrorCode =
	(typeof SIMULATION_ERROR_CODES)[keyof typeof SIMULATION_ERROR_CODES];
export function resolveSimulationErrorStatus(
	code: SimulationErrorCode,
): number {
	return SIMULATION_ERROR_STATUS_MAP[
		code as keyof typeof SIMULATION_ERROR_STATUS_MAP
	];
}
