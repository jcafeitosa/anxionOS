import { describe, expect, test } from "bun:test";
import {
	addDecimalAmounts,
	compareDecimalAmounts,
	subtractDecimalAmounts,
} from "./decimal-amount";

describe("decimal-amount", () => {
	test("add sums amounts", () => {
		expect(addDecimalAmounts("100.50", "25.25")).toBe("125.75");
	});

	test("subtract partial fill", () => {
		expect(subtractDecimalAmounts("100.00", "30.00")).toBe("70");
	});

	test("compare detects exceed", () => {
		expect(compareDecimalAmounts("50", "100")).toBe(-1);
		expect(() => subtractDecimalAmounts("10", "20")).toThrow();
	});
});
