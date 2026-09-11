import { describe, expect, test } from "bun:test";
import {
	INSTITUTIONAL_UUID_PATTERN,
	institutionalUuidSchema,
	isInstitutionalUuid,
} from "@anxionos/contracts";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V4_TEST = "00000000-0000-4000-8000-000000000001";
const V1_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("institutional UUID alignment (ANX-405)", () => {
	test("institutionalUuidSchema rejects nil, v6+ and non-RFC variants", () => {
		for (const value of [NIL_UUID, V6_UUID, INVALID_VARIANT]) {
			expect(institutionalUuidSchema.safeParse(value).success).toBe(false);
			expect(isInstitutionalUuid(value)).toBe(false);
			expect(INSTITUTIONAL_UUID_PATTERN.test(value)).toBe(false);
		}
	});

	test("institutionalUuidSchema accepts RFC 4122 v1–v5 identifiers", () => {
		for (const value of [V4_TEST, V1_UUID]) {
			expect(institutionalUuidSchema.safeParse(value).success).toBe(true);
			expect(isInstitutionalUuid(value)).toBe(true);
		}
	});
});
