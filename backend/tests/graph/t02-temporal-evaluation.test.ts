import { describe, expect, test } from "bun:test";
import {
	evaluateT02Temporal,
	GRAPH_T02_INCOMPLETE_REASONS,
	grantPayloadToTemporalInterval,
	isBitemporallyActive,
} from "@anxionos/graph";

const t2 = "2026-09-07T14:32:00.000Z";
const t4 = "2026-09-07T15:00:00.000Z";
const tBefore = "2026-09-07T14:31:59.000Z";

describe("T02 temporal.asOf evaluation (ANX-301)", () => {
	test("returns complete for valid validAt with default knownAt", () => {
		const result = evaluateT02Temporal({ params: { validAt: t2 } });
		expect(result.complete).toBe(true);
		expect(result.reasons).toBeUndefined();
	});

	test("returns complete when knownAt is after validAt (bitemporal correction window)", () => {
		const result = evaluateT02Temporal({
			params: { validAt: t2 },
			knownAt: t4,
		});
		expect(result.complete).toBe(true);
	});

	test("returns incomplete when knownAt precedes validAt", () => {
		const result = evaluateT02Temporal({
			params: { validAt: t2 },
			knownAt: tBefore,
		});
		expect(result.complete).toBe(false);
		expect(result.reasons).toContain(
			GRAPH_T02_INCOMPLETE_REASONS.KNOWN_AT_BEFORE_VALID_AT,
		);
	});

	test("returns incomplete for invalid validAt", () => {
		const result = evaluateT02Temporal({
			params: { validAt: "not-a-datetime" },
		});
		expect(result.complete).toBe(false);
		expect(result.reasons).toContain(
			GRAPH_T02_INCOMPLETE_REASONS.INVALID_VALID_AT,
		);
	});

	test("isBitemporallyActive matches F0 GrantX window at t2", () => {
		const grantX = grantPayloadToTemporalInterval({
			validFrom: "2026-09-01T00:00:00.000Z",
			validUntil: "2026-09-07T14:33:00.000Z",
			recordedFrom: "2026-09-01T00:00:00.000Z",
			recordedUntil: null,
		});
		const validAt = new Date(t2);
		expect(isBitemporallyActive(grantX, validAt, validAt)).toBe(true);
	});

	test("isBitemporallyActive rejects grant after validUntil correction at knownAt t4", () => {
		const correctedGrant = grantPayloadToTemporalInterval({
			validFrom: "2026-09-01T00:00:00.000Z",
			validUntil: tBefore,
			recordedFrom: "2026-09-01T00:00:00.000Z",
			recordedUntil: null,
		});
		const validAt = new Date(t2);
		const knownAt = new Date(t4);
		expect(isBitemporallyActive(correctedGrant, validAt, knownAt)).toBe(false);
	});
});
