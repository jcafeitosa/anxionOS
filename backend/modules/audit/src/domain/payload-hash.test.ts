import { describe, expect, test } from "bun:test";
import { computePayloadHash } from "./payload-hash";

describe("computePayloadHash", () => {
	test("is stable for key order", () => {
		const a = computePayloadHash({ b: 1, a: 2 });
		const b = computePayloadHash({ a: 2, b: 1 });
		expect(a).toBe(b);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});
});
