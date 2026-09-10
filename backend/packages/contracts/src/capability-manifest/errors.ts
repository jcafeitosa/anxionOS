import { z } from "zod";

export const CAPABILITY_MANIFEST_ERROR_CODES = [
	"CAP_MANIFEST_NOT_FOUND",
	"CAP_MANIFEST_CHANNEL_DENIED",
	"CAP_MANIFEST_MODE_DENIED",
	"CAP_MANIFEST_INPUT_INVALID",
	"CAP_MANIFEST_OUTPUT_INVALID",
	"CAP_MANIFEST_INPUT_SCHEMA_UNAVAILABLE",
	"CAP_MANIFEST_OUTPUT_SCHEMA_UNAVAILABLE",
	"CAP_MANIFEST_ERROR_SCHEMA_UNAVAILABLE",
	"CAP_MANIFEST_UNKNOWN_STATE",
] as const;

export const capabilityManifestErrorCodeSchema = z.enum(
	CAPABILITY_MANIFEST_ERROR_CODES,
);

export const CAPABILITY_MANIFEST_ERROR_STATUS_MAP = {
	CAP_MANIFEST_NOT_FOUND: 404,
	CAP_MANIFEST_CHANNEL_DENIED: 403,
	CAP_MANIFEST_MODE_DENIED: 403,
	CAP_MANIFEST_INPUT_INVALID: 400,
	CAP_MANIFEST_OUTPUT_INVALID: 500,
	CAP_MANIFEST_INPUT_SCHEMA_UNAVAILABLE: 501,
	CAP_MANIFEST_OUTPUT_SCHEMA_UNAVAILABLE: 501,
	CAP_MANIFEST_ERROR_SCHEMA_UNAVAILABLE: 501,
	CAP_MANIFEST_UNKNOWN_STATE: 409,
} as const;

export class CapabilityManifestError extends Error {
	code: CapabilityManifestErrorCode;
	statusCode: number;
	details?: unknown;

	constructor(
		code: CapabilityManifestErrorCode,
		message: string,
		details?: unknown,
	) {
		super(message);
		this.name = "CapabilityManifestError";
		this.code = code;
		this.statusCode = CAPABILITY_MANIFEST_ERROR_STATUS_MAP[code];
		this.details = details;
	}
}

/** UNKNOWN operational states must never be treated as success at capability boundaries. */
export function assertCapabilityOutcomeKnown(
	state: string,
	context?: { capabilityId?: string },
): void {
	if (state === "UNKNOWN" || state === "RECONCILING") {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_UNKNOWN_STATE",
			`capability outcome unresolved (${state})`,
			context,
		);
	}
}

export type CapabilityManifestErrorCode =
	(typeof CAPABILITY_MANIFEST_ERROR_CODES)[number];
