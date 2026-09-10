import { z } from "zod";
export const OPERATIONS_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "OPS_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "OPS_CROSS_TENANT",
	GRANT_INVALID: "OPS_GRANT_INVALID",
	INCIDENT_NOT_FOUND: "OPS_INCIDENT_NOT_FOUND",
	HEALTH_CHECK_NOT_FOUND: "OPS_HEALTH_CHECK_NOT_FOUND",
};
export const operationsErrorCodeSchema = z.enum(
	Object.values(OPERATIONS_ERROR_CODES) as [string, ...string[]],
);
export const OPERATIONS_ERROR_STATUS_MAP = {
	OPS_DUPLICATE_IDEMPOTENCY: 409,
	OPS_CROSS_TENANT: 403,
	OPS_GRANT_INVALID: 403,
	OPS_INCIDENT_NOT_FOUND: 404,
	OPS_HEALTH_CHECK_NOT_FOUND: 404,
};
export type OperationsErrorCode =
	(typeof OPERATIONS_ERROR_CODES)[keyof typeof OPERATIONS_ERROR_CODES];
export function resolveOperationsErrorStatus(
	code: OperationsErrorCode,
): number {
	return OPERATIONS_ERROR_STATUS_MAP[
		code as keyof typeof OPERATIONS_ERROR_STATUS_MAP
	];
}
