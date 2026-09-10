import { describe, expect, test } from "bun:test";
import { AccountingCommandError } from "./errors";
import { assertBalancedLines } from "./balance-validation";

describe("assertBalancedLines (ANX-152)", () => {
	test("accepts balanced entry per single asset", () => {
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
		]);
	});

	test("accepts multi-currency entry when each asset balances independently", () => {
		assertBalancedLines([
			{
				accountCode: "trading.cash",
				debit: "50.00",
				credit: "0",
				asset: "USD",
				amount: "50.00",
			},
			{
				accountCode: "trading.clearing",
				debit: "0",
				credit: "50.00",
				asset: "USD",
				amount: "50.00",
			},
			{
				accountCode: "trading.cash",
				debit: "20.00",
				credit: "0",
				asset: "EUR",
				amount: "20.00",
			},
			{
				accountCode: "trading.clearing",
				debit: "0",
				credit: "20.00",
				asset: "EUR",
				amount: "20.00",
			},
		]);
	});

	test("rejects unbalanced entry for one asset in multi-currency posting", () => {
		expect(() =>
			assertBalancedLines([
				{
					accountCode: "trading.cash",
					debit: "50.00",
					credit: "0",
					asset: "USD",
					amount: "50.00",
				},
				{
					accountCode: "trading.clearing",
					debit: "0",
					credit: "40.00",
					asset: "USD",
					amount: "40.00",
				},
				{
					accountCode: "trading.cash",
					debit: "10.00",
					credit: "0",
					asset: "EUR",
					amount: "10.00",
				},
				{
					accountCode: "trading.clearing",
					debit: "0",
					credit: "10.00",
					asset: "EUR",
					amount: "10.00",
				},
			]),
		).toThrow(AccountingCommandError);
	});
});
