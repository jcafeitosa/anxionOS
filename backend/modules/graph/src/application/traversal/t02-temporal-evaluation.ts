import type { T02Input, T02Output } from "@anxionos/contracts/graph";

export const GRAPH_T02_INCOMPLETE_REASONS = {
	INVALID_VALID_AT: "GRAPH_T02_INVALID_VALID_AT",
	INVALID_KNOWN_AT: "GRAPH_T02_INVALID_KNOWN_AT",
	KNOWN_AT_BEFORE_VALID_AT: "GRAPH_T02_KNOWN_AT_BEFORE_VALID_AT",
} as const;

export interface TemporalInterval {
	validFrom?: string | Date | null;
	validUntil?: string | Date | null;
	recordedFrom?: string | Date | null;
	recordedUntil?: string | Date | null;
}

function toInstant(value: string | Date | null | undefined): Date | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Bitemporal active(t, k): validFrom ≤ t < validUntil and recordedFrom ≤ k < recordedUntil.
 * Null upper bounds mean infinity, matching brain/notes/anxionos-graph-traversals-v1.md.
 */
export function isBitemporallyActive(
	interval: TemporalInterval,
	validAt: Date,
	knownAt: Date,
): boolean {
	const validFrom = toInstant(interval.validFrom) ?? new Date(0);
	const validUntil = toInstant(interval.validUntil);
	const recordedFrom = toInstant(interval.recordedFrom) ?? new Date(0);
	const recordedUntil = toInstant(interval.recordedUntil);

	if (validAt < validFrom) {
		return false;
	}
	if (validUntil !== null && validAt >= validUntil) {
		return false;
	}
	if (knownAt < recordedFrom) {
		return false;
	}
	if (recordedUntil !== null && knownAt >= recordedUntil) {
		return false;
	}
	return true;
}

export function grantPayloadToTemporalInterval(
	payload: Record<string, unknown>,
): TemporalInterval {
	return {
		validFrom:
			typeof payload.validFrom === "string" ? payload.validFrom : undefined,
		validUntil:
			payload.validUntil === null
				? null
				: typeof payload.validUntil === "string"
					? payload.validUntil
					: undefined,
		recordedFrom:
			typeof payload.recordedFrom === "string"
				? payload.recordedFrom
				: undefined,
		recordedUntil:
			payload.recordedUntil === null
				? null
				: typeof payload.recordedUntil === "string"
					? payload.recordedUntil
					: undefined,
	};
}

export interface T02TemporalEvaluationInput {
	params: T02Input;
	knownAt?: string;
}

export interface T02TemporalEvaluationResult extends T02Output {
	reasons?: string[];
}

export function evaluateT02Temporal(
	input: T02TemporalEvaluationInput,
): T02TemporalEvaluationResult {
	const validAt = toInstant(input.params.validAt);
	if (!validAt) {
		return {
			complete: false,
			reasons: [GRAPH_T02_INCOMPLETE_REASONS.INVALID_VALID_AT],
		};
	}

	const knownAt = input.knownAt ? toInstant(input.knownAt) : validAt;
	if (!knownAt) {
		return {
			complete: false,
			reasons: [GRAPH_T02_INCOMPLETE_REASONS.INVALID_KNOWN_AT],
		};
	}

	if (knownAt < validAt) {
		return {
			complete: false,
			reasons: [GRAPH_T02_INCOMPLETE_REASONS.KNOWN_AT_BEFORE_VALID_AT],
		};
	}

	return { complete: true };
}
