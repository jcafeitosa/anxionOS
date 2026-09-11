import { describe, expect, test } from "bun:test";
import { parseIdempotencyKey } from "../../apps/api/src/organizations/middleware/idempotency-key";

describe("organizations idempotency middleware", () => {
	test("accepts UUID Idempotency-Key header", () => {
		const headers = new Headers({
			"Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
		});
		expect(parseIdempotencyKey(headers)).toBe(
			"550e8400-e29b-41d4-a716-446655440000",
		);
	});

	test("rejects missing header", () => {
		expect(() => parseIdempotencyKey(new Headers())).toThrow(
			"Idempotency-Key header is required",
		);
	});

	test("rejects non-uuid header", () => {
		const headers = new Headers({ "Idempotency-Key": "not-a-uuid" });
		expect(() => parseIdempotencyKey(headers)).toThrow(
			"Idempotency-Key must be a valid institutional UUID",
		);
	});

	test("rejects nil UUID Idempotency-Key header", () => {
		const headers = new Headers({
			"Idempotency-Key": "00000000-0000-0000-0000-000000000000",
		});
		expect(() => parseIdempotencyKey(headers)).toThrow(
			"Idempotency-Key must be a valid institutional UUID",
		);
	});
});
