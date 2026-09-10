import { describe, expect, test } from "bun:test";
import { calculateCommissionAmount, sumDecimalAmounts } from "./commission";

describe("commission helpers", () => {
	test("calculateCommissionAmount applies rate to invoice total", () => {
		expect(calculateCommissionAmount("1000", "10")).toBe("100");
		expect(calculateCommissionAmount("250", "12.5")).toBe("31.25");
	});

	test("sumDecimalAmounts aggregates decimal strings", () => {
		expect(sumDecimalAmounts(["10", "20.5", "0.5"])).toBe("31");
	});
});
