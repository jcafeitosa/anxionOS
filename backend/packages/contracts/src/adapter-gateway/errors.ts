import { z } from "zod";
export const ADAPTER_GATEWAY_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "AGW_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "AGW_CROSS_TENANT",
	EXECUTION_MODE_NOT_SUPPORTED: "AGW_EXECUTION_MODE_NOT_SUPPORTED",
	ADAPTER_NOT_FOUND: "AGW_ADAPTER_NOT_FOUND",
	MANIFEST_MISMATCH: "AGW_MANIFEST_MISMATCH",
	CAPABILITY_MISSING: "AGW_CAPABILITY_MISSING",
	PERMIT_NOT_FOUND: "AGW_PERMIT_NOT_FOUND",
	PERMIT_HASH_MISMATCH: "AGW_PERMIT_HASH_MISMATCH",
	PERMIT_STALE: "AGW_PERMIT_STALE",
	PERMIT_EXPIRED: "AGW_PERMIT_EXPIRED",
	COMMAND_EXPIRED: "AGW_COMMAND_EXPIRED",
	TRANSPORT_FAILED: "AGW_TRANSPORT_FAILED",
	UNKNOWN_OUTCOME_STATE: "AGW_UNKNOWN_OUTCOME_STATE",
	CONFORMANCE_FAILED: "AGW_CONFORMANCE_FAILED",
	REGISTRY_CONFLICT: "AGW_REGISTRY_CONFLICT",
};
export const adapterGatewayErrorCodeSchema = z.enum(
	Object.values(ADAPTER_GATEWAY_ERROR_CODES) as [string, ...string[]],
);
export const ADAPTER_GATEWAY_ERROR_STATUS_MAP = {
	AGW_DUPLICATE_IDEMPOTENCY: 409,
	AGW_CROSS_TENANT: 403,
	AGW_EXECUTION_MODE_NOT_SUPPORTED: 403,
	AGW_ADAPTER_NOT_FOUND: 404,
	AGW_MANIFEST_MISMATCH: 409,
	AGW_CAPABILITY_MISSING: 422,
	AGW_PERMIT_NOT_FOUND: 404,
	AGW_PERMIT_HASH_MISMATCH: 403,
	AGW_PERMIT_STALE: 409,
	AGW_PERMIT_EXPIRED: 403,
	AGW_COMMAND_EXPIRED: 403,
	AGW_TRANSPORT_FAILED: 502,
	AGW_UNKNOWN_OUTCOME_STATE: 409,
	AGW_CONFORMANCE_FAILED: 422,
	AGW_REGISTRY_CONFLICT: 409,
};
export type AdapterGatewayErrorCode =
	(typeof ADAPTER_GATEWAY_ERROR_CODES)[keyof typeof ADAPTER_GATEWAY_ERROR_CODES];

export class AdapterGatewayError extends Error {
	code: AdapterGatewayErrorCode;
	statusCode: number;
	details?: unknown;

	constructor(
		code: AdapterGatewayErrorCode,
		message: string,
		details?: unknown,
	) {
		super(message);
		this.name = "AdapterGatewayError";
		this.code = code;
		this.statusCode =
			ADAPTER_GATEWAY_ERROR_STATUS_MAP[
				code as keyof typeof ADAPTER_GATEWAY_ERROR_STATUS_MAP
			];
		this.details = details;
	}
}

/** UNKNOWN adapter outcomes must never be treated as terminal success. */
export function assertAdapterEventOutcomeKnown(
	outcome: string,
	context?: { adapterId?: string; dispatchId?: string },
): void {
	if (outcome === "UNKNOWN") {
		throw new AdapterGatewayError(
			"AGW_UNKNOWN_OUTCOME_STATE",
			"adapter event outcome unresolved (UNKNOWN)",
			context,
		);
	}
}

export function resolveAdapterGatewayErrorStatus(
	code: AdapterGatewayErrorCode,
): number {
	return ADAPTER_GATEWAY_ERROR_STATUS_MAP[
		code as keyof typeof ADAPTER_GATEWAY_ERROR_STATUS_MAP
	];
}
