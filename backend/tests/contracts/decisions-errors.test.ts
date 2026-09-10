import { describe, expect, test } from "bun:test";
import {
	DECISIONS_ERROR_CODES,
	DECISIONS_ERROR_STATUS_MAP,
	resolveDecisionsErrorStatus,
} from "@anxionos/contracts/decisions";

const GRANT_BRIDGE_CODES = [
	"DC_AUTHORITY_GRANT_ID_REQUIRED",
	"DC_GRANT_ID_MISMATCH",
	"DC_GRANT_NOT_ACTIVE",
	"DC_AUTHORITY_EPOCH_INSUFFICIENT",
	"DC_GRANT_EPOCH_FUTURE",
] as const;

describe("decisions error codes (ANX-299)", () => {
	test("grant bridge codes are registered in DECISIONS_ERROR_CODES", () => {
		for (const code of GRANT_BRIDGE_CODES) {
			expect(Object.values(DECISIONS_ERROR_CODES)).toContain(code);
		}
	});

	test("resolveDecisionsErrorStatus maps grant bridge codes", () => {
		for (const code of GRANT_BRIDGE_CODES) {
			const expected = DECISIONS_ERROR_STATUS_MAP[code];
			expect(expected).toBeDefined();
			expect(resolveDecisionsErrorStatus(code)).toBe(expected);
		}
	});
});
