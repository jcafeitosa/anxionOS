import { describe, expect, test } from "bun:test";
import { assertBalancedLines } from "../../modules/accounting/src/application/balance-validation";
import { AccountingCommandError } from "../../modules/accounting/src/application/errors";

describe("assertBalancedLines", () => {
	test("accepts balanced multi-line entry", () => {
		expect(() =>
			assertBalancedLines([
				{
					accountCode: "trading.cash",
					debit: "100.00",
					credit: "0",
					asset: "USD",
					amount: "100.00",
				},
				{
					accountCode: "trading.clearing",
					debit: "0",
					credit: "100.00",
					asset: "USD",
					amount: "100.00",
				},
			]),
		).not.toThrow();
	});

	test("rejects unbalanced entry", () => {
		expect(() =>
			assertBalancedLines([
				{
					accountCode: "trading.cash",
					debit: "100.00",
					credit: "0",
					asset: "USD",
					amount: "100.00",
				},
				{
					accountCode: "trading.clearing",
					debit: "0",
					credit: "50.00",
					asset: "USD",
					amount: "50.00",
				},
			]),
		).toThrow(AccountingCommandError);
	});
});
